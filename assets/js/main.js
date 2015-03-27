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
  b.textContent = b.disabled ? 'Tomar foto' : 'Tomando...';
  b.classList.toggle('recording');
  b.disabled = !b.disabled;
}

function makepage(src) {
  return "<html>\n" +
  "<head>\n" +
  "<title>Printing</title>\n" +
  "<script>\n" +
  "function step1() {\n" +
  " setTimeout('step2()', 10);\n" +
  "}\n" +
  "function step2() {\n" +
  " window.print();\n" +
  " window.close();\n" +
  "}\n" +
  "</scr" + "ipt>\n" +
  "</head>\n" +
  "<body onLoad='step1()'>\n" +
  "<img src='" + src + "'/>\n" +
  "</body>\n" +
  "</html>\n";
}

function printImage(src) {
  link = "about:blank";
  var pw = window.open(link, "_new");
  pw.document.open();
  pw.document.write(makepage(src));
  pw.document.close();
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
        App.otherCanvas.width = App.video.videoWidth;
        App.otherCanvas.height = App.video.videoHeight;
        App.otherContext = App.otherCanvas.getContext('2d');
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
        otherCtx = App.otherContext,
        m = 4,
        w = 4,
        i,
        comp;

    ctx.drawImage(video, 0, 0, App.canvas.width, App.canvas.height);
    backCtx.drawImage(video, 0, 0, App.backCanvas.width, App.backCanvas.height);
    otherCtx.drawImage(video, 0, 0, App.otherCanvas.width, App.otherCanvas.height);

    comp = ccv.detect_objects(App.ccv = App.ccv || {
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
    }
  },

  takePhoto: function() {
    $('p').remove();

    var ctx = App.context;
        otherCtx = App.otherContext;

    var CANVAS_HEIGHT = App.canvas.height;
    var CANVAS_WIDTH = App.canvas.width;
    App.frames = []
    App.startTime = Date.now();

    toggleActivateRecordButton();

    function counterTakePhoto_(time) {
      App.rafId = requestAnimationFrame(counterTakePhoto_);
      currentTime = Math.round((Date.now() - App.startTime) / 1000)
      $('#record-me').innerHTML = 'Ready ' + currentTime + 's';

      if (currentTime == App.setTimeTake) {
        ctx.drawImage(App.marco1, 0, 0, App.canvas.width, App.canvas.height);
        App.frames.push(App.canvas.toDataURL('image/png', 1));

        otherCtx.drawImage(App.marco2, 0, 0, App.otherCanvas.width, App.otherCanvas.height);
        App.frames.push(App.otherCanvas.toDataURL('image/png', 1));

        App.stopTakePhoto();
      }
    }

    App.rafId = requestAnimationFrame(counterTakePhoto_);
  },

  stopTakePhoto: function() {
    cancelAnimationFrame(App.rafId);
    endTime = Date.now();
    toggleActivateRecordButton();
    App.embedPhoto();
  },

  embedPhoto: function(opt_url) {
    var url = opt_url || null,
        url2 = opt_url || null;

    if (App.video) {
      downloadLink = document.createElement('a');
      //downloadLink.download = 'photo.png';
      downloadLink.textContent = 'Imprimir Con Marco';
      downloadLink.className = 'btn btn-default';

      downloadLink2 = document.createElement('a');
      //downloadLink2.download = 'photo.png';
      downloadLink2.textContent = 'Imprimir con Logo';
      downloadLink2.className = 'btn btn-default';

      var p = document.createElement('p');
          p.appendChild(downloadLink);
          p.appendChild(downloadLink2);

      $('#video-controls').appendChild(p);
    } else {
      window.URL.revokeObjectURL(App.video.src);
    }

    if (!url) {
      url = App.frames[0];
      url2 = App.frames[1];
    }

    downloadLink.href = "javascript:printImage('" + url + "')";
    //downloadLink.onClick = printme(event);
    downloadLink2.href = "javascript:printImage('" + url2 + "')";
    //downloadLink2.onClick = printme(event);
  }
};

App.init = function() {
  App.glasses = new Image();
  App.glasses.src = 'assets/images/glasses.png';

  App.marco1 = new Image();
  App.marco1.src = 'assets/images/marco1.png';

  App.marco2 = new Image();
  App.marco2.src = 'assets/images/marco2.png';

  App.video = document.createElement('video');

  App.backCanvas = document.createElement('canvas');
  App.otherCanvas = document.createElement('canvas');

  App.canvas = document.querySelector('#output');
  App.canvas.style.display = 'none';
  App.context = App.canvas.getContext('2d');
  App.info = document.querySelector('#info');

  App.rafId = null;
  App.frames = [];
  App.startTime = null;
  App.endTime = null;
  App.setTimeTake = 3;

  navigator.getUserMedia_ = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  try {
    navigator.getUserMedia_({
      video: true,
      audio: false
    }, App.start, App.denied);
  } catch (e) {
    try {
      navigator.getUserMedia_('video', App.start, App.denied);
    } catch (e) {
      App.error(e);
    }
  }

  App.video.loop = App.video.muted = true;
  App.video.load();

  $('#record-me').disabled = false;
  $('#record-me').addEventListener('click', App.takePhoto);
};

App.init();