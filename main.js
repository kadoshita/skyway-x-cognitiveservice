const SKYWAY_KEY = '';
const FACE_API_ENDPOINT = 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect';
const FACE_API_KEY = '';
const COGNITIVE_INTERVAL = 6500;

$(() => {
	let localStream = null;
	let peer = null;
	let existingCall = null;
	let dataConnection;
	let cognitiveTimer;

	peer = new Peer({
		key: SKYWAY_KEY,
		debug:1
	});

	peer.on('open', () => {
		$('#my-id').text('MyID: '+peer.id);
		const constraints = {
			audio: true,
			video: {
				width: 320,
				height: 240
			}
		}
		navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
			$('#local-video').get(0).srcObject = stream;
			localStream = stream;
		}).catch((e) => {
			console.error(e);
		});
	});
	peer.on('call', (call) => {
		call.answer(localStream);
		dataConnection = peer.connect(call.remoteId);
		let canvas = $('#local-video-canvas').get(0);
		let video = $('#local-video').get(0);
		setTimeout(() => {
			captureVideo(video, canvas);
		}, 1000);
		cognitiveTimer = setInterval(() => {
			captureVideo(video, canvas);
		}, COGNITIVE_INTERVAL);
		$('#connect-button').text('Close');
		setupCallEventHandlers(call);
	});
	peer.on('connection', (conn) => {
		conn.on('open', () => {
			console.log('dataconnection open');
		});
		conn.on('data', (data) => {
			indicateResult(data);
		});
	});
	peer.on('error', (e) => {
		console.error(e);
	});
	peer.on('close', () => {
		console.log('connection closed');
	});
	peer.on('disconnected', () => {
		console.log('connection disconnected');
	});

	$('#connect-button').on('click', (e) => {
		e.preventDefault();
		if (existingCall === null) {//make call
			const call = peer.call($('#peer-id').val(), localStream);
			dataConnection = peer.connect($('#peer-id').val());
			setupCallEventHandlers(call);
			let canvas = $('#local-video-canvas').get(0);
			let video = $('#local-video').get(0);
			setTimeout(() => {
				captureVideo(video, canvas);
			}, 1000);
			cognitiveTimer = setInterval(() => {
				captureVideo(video, canvas);
			}, COGNITIVE_INTERVAL);
			$('#connect-button').text('Close');
		} else {//close call
			existingCall.close();
			existingCall = null;
			$('#connect-button').text('Connect');
		}
	});

	const setupCallEventHandlers = (call) => {
		if (existingCall) {
			existingCall.close();
		}

		existingCall = call;

		call.on('stream', (stream) => {
			$('#remote-video').get(0).srcObject = stream;
			$('#peer-id').val(call.remoteId);
		});
		call.on('close', () => {
			$('#remote-video').get(0).srcObject = null;
		});
	};
	let captureVideo = (video, canvas) => {
		var ctx = canvas.getContext('2d');

		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		canvas.toBlob((blob) => {
			cognitiveFace(blob);
		});
	}
	let cognitiveFace = (blob) => {
		var params = {
			// Request parameters
			'returnFaceId': 'true',
			'returnFaceAttributes': 'age,gender,emotion,glasses',
		};

		$.ajax({
			url: FACE_API_ENDPOINT + '?' + $.param(params),
			beforeSend: function (xhrObj) {
				// Request headers
				xhrObj.setRequestHeader('Content-Type', 'application/octet-stream');
				xhrObj.setRequestHeader('Ocp-Apim-Subscription-Key', FACE_API_KEY);
			},
			type: 'POST',
			// Request body
			processData: false,
			data: blob,
		})
			.done((data) => {
				console.log('success');
				dataConnection.send(data);
			})
			.fail(() => {
				console.error('error');
			});
	};
	let indicateResult = (results) => {
		$('#result').show();
		if (results.length === 0) {
			$('#result').hide();
			return;
		}
		console.info(results);
		let faceAttributes = results[0].faceAttributes;

		let age = faceAttributes.age;
		let gender = faceAttributes.gender;
		let grass = faceAttributes.glasses;

		let anger = faceAttributes.emotion.anger;//怒り
		$('#anger').text(decimalFormat(anger * 100)).css({
			'width': anger * 100 + '%',
			'color': 'black'
		});
		let contempt = faceAttributes.emotion.contempt;//軽蔑
		$('#contempt').text(decimalFormat(contempt * 100)).css({
			'width': contempt * 100 + '%',
			'color': 'black'
		});
		let disgust = faceAttributes.emotion.disgust;//嫌悪
		$('#disgust').text(decimalFormat(disgust * 100)).css({
			'width': disgust * 100 + '%',
			'color': 'black'
		});
		let fear = faceAttributes.emotion.fear;//恐怖
		$('#fear').text(decimalFormat(fear * 100)).css({
			'width': fear * 100 + '%',
			'color': 'black'
		});
		let happiness = faceAttributes.emotion.happiness;//幸福
		$('#happiness').text(decimalFormat(happiness * 100)).css({
			'width': happiness * 100 + '%',
			'color': 'black'
		});
		let neutral = faceAttributes.emotion.neutral;//中立
		$('#neutral').text(decimalFormat(neutral * 100)).css({
			'width': neutral * 100 + '%',
			'color': 'black'
		});
		let sadness = faceAttributes.emotion.sadness;//悲しみ
		$('#sadness').text(decimalFormat(sadness * 100)).css({
			'width': sadness * 100 + '%',
			'color': 'black'
		});
		let surprise = faceAttributes.emotion.surprise;//驚き
		$('#surprise').text(decimalFormat(surprise * 100)).css({
			'width': surprise * 100 + '%',
			'color': 'black'
		});

		$('#grass').text(translateGlasses(grass)).css({ 'color': 'black' });
		$('#age').text(age).css({
			'width': age + '%',
			'color': 'black'
		});

		if (age < 10) {
			$('#gender').text((gender === 'male') ? '男の子' : '女の子');
		} else {
			$('#gender').text((gender === 'male') ? '男性' : '女性');
		}
	};

	let decimalFormat = (num) => {
		if (num.toString().length <= 4) {
			return num;
		}
		var splited = num.toString().split('.');
		var n = splited[0];
		var dec = splited[1].substr(0, 4);
		return n + '.' + dec;
	};
	let translateGlasses = (en) => {
		switch (en) {
			case 'NoGlasses': return '眼鏡無し'; break;
			case 'ReadingGlasses': return '眼鏡あり'; break;
			case 'Sunglasses': return 'サングラス'; break;
			case 'SwimmingGoggles': return 'スイミングゴーグル'; break;
			default: return '眼鏡無し'; break;
		}
	};
});