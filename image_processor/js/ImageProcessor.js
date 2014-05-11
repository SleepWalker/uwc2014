// TODO: фильтровать transparent 
// TODO: описание каждого файла в шапке
// TODO: обвертка для удобного обращения rgba (мб по xy)
// TODO: причесать ЦСС

// TODO: http://requirejs.org/docs/jquery.html#cdnconfig
// TODO: Transferable objects: http://www.html5rocks.com/en/tutorials/workers/basics/?redirect_from_locale=it
// TODO: модальные окна
// TODO: i18N

(function() {
	"use strict";

	require(['image_processor/config.js'], function(config, loadCss) {
		// инстанс приложения
		var App = {};

		// все вьюхи по дефолту должны иметь связь с классом приложения
		define('App', ['backbone'], function(Backbone){
			Backbone.View = Backbone.View.extend({
				app: App
			});
			Backbone.Collection = Backbone.Collection.extend({
				app: App
			});
			Backbone.Model = Backbone.Model.extend({
				app: App
			});
		});

		require(["jquery", 
				"GUI", 
				"FilterStack", 
				'backbone', 
				'underscore',
				'loadCss',
				'App'], 
		function($, GUI, FilterStack, Backbone, _, loadCss) 
		{
			if(location.protocol == 'file:')
			{
				alert('This app should be run at web server in order to support web workers');
				return;
			}

			if(!window.Worker)
			{
				alert('Sorry, but your browser does not support Web Workers');
				return;
			}

			if(!window.FileReader)
			{
				alert('Sorry, but your browser does not support FileReader');
				return;
			}

			if(document.createElement('span').draggable == 'undefined')
			{
				alert('Sorry, but your browser does not support Drag-n-Drop');
				return;
			}

			var canvas = document.getElementById('image'), // TODO: спрятать в обьект
				context = canvas.getContext('2d'),
				gui,
				CanvasManager = {
					initImageData: null,

					drawImage: function(i, silent)
					{
						var that = this,
							refreshImageCache = true;

						if(typeof i == 'string') // data url или src
						{
							var img = new Image;
							img.src = i;
							img.onload = function(){
								that.drawImage(img); 
							};
							return;
						}

						if(!silent)
							App.trigger('beforeDisplayImage');

						canvas.width = i.width;
						canvas.height = i.height;
						if('tagName' in i) // img tag
							context.drawImage(i, 0, 0);
						else 
						{
							refreshImageCache = false;
							context.putImageData(i, 0, 0);
						}

						if(refreshImageCache || !this.initImageData)
						{
							this.initImageData = this.getImageData();
							App.trigger('newImage');
						}

						if(!silent)
							App.trigger('afterDisplayImage');

						return this;
					},

					getImageData: function(img) {
						return context.getImageData(0, 0, canvas.width, canvas.height);
					},

					/**
					 * Устанавливает исходное изображение
					 */
					reset: function()
					{
						App.trigger('afterResetImage');
						this.drawImage(this.initImageData, true);
						App.trigger('beforeResetImage');

						return this;
					},

					save: function()
					{
						App.trigger('beforeSave');
						var image = canvas.toDataURL("image/png");
						window.open(image, '_blank');
						App.trigger('afterSave', image);
					},

					getCanvas: function()
					{
						return canvas;
					},

					getContext: function()
					{
						return context;
					},

					newImageData: function()
					{
						return context.createImageData(canvas.width, canvas.height);
					},

					createUILayer: function() // TODO: канвас, который будет позиционироваться поверх текущего, для размещения на нем элементов управления
					{

					},

					createLayer: function() // TODO: аналогично createUILayer, но уже для "полезной" графической информации
					{
					}
				};

			_.extend(App, Backbone.Events);
			_.extend(App, {
				viewport: CanvasManager,
				loadCss: loadCss,
				filterStack: new FilterStack(),
				plugins: {},
				gui: new GUI()
			});

			// Добавляем и инициируем фильтры
			var filterNames = [];
			for (var filterName in config.filters)
				filterNames.push(filterName+'||'+config.filters[filterName].class);
			filterNames.sort();

			// Добавляем и инициируем плагины
			var inited = 0, 
				len = 0,
				launchApp = function() {
					App.trigger('beforeInit');
					App.trigger('init'); // отсюда начинается рендеринг GUI
					for (var i in filterNames)
					{
						(function(filterName, filterClass){
							App.gui.addFilter(filterName, filterClass);
						}).apply(null, filterNames[i].split('||'));
					}
					App.trigger('afterInit');
				};

			for (var pluginName in config.plugins)
			{
				len++;
				var className = config.plugins[pluginName].class;
				require(['plugins/'+className], function(Plugin) {
					App.plugins[className] = Plugin;
					inited++;

					if(inited == len)
						launchApp();
				})
			}

			if(len == 0) // нету плагинов, инициализируем приложение синхронно
				launchApp();
		});
	});
})();