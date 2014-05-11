(function() {
	"use strict";

	var ImageData = function(imageData) {
		this.imageData = imageData;
		this.stepX = 4;

		this.eachXY = function(callback, options)
		{
			options = options ? options : {};
			options.step = options.step ? options.step : 1;
			for (var x = 0; x < this.imageData.width; x+=options.step)
			{
				for (var y = 0; y < this.imageData.height; y+=options.step)
				{
					callback.call(this, x, y);
				}
			}
		};

		this.toIndex = function(x, y)
		{
			return (x+y*this.imageData.width)*this.stepX;
		};
	};

	var Median = {
		filter: function(options)
		{
			var clearCanvas = options.clearCanvas;

			var imageData = new ImageData(this.imageData);

			var that = this;
			imageData.eachXY(function(x, y) {
				that.calcMedian(clearCanvas, x, y, options.radius);
			});

			return clearCanvas;
		},

		// TODO: Docs
		/**
		 * Выполняет одномерную свертку (convolution) для RGBA массива.
		 * Точки по краям изображения, выходящие за пределы изображения, компенсируются зеркальным отрожанием их координаты (относительно центра маски)
		 * 
		 * @param ImageData clearCanvas пустой обьект ImageData
		 * @param {} kernel обьект с данными маски фильтра
		 * @param integer start элемент с которого начинать применение маски фильтра
		 * @param integer end элемент перед котором закончить применение маски фильтра
		 * @param integer step количество пропускаемых элементов (к примеру если нужно применять фильтр по-вертикали)
		 *
		 * @todo http://en.wikipedia.org/wiki/Selection_algorithm or histogram + median
		 */
		calcMedian: function(destImageData, x, y, radius)
		{
			// TODO: test the quader
			var that = this,
				stepX = 4,
				maskSideSize = radius*2,
				xStart = x-radius,
				xEnd = xStart + maskSideSize,
				yStart = y-radius,
				yEnd = yStart + maskSideSize,
				center = (x+y*this.imageData.width)*stepX;

			var data = {r:[], g:[], b:[]},
				pushData = function(i) {
					data.r.push(that.imageData.data[i]);
					data.g.push(that.imageData.data[i+1]);
					data.b.push(that.imageData.data[i+2]);
				},
				median = function(data) {
					data.sort(function(a,b){return a - b});
					var i = Math.floor(data.length / 2);
					return data[i];
				};
			for(var ix = xStart; ix <= xEnd; ix++)
			{
				for(var iy = yStart; iy <= yEnd; iy++)
				{
					var cx = (ix < 0 || ix >= this.imageData.width) ? x : ix;
					var cy = (iy < 0 || iy >= this.imageData.height) ? y : iy;

					var i = (cx+cy*this.imageData.width)*stepX;
					pushData(i);
				}
			}

			destImageData.data[center] = median(data.r);
			destImageData.data[center+1] = median(data.g);
			destImageData.data[center+2] = median(data.b);
			destImageData.data[center+3] = this.imageData.data[center+3];
		},
	};

	if(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		self.addEventListener('message', function(e) {
			switch(e.data.action)
			{
				case 'filter':
					var data = e.data;
					Median.imageData = data.imageData;
					data.imageData = Median.filter(data.options);

					postMessage(data);
				break;
			}
		});
	else // GUI часть
		define(['FilterControls'], function(FilterControls) {
			var Controls = FilterControls.extend({
				filterOptions: {
					radius: {
						name: 'radius',
						label: 'Radius',
						type: 'slider',
						options: {
							min: 1,
							max: 10
						}
					}
				},
			});

			return Controls;
		});
})();