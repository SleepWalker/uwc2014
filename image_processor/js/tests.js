(function() {
	var data = [];
	for(var i = 0; i < 9; i++)
		for(var k = 0; k < 4; k++)
			data[i*4+k] = k+1;

	var dataForMedian = [];
	for(var k = 0; k < 4; k++)
		dataForMedian = dataForMedian.concat([1, 2, 3, 4, 5, 6, 7, 8, 9]); //5

	dataForMedian.sort(function(a,b){return a - b});

	var imageData = {
		width: 3,
		height: 3,
		data: data,
	}

	var message = {
		options: {
			radius: 1,
			clearCanvas: imageData
		},
		imageData: imageData
	};
	require(['image_processor/config.js'], function(config) {
		sendMessage(message, function(d) {
			test('Median', function() {
				var valid = true;
				for(var i = 0; i < data.length; i++)
					valid = valid && data[i]===d.imageData.data[i];

				ok(valid, 'Проверка, что бы каналы rgba не смешивались между собой');
			});
		});

		message.imageData.data = dataForMedian.slice();
		sendMessage(message, function(d) {
			test('Median', function() {
				/*
				1  1  2
				 +---------+
				1|(1) 2  3 |
				 |         |
				4| 4 (5) 6 |
				 |         |
				 | 7  8  9 |
				 +---------+

				5: 1 2 3 4 5 6 7 8 9 => 5
				1: 1 1 1 1 2 2 4 4 5 => 2
				*/
				equal(d.imageData.data[16], 5, 'Тест расчета медианы');
				equal(d.imageData.data[0], 2, 'Тест расчета медианы на краю изображения');
			});
		});
	});

	// TODO: сравнение скорости

	function sendMessage(message, func)
	{
		var worker = new Worker(require.toUrl('filters/Median.js'));

		message.action = 'filter';

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
					func(e.data);
				break;
			}

			worker.terminate();
		}, false);

		worker.addEventListener('error', function(e) {
			alert('Error:\n'+e.message);
		}, false);

		worker.postMessage(message);
	}
})();