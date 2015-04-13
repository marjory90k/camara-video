(function() {
  var i = 0,
  lastTime = 0,
  vendors = ['ms', 'moz', 'webkit', 'o'];

  while (i < vendors.length && !window.requestAnimationFrame) {
    window.requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
    i++;
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime(),
      timeToCall = Math.max(0, 1000 / 60 - currTime + lastTime),
      id = setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);

      lastTime = currTime + timeToCall;
      return id;
    };
  }
}());

function $(selector) {
  return document.querySelector(selector) || null;
}

function toggleActivateRecordButton() {
  var b = $('#record-me');
  b.textContent = b.disabled ? 'Grabar de nuevo' : 'Grabando...';
  b.classList.toggle('recording');
  b.disabled = !b.disabled;
}

var workerPath = location.href.replace(location.href.split('/').pop(), '') + 'ffmpeg_asm.js';

function processInWebWorker() {
  var blob = URL.createObjectURL(new Blob(['importScripts("' + workerPath + '");var now = Date.now;function print(text) {postMessage({"type" : "stdout","data" : text});};onmessage = function(event) {var message = event.data;if (message.type === "command") {var Module = {print: print,printErr: print,files: message.files || [],arguments: message.arguments || [],TOTAL_MEMORY: message.TOTAL_MEMORY || false};postMessage({"type" : "start","data" : Module.arguments.join(" ")});postMessage({"type" : "stdout","data" : "Received command: " +Module.arguments.join(" ") +((Module.TOTAL_MEMORY) ? ".  Processing with " + Module.TOTAL_MEMORY + " bits." : "")});var time = now();var result = ffmpeg_run(Module);var totalTime = now() - time;postMessage({"type" : "stdout","data" : "Finished processing (took " + totalTime + "ms)"});postMessage({"type" : "done","data" : result,"time" : totalTime});}};postMessage({"type" : "ready"});'], {
    type: 'application/javascript'
  }));

  var worker = new Worker(blob);
  URL.revokeObjectURL(blob);
  return worker;
}

var worker;

function convertStreams(videoBlob, audioBlob) {
  var vab;
  var aab;
  var buffersReady;
  var workerReady;
  var posted = false;

  var fileReader1 = new FileReader();
  fileReader1.onload = function() {
    vab = this.result;

    if (aab) buffersReady = true;

    if (buffersReady && workerReady && !posted) postMessage();
  };
  var fileReader2 = new FileReader();
  fileReader2.onload = function() {
    aab = this.result;

    if (vab) buffersReady = true;

    if (buffersReady && workerReady && !posted) postMessage();
  };

  fileReader1.readAsArrayBuffer(videoBlob);
  fileReader2.readAsArrayBuffer(audioBlob);

  if (!worker) {
    worker = processInWebWorker();
  }

  worker.onmessage = function(event) {
    var message = event.data;
    if (message.type == "ready") {
      workerReady = true;
      if (buffersReady)
        postMessage();
    } else if (message.type == "stdout") {
      log(message.data);
    } else if (message.type == "start") {
      log('<a href="'+ workerPath +'" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file received ffmpeg command.');
    } else if (message.type == "done") {
      log(JSON.stringify(message));

      var result = message.data[0];
      log(JSON.stringify(result));

      var blob = new Blob([result.data], {
        type: 'video/mp4'
      });

      log(JSON.stringify(blob));

      PostBlob(blob);
    }
  };

  var postMessage = function() {
    posted = true;

    worker.postMessage({
      type: 'command',
      arguments: [
      '-i', 'video.webm',
      '-i', 'audio.wav',
      '-c:v', 'mpeg4',
      '-c:a', 'vorbis',
      '-b:v', '6400k',
      '-b:a', '4800k',
      '-strict', 'experimental', 'output.mp4'
      ],
      files: [
      {
        data: new Uint8Array(vab),
        name: "video.webm"
      },
      {
        data: new Uint8Array(aab),
        name: "audio.wav"
      }
      ]
    });
  };
}

function PostBlob(blob) {
  var h2 = document.createElement('h2');
  h2.innerHTML = '<a href="' + URL.createObjectURL(blob) + '" target="_blank" download="Converted Video.mp4">Descargar</a>';
  $('#video-controls').appendChild(h2);
  h2.tabIndex = 0;
  h2.focus();
}

function log(message) {
  console.info(message);
}

var App = {
  start: function(stream) {
    $('#video-controls').style.display = 'block';
    App.video.addEventListener('canplay', function() {
      App.video.removeEventListener('canplay');
      setTimeout(function() {
        App.video.play();
        App.canvas.style.display = 'inline';
        App.info.style.display = 'none';
        App.canvas.width = App.video.videoWidth;
        App.canvas.height = App.video.videoHeight;
        App.backCanvas.width = App.video.videoWidth / 4;
        App.backCanvas.height = App.video.videoHeight / 4;
        App.backContext = App.backCanvas.getContext('2d');

        var w = 300 / 4 * 0.8,
        h = 270 / 4 * 0.8;

        App.comp = [{
          x: (App.video.videoWidth / 4 - w) / 2,
          y: (App.video.videoHeight / 4 - h) / 2,
          width: w,
          height: h,
        }];

        App.drawToCanvas();
      }, 500);
    }, true);

    App.recordAudio = RecordRTC(stream, {});

    var domURL = window.URL || window.webkitURL;
    App.video.src = domURL ? domURL.createObjectURL(stream) : stream;
  },

  denied: function() {
    App.info.innerHTML = 'Camera access denied!<br>Please reload and try again.';
  },

  error: function(e) {
    if (e) {
      console.error(e);
    }
    App.info.innerHTML = 'Please go to about:flags in Google Chrome and enable the &quot;MediaStream&quot; flag.';
  },

  drawToCanvas: function() {
    requestAnimationFrame(App.drawToCanvas);

    var video = App.video,
    ctx = App.context,
    backCtx = App.backContext,
    m = 4,
    w = 4,
    i,
    comp;

    ctx.drawImage(video, 0, 0, App.canvas.width, App.canvas.height);

    backCtx.drawImage(video, 0, 0, App.backCanvas.width, App.backCanvas.height);

    /*comp = ccv.detect_objects(App.ccv = App.ccv || {
      canvas: App.backCanvas,
      cascade: cascade,
      interval: 4,
      min_neighbors: 1
    });

    if (comp.length) {
      App.comp = comp;
    }

    for (i = App.comp.length; i--; ) {
      ctx.drawImage(App.glasses, (App.comp[i].x - w / 2) * m, (App.comp[i].y - w / 2) * m, (App.comp[i].width + w) * m, (App.comp[i].height + w) * m);
    }*/
  },

  startRecord: function() {
    $('p').remove();

    var ctx = App.context;
    var CANVAS_HEIGHT = App.canvas.height;
    var CANVAS_WIDTH = App.canvas.width;
    App.frames = []
    App.startTime = Date.now();

    toggleActivateRecordButton();

    function drawVideoFrame_(time) {
      App.rafId = requestAnimationFrame(drawVideoFrame_);
      currentTime = Math.round((Date.now() - App.startTime) / 1000)

      document.title = $('#record-me').innerHTML = 'Grabando...' + currentTime + 's';

      if (App.setTimeRecord == currentTime) {
        App.stopRecord();
      } else {
        console.info('>>');
        App.frames.push(App.canvas.toDataURL('image/webp', 1));
      }
    };

    App.recordAudio.startRecording();

    App.rafId = requestAnimationFrame(drawVideoFrame_);
  },

  stopRecord: function() {
    cancelAnimationFrame(App.rafId);
    endTime = Date.now();
    toggleActivateRecordButton();
    App.recordAudio.stopRecording(function() {
      console.info('Se termina!!!!!');
      convertStreams(App.getBlob(), App.recordAudio.getBlob());
    });
    //App.embedVideo();
  },

  getBlob: function(opt_url) {
    /*var url = opt_url || null;

    if (App.video) {
      downloadLink = document.createElement('a');
      downloadLink.download = 'captura.webm';
      downloadLink.textContent = 'Descargar video';
      downloadLink.title = 'Descarga tu webm video';
      downloadLink.className = 'btn btn-default';

      var p = document.createElement('p');
      p.appendChild(downloadLink);

      $('#video-controls').appendChild(p);
    } else {
      window.URL.revokeObjectURL(App.video.src);
    }

    if (!url) {
      var webmBlob = Whammy.fromImageArray(App.frames, 350 / 60);
      url = window.URL.createObjectURL(webmBlob);
    }

    document.title = 'Video';
    downloadLink.href = url;*/
    var webmBlob = Whammy.fromImageArray(App.frames, 32);
    return webmBlob;
  }
};

App.init = function() {
  App.glasses = new Image();
  App.glasses.src = 'assets/images/glasses.png';

  App.video = document.createElement('video');
  App.backCanvas = document.createElement('canvas');
  App.canvas = document.querySelector('#output');
  App.canvas.style.display = 'none';
  App.context = App.canvas.getContext('2d');
  App.info = document.querySelector('#info');

  App.recordAudio = null;
  App.rafId = null;
  App.frames = [];
  App.startTime = null;
  App.endTime = null;
  App.setTimeRecord = 10;

  navigator.getUserMedia_ = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  try {
    navigator.getUserMedia_({
      video: true,
      audio: true
    }, App.start, App.denied);
  } catch (e) {
    try {
      navigator.getUserMedia_('video', App.start, App.denied);
    } catch (e) {
      App.error(e);
    }
  }

  App.video.loop = true;
  App.video.load();

  $('#record-me').disabled = false;
  $('#record-me').addEventListener('click', App.startRecord);
};

App.init();