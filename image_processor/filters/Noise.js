// TODO: оптимизация
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

	var Noise = {
		filter: function(options)
		{
			var imageData = new ImageData(this.imageData);

			var that = this;
			imageData.eachXY(function(x, y) {
				that.applyNoise(x, y, options.mixingLevel);
			}, {
				step: Math.floor(this.imageData.width / (this.imageData.width * options.noiseLevel/100) )
			});

			return this.imageData;
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
		 */
		applyNoise: function(x, y, mixingLevel)
		{
			var stepX = 4,
				destImageData = this.imageData,
				center = (x+y*this.imageData.width)*stepX;

			var noiseCoeff = mixingLevel/100,
				pixelCoeff = 1-noiseCoeff,
				noiseValue = Math.floor(Math.random() * 255) * noiseCoeff;

			for(var i = 0; i<3; i++)
			{
				destImageData.data[center+i] = destImageData.data[center+i] * pixelCoeff + noiseValue;
			}

			if(destImageData.data[center+3] > 0)
				destImageData.data[center+3] = destImageData.data[center+3] * pixelCoeff + 255*mixingLevel;
		},
	};

	if(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		self.addEventListener('message', function(e) {
			switch(e.data.action)
			{
				case 'filter':
					var data = e.data;
					Noise.imageData = data.imageData;
					data.imageData = Noise.filter(data.options);

					postMessage(data);
				break;
			}
		});
	else // GUI часть
		define(['FilterControls'], function(FilterControls) {
			var Controls = FilterControls.extend({
				filterOptions: {
					noiseLevel: {
						name: 'noiseLevel',
						label: 'Noise Level',
						type: 'slider',
						value: 100,
						options: {
							min: 1,
							max: 100,
							step: 0.01
						}
					},
					mixingLevel: {
						name: 'mixingLevel',
						label: 'Mixing Level',
						type: 'slider',
						value: 10,
						options: {
							min: 1,
							max: 100
						}
					}
				},
			});

			return Controls;
		});
})();