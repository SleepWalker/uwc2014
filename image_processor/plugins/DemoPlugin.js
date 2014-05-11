define(['jquery', 'backbone', 'hbs!./demo/demo'], function($, Backbone, demoTpl) {
	var DemoView = Backbone.View.extend({
		template: demoTpl,

		events: {
			'click button[data-src]': 'loadImage'
		},

		initialize: function()
		{
			this.app.loadCss(require.toUrl('plugins/demo/demo.css'));
			this.listenToOnce(this.app, 'afterInit', function() {
				$('body').append(this.render().$el);
			});
		},

		loadImage: function(e)
		{
			var $el = $(e.target);
			if($el.data('src') != '')
			{
				this.app.viewport.drawImage($el.data('src'));
			}
		},

		render: function()
		{
			this.$el.html(this.template());

			return this;
		}
	});

	return new DemoView();
});