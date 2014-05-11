(function() {
	"use strict";
	var GaussianBlur = {
		filter: function(options)
		{
			var kernel = this.getKernel(options.radius);
			this.options = options;

			var dataInRow = this.imageData.width*4;
			var dataInCol = dataInRow*this.imageData.height;

			var clearCanvas = options.clearCanvas;

			for (var start = 0; start < this.imageData.data.length; start += dataInRow)
			{
				this.convolve1DRGBA(clearCanvas, kernel, start, start+dataInRow);
			}

			for (var start = 0; start < dataInRow; start += 4)
			{
				this.convolve1DRGBA(clearCanvas, kernel, start, start+dataInCol, dataInRow);
			}

			return clearCanvas;
		},

		/**
		 * Выполняет одномерную свертку (convolution) для RGBA массива.
		 * Точки по краям изображения, выходящие за пределы изображения, компенсируются зеркальным отрожанием их координаты (относительно центра маски)
		 * 
		 * @param ImageData clearCanvas пустой обьект ImageData
		 * @param {} kernel обьект с данными маски фильтра
		 * @param integer start элемент с которого начинать применение маски фильтра
		 * @param integer end элемент перед котором закончить применение маски фильтра
		 * @param integer step количество пропускаемых элементов (к примеру если нужно применять фильтр по-вертикали)
		 */
		convolve1DRGBA: function(clearCanvas, kernel, start, end, step)
		{
			var rgbaArr = this.imageData.data;
			start = start ? start : 0;
			end = end ? end : rgbaArr.length;
			step = step ? step : 4;
			var delta, 
				sign,
				r, g, b,
				setRGB = function() {
					r += rgbaArr[i+delta*sign] * kernel.tail[k];
					g += rgbaArr[i+1+delta*sign] * kernel.tail[k];
					b += rgbaArr[i+2+delta*sign] * kernel.tail[k];
				};

			for (var i = start; i < end; i+=step)
			{
				r = rgbaArr[i] * kernel.center;
				g = rgbaArr[i+1] * kernel.center;
				b = rgbaArr[i+2] * kernel.center;

				for(var k=0; k < kernel.tail.length; k++)
				{
					delta = (k+1)*step;
					sign = i+3+delta < end ? 1 : -1;
					setRGB();

					sign = i-delta < start ? 1 : -1;
					setRGB();
				}

				clearCanvas.data[i] = r;
				clearCanvas.data[i+1] = g;
				clearCanvas.data[i+2] = b;
				clearCanvas.data[i+3] = rgbaArr[i+3];
			}
		},
		/**
		 * @return ядро для размытия
		 * @see http://homepages.inf.ed.ac.uk/rbf/HIPR2/kernel.htm
		 * @see http://http.developer.nvidia.com/GPUGems3/gpugems3_ch40.html
		 */
		getKernel: function(radius)
		{
			var sigma = Math.floor(radius/2),
				sigma = sigma ? sigma : 1,
				sigmaSquared = Math.pow(sigma, 2),
				normalization = Math.sqrt(2*Math.PI*sigmaSquared),
				G = function(i) {return Math.exp(coeffConst*Math.pow(i, 2))/normalization};

			var coeffConst = -0.5/sigmaSquared;
			var tail = [];
			for(var i = 1; i <= radius; i++)
			{
				tail.push(G(i));
			}
			var kernel = {
				center: G(0),
				tail: tail,
			};

			return kernel;
		},
	};


	if(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		self.addEventListener('message', function(e) {
			switch(e.data.action)
			{
				case 'filter':
					var data = e.data;
					GaussianBlur.imageData = data.imageData;
					data.imageData = GaussianBlur.filter(data.options);

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
						value: 5,
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