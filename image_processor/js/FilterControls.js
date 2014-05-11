define(['jquery', 
		'backbone', 
		'hbs!tpl/filterControls', 
		'hbs/handlebars',
		'bootstrap-slider',
		'mousewheel',
		'serialiazeObject'], 
function($, Backbone, tpl, Handlebars) {
	var jsStack = [];
	Handlebars.registerHelper('control', function() {
		// TODO: документация по полям
		var field = $.extend({
			value: '',
			type: 'text',
			attributes: {},
		}, this);

		if(field.type == 'slider')
		{
			field.type = 'text';
			var options = $.extend({
				min: 1,
				max: 100,
				step: 1,
			}, field.options);

			field.value = field.value != '' ? field.value : options.min;

			field.attributes = {
				class: 'filter-slider input-sm form-control',
				'data-slider-min': options.min,
				'data-slider-max': options.max,
				'data-slider-step': options.step,
				'data-slider-value': field.value
			};

			jsStack.push(function() {
				$('.filter-slider').each(function() {
					var $el = $(this);

					$el.slider({tooltip: false})
						.off('slideStop')
						.on('slideStop', function() {
							$(this).change();
						})
					.parent()
						.off('mousewheel')
						.on('mousewheel', function(e) {
							var val = $el.data('slider').getValue()*1 + e.deltaY*options.step;
							$el.slider('setValue', val);
							$el.val(val).change();

							e.preventDefault();
						})
						;
				});
			});
		}


		var atts = [];
		for(var att in field.attributes)
			atts.push(att+'="'+field.attributes[att]+'"');

		return new Handlebars.SafeString(
			'<input name="'+field.name+'" type="'+field.type+'" value="'+field.value+'" '+atts.join(' ')+'>'
		);
	});

	var FilterControls = Backbone.View.extend({
		template: tpl,

		// TODO: документация
		filterOptions: {},
		filter: null, // модель фильтра

		events: {
			'change input, textarea, select': 'triggerFilter',
		},

		initialize: function(options)
		{
			this.app = options.app;
			this.filter = options.model;
		},

		afterInitialize: function() {}, // callback, который может быть использован для переопредиления поведения обьекта в классах детей

		/**
		 * @return jQuery коллекцию DOM обьектов управления фильтром
		 */
		getControls: function()
		{
			return this.$('input, textarea, select');
		},

		/**
		 * @return object обьект с значениями всех полей фильтра
		 */
		serializeControls: function()
		{
			return this.getControls().serializeObject();
		},

		/**
		 * Запускает фильтр
		 */
		triggerFilter: function()
		{
			this.filter.set(this.serializeControls()).run();
		},

		render: function() {
			this.$el.html(this.template({
				model: this.filter,
				controls: this.filterOptions
			}));

			return this;
		},

		/**
		 * Вызов js после рендеринга формы
		 */
		renderScripts: function() 
		{
			for(var i = 0; i < jsStack.length; i++)
				jsStack[i].call(this);

			// запускаем фильтр сразу после его активации в GUI
			this.triggerFilter();

			return this;
		}
	});

	return FilterControls;
});