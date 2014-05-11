/**
 * Класс-обвертка для работы с данными изображения
 */
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