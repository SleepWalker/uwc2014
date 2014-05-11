define(['jquery',
		'backbone',
		'underscore',
		'text!tpl/mainUI.tpl',
		'text!tpl/loader.tpl',
		'jquery-ui',
		'mousewheel',
		'perfect-scrollbar',
		"bootstrap"], 
function($, Backbone, _, guiTpl, loaderTpl) {
	var Loader = Backbone.View.extend({
		el: $('body'),

		initialize: function() {
			this.render();
		},

		show: function()
		{
			this.$el.fadeIn();

			return this;
		},

		hide: function() 
		{
			this.$el.fadeOut();

			return this;
		},

		render: function() {
			var $loader = $(loaderTpl).hide();

			this.setElement($loader[0]);
			$('body').append(this.$el);

			return this;
		}
	});

	var MenuItem = Backbone.View.extend({
		tagName: 'li',

		click: function(e) {e.preventDefault()},

		events: {
			'click': 'click'
		},

		initialize: function(options)
		{
			this.click = options.click;

			$(options.menu).append(this.render(options.label).$el);
		},

		render: function(label)
		{
			this.$el.append($('<a role="menuitem" href="">'+label+'</a>'));

			return this;
		}
	});

	var GUI = Backbone.View.extend({
		id: 'gui',
		className: 'gui gui-no-image',

		loader: new Loader,

		events: {
			'click .reset': 'resetFilters',
			'click .choose-image': 'openFileDialog',
			'change #fileField': 'chooseImage'
		},

		initialize: function(options)
		{
			this.listenToOnce(this.app, 'init', this.initGUI);
		},

		initGUI: function()
		{
			var that = this;

			this.app.loadCss('image_processor/css/style.css', function() {
				$('#pageLoader').remove();
			});
			// так как perfect-scrollbar - AMD модуль, для него нельзя погрузить css через shim, потому сделаем это тут
			this.app.loadCss('image_processor/vendor/perfect-scrollbar/min/perfect-scrollbar-0.4.10.min.css');

			this.render();
			$('body')
				.prepend(this.$el)
				.on('dragover', function() {that.$el.addClass('gui-dnd'); return false;})
				.on('dragleave', function() {that.$el.removeClass('gui-dnd'); return false;})
				;
			this.$el.on('dragover', function() {that.$el.addClass('hover');})
				.on('dragleave', function() {that.$el.removeClass('hover');})
				.on('drop', function(e) {
					e.preventDefault();

					that.$el.removeClass('hover').removeClass('gui-dnd');
					that.chooseImage(e.originalEvent);
				});

			$('#filter-stack')
				.sortable({
					handle: '.panel-heading',
					placeholder: "well well-sm",
					forcePlaceholderSize: true,
					// обновление oid моделей
					update: function()
					{
						$('#filter-stack > div.panel').each(function(oid) {
							var cid = $(this).find('input[name="cid"]').val();
							that.app.filterStack.get(cid).set('oid', oid);
						});

						that.app.filterStack.sort();
					}
				})
				.perfectScrollbar({
					suppressScrollX: true,
					includePadding: true
				})
			;

			this.$('.save').on('click', $.proxy(this.app.viewport.save, this.app.viewport));
		},

		openFileDialog: function() 
		{
			this.$el.find('#fileField').click();
		},

		chooseImage: function(e) 
		{
			var that = this;
			var fileReader = new FileReader(),
				file = (e.dataTransfer || e.target).files[0];
			fileReader.onload = function(e)
			{
				var data = e.target.result;
				that.app.viewport.drawImage(data);
				that.$el.removeClass('gui-no-image');
			};

			var mime = file.type;
			if(mime != 'image/png' && mime != 'image/gif' && mime != 'image/jpg' && mime != 'image/jpeg')
			{
				alert('Unsupported file format');
				return;
			}

			fileReader.readAsDataURL(file);
		},

		/**
		 * Добавляет фильтр в меню выбора фильтров
		 * 
		 * @param string filterName имя фильтра для GUI
		 * @param function asyncViewCallback функция для доступа к асинхронно подгружаемому классу вьюхи
		 */
		addFilter: function(filterName, filterClass)
		{
			var that = this;
			var filter = new MenuItem({
				click: function(e) 
				{
					e.preventDefault();

					that.app.filterStack.add({name: filterName, class: filterClass});
				},
				menu: this.$('.filter-menu'),
				label: filterName,
			});

			return this;
		},

		resetFilters: function()
		{
			this.$el.removeClass('gui-with-filters');
			this.app.filterStack.destroyAll();
		},

		addFilterControls: function($el)
		{
			this.$('#filter-stack').append($el).perfectScrollbar('update');

			this.$el.addClass('gui-with-filters');
		},

		loading: function(isLoading)
		{
			isLoading ? this.loader.show() : this.loader.hide();

			return this;
		},

		render: function() 
		{
			this.$el.html(guiTpl);
			return this;
		}
	});

	return GUI;
});