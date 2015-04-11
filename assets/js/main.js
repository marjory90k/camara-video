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

function toggleActivateRecordButton(texto, status) {
  var b = $('#record-me');
  b.text(texto || 'Tomar foto');
  b.attr('disabled', status);
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

function shareOnFacebook(url) {
  FB.ui({
    method: 'feed',
    name: 'Compartir mi foto',
    link: 'http://teamlight.x10host.com/camara-video-facebook/',
    caption: 'Compartir mi foto',
    description: 'Compartiendo mi foto',
    source: url,
    message: 'Compartir mi foto'
  });

  console.info(url);
}

function photo_url(source) {
  //return "http://" + document.domain + "/camara-video/" + source + "";
  return "http://teamlight.x10host.com/camara-video-facebook/" + source + "";
}

var App = {
  start: function(stream) {
    $('#video-controls').show();
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
    App.info.innerHTML = 'Acceso denegado!<br>Vuelva a cargar y vuelva a intentarlo.';
  },

  error: function(e) {
    if (e) {
      console.error(e);
    }
    App.info.innerHTML = 'Please go to about:flags in Google Chrome and enable the &quot;MediaStream&quot; flag.';
  },

  drawToCanvas: function() {
    $('#record-me').show();
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

  takePhoto: function() {
    App.video.play();
    $('#share-button').remove();

    var ctx = App.context;
        otherCtx = App.otherContext;

    var CANVAS_HEIGHT = App.canvas.height;
    var CANVAS_WIDTH = App.canvas.width;
    App.frames = []
    App.startTime = Date.now();

    toggleActivateRecordButton(null, true);

    var setTimeTake = 6;

    function counterTakePhoto_(time) {
      App.rafId = requestAnimationFrame(counterTakePhoto_);
      currentTime = Math.round((Date.now() - App.startTime) / 1000)
      $('#record-me').html('Preparate ' + (setTimeTake - currentTime) + '');

      if (currentTime == setTimeTake) {
        otherCtx.drawImage(App.marco2, 0, 0, App.otherCanvas.width, App.otherCanvas.height);
        App.frames.push(App.otherCanvas.toDataURL('image/png', 1));
        App.stopTakePhoto();
      }
    }

    App.rafId = requestAnimationFrame(counterTakePhoto_);
  },

  stopTakePhoto: function() {
    App.video.pause();
    cancelAnimationFrame(App.rafId);
    endTime = Date.now();
    App.uploadImage();
  },

  uploadImage: function() {
    toggleActivateRecordButton('Espere un momento...', true);

    $.ajax({
      dataType: 'json',
      url: 'api.php',
      type: 'POST',
      data: { hidden_data: App.frames[0] },
    }).done(function(data){
      App.sharePhoto(photo_url(data['url']));
    });
  },

  embedPhoto: function(opt_url) {
    var url = opt_url || null,
        url2 = opt_url || null;

    if (App.video) {
      /*downloadLink = document.createElement('a');
      //downloadLink.download = 'photo.png';
      downloadLink.textContent = 'Imprimir Con Marco';
      downloadLink.className = 'btn btn-default';*/

      downloadLink2 = document.createElement('a');
      //downloadLink2.download = 'photo.png';
      downloadLink2.innerHTML = '<i class="fa fa-facebook-square"></i> Compatir';
      downloadLink2.className = 'btn btn-default';

      //var p = document.createElement('p');
          //p.appendChild(downloadLink);
          //$('.video-controls').appendChild(downloadLink2);

      $('#video-controls').appendChild(downloadLink2);
    } else {
      window.URL.revokeObjectURL(App.video.src);
    }

    if (!url) {
      url = App.frames[0];
      //url2 = App.frames[1];
    }

    downloadLink2.href = "javascript:shareOnFacebook('" + url + "')";
    //downloadLink2.href = "javascript:printImage('" + url + "')";
    //downloadLink.onClick = printme(event);
    //downloadLink2.href = "javascript:printImage('" + url2 + "')";
    //downloadLink2.onClick = printme(event);
  },

  sharePhoto: function(url) {
    var downloadLink2 = $('<a>');
    downloadLink2.attr('id', 'share-button');
    downloadLink2.html('<i class="fa fa-facebook-square"></i> Compatir');
    downloadLink2.addClass('btn btn-default');

    $('.video').append(downloadLink2);

    toggleActivateRecordButton(null, false);
    downloadLink2.attr('href', "javascript:shareOnFacebook('" + url + "')");
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

  $('#record-me').attr('disabled', false);
  $('#record-me').on('click', App.takePhoto);
};

App.init();