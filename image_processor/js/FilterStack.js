define(['jquery',
		'backbone',
		'hbs!tpl/filterContainer'], 
function($, Backbone, filterContainerTpl) {
	var Filter = Backbone.Model.extend({
			view: null,

			defaults: {
				oid: undefined
			},

			initialize: function(attrs)
			{
				this.set(attrs);

				if(this.get('oid') == undefined)
					this.set('oid', this.collection.length);
			},

			/**
			 * Запускает фильтр
			 */
			run: function()
			{
				this.collection.runFilter(this);

				return this;
			},

			/**
			 * Обрывает работу фильтра, если он в работе
			 */
			abort: function()
			{
				this.collection.abortFilter(this.get('class'));

				return this;
			}
		}),

		FilterContainer = Backbone.View.extend({
			controlsView: null,

			template: filterContainerTpl,

			events: {
				'click .close': 'destroy'
			},

			initialize: function(options)
			{
				this.filterName = options.filterName;
			},

			setControls: function(View)
			{
				this.app.trigger('beforeSetControls', View);
				this.controlsView = View;
				this.listenTo(View.model, 'destroy', this.destroy);

				this.$('.panel-body').empty().append(View.render().$el);

				// подключаем скрипты полей фильтра
				View.renderScripts();
				this.app.trigger('afterSetControls');
			},

			destroy: function(e)
			{
				var model = e.cid ? e : this.controlsView.model;
				if(model.cid == this.app.filterStack._modelInWork)
					model.abort();

				if(!e.cid) this.controlsView.model.destroy();

				this.controlsView.remove();
				this.remove();
			},

			render: function()
			{
				var that = this;

				this.setElement($(this.template({
					filterName: this.filterName,
				}))[0]);

				return this;
			}
		}),

		FilterStack = Backbone.Collection.extend({
			filterWorkers: {}, // воркеры для фильтров
			filterViews: {}, // вьюхи для фильтров
			_modelInWork: false, // cid модели, для которой вызван воркер

			model: Filter,

			initialize: function()
			{
				this.listenTo(this, 'add', this.initFilter);
				this.listenTo(this, 'destroy', this.updateImage);
				this.listenTo(this, 'sort', this.reapplyAllFilters);
				this.listenTo(this.app, 'newImage', this.destroyAll);
			},

			comparator: function(model) 
			{
				return model.get('oid');
			},

			/**
			 * Добавляет в приложения элементы управления новым фильтром
			 */
			initFilter: function(model)
			{
				var that = this;

				var container = new FilterContainer({
					filterName: model.get('name')
				});

				this.app.gui.addFilterControls(container.render().$el);

				this.getFilterView(model.get('class'), function(Controls) {
					model.view = Controls;
					container.setControls(new Controls({
						model: model
					}));
				});

			},

			updateImage: function(model, collection, options)
			{
				if(this.length == 0) 
					return this.destroyAll();

				var index = 0;
				if(model && this.length > 1)
					index = this.at(options.index) ? options.index : options.index-1;

				index = index > 0 ? index : 0;
				
				this.at(index).run();
			},

			destroyAll: function()
			{
				var model;

				while (model = this.last()) {
					model.destroy();
				}

				if(this._modelInWork)
				{
					this.getModelInWork().abort();
					this._modelInWork = false;
				}
				this.app.gui.loading(false);
				this.app.viewport.reset();
			},

			reapplyAllFilters: function()
			{
				if(this._modelInWork)
					this.getModelInWork().abort();

				this.updateImage();
			},

			add: function(models, options) 
			{
				// переопределяем метод, так как нам категорически не нужна авто-сортировка
				options = options ? options : {};
				options.sort = false;
				return Backbone.Collection.prototype.add.call(this, models, options);
			},

			getFilter: function(className)
			{
				if(this.filterWorkers[className])
					return this.filterWorkers[className];

				var scriptUrl = require.toUrl('filters/'+className+'.js');
				var worker = new Worker(scriptUrl);
				var that = this;

				worker.addEventListener('message', function(e) 
				{
					if(!e.data.action) // сообщения для дебага
					{
						console.log(e.data)
						return;
					}

					switch(e.data.action)
					{
						case 'filter':
							var model = that.getModelInWork();
							that._modelInWork = false;
							that.app.viewport.drawImage(e.data.imageData);
							model.set('imageData', e.data.imageData);

							that.app.trigger('afterRunFilter');

							// вызываем все фильтры, примененные после текущего
							var index = that.indexOf(model);
							if(index != that.length-1)
							{
								that.at(index+1).run();
								return;
							}
						break;
					}

					that.app.gui.loading(false);
				}, false);

				worker.addEventListener('error', function(e) {
					alert('Error using filter '+className+'\n'+e.message);
				}, false);

				this.filterWorkers[className] = worker;

				return worker;
			},

			/**
			 * Останавливает воркер и удаляет его для реинициализации
			 */
			abortFilter: function(className)
			{
				if(this.filterWorkers[className])
					this.filterWorkers[className].terminate();

				this.filterWorkers[className] = undefined;
				this._modelInWork = false;

				return this;
			},

			getFilterView: function(className, func)
			{
				var that = this;
				if(className in this.filterViews)
					return func.call(this, this.filterViews[className]);

				require(['filters/'+className], function(View) {
					that.filterViews[className] = View;
					func.call(that, View, className);
				});
			},

			runFilter: function(model)
			{
				if(this._modelInWork)
				{
					if(this.indexOf(model) <= this.indexOf(this.getModelInWork()))
						// изменен фильтр, находящийся раньше в цепочке фильтров, переключаемся на него
						this.getModelInWork().abort();
					else
						return;
				}

				this.app.trigger('beforeRunFilter', model);

				var that = this,
					options = $.extend({
							clearCanvas: this.app.viewport.newImageData()
						}, model.attributes),
					filter = this.getFilter(model.get('class')),
					curIndex = this.indexOf(model),
					// если этот фильтр не первый в очереди, то он должен использовать изображение предыдущего фильтра
					imageData = curIndex == 0 ? that.app.viewport.initImageData : this.at(curIndex-1).get('imageData');

				filter.postMessage({
					action: 'filter',
					imageData: imageData,
					options: options,
				});

				this.app.gui.loading(true);
				this._modelInWork = model.cid;
			},

			getModelInWork: function()
			{
				return this._modelInWork ? this.get(this._modelInWork) : this._modelInWork;
			}
		});
	
	return FilterStack;
});