window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = new AudioContext();
var audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null;
var rafID = null;
var analyserContext = null;
var recIndex = 0;

function saveAudio() {
  audioRecorder.exportWAV(doneEncoding);
}

function gotBuffers(buffers) {
  var canvas = document.getElementById("wavedisplay");

  drawBuffer(canvas.width, canvas.height, canvas.getContext('2d'), buffers[0]);

  // the ONLY time gotBuffers is called is right after a new recording is completed -
  // so here's where we should set up the download.
  audioRecorder.exportWAV(doneEncoding);
}

function doneEncoding(blob) {
  Recorder.setupDownload(blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav");
  recIndex++;
}

function toggleRecording(e) {
  var recordButton = e.target;
  if (recordButton.classList.contains("recording")) {
    // stop recording
    audioRecorder.stop();
    recordButton.classList.remove("recording");
    audioRecorder.getBuffers(gotBuffers);
  } else {
    // start recording
    if (!audioRecorder) {
      return;
    }
    recordButton.classList.add("recording");
    audioRecorder.clear();
    audioRecorder.record();
  }
}

function drawBuffer(width, height, context, data) {
  var step = Math.ceil(data.length / width);
  var amp = height / 2;
  context.fillStyle = "silver";
  context.clearRect(0, 0, width, height);
  for (var i=0; i < width; i++){
    var min = 1.0;
    var max = -1.0;
    for (j=0; j<step; j++) {
      var datum = data[(i*step)+j];
      if (datum < min) {
        min = datum;
      }
      if (datum > max) {
        max = datum;
      }
    }
    context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }
}

function updateAnalysers(canvas, analyserNode) {
  analyserContext = canvas.getContext('2d');

  // analyzer draw code here
  var SPACING = 3;
  var BAR_WIDTH = 1;
  var numBars = Math.round(canvas.width / SPACING);
  var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

  analyserNode.getByteFrequencyData(freqByteData);

  analyserContext.clearRect(0, 0, canvas.width, canvas.height);
  analyserContext.fillStyle = '#F6D565';
  analyserContext.lineCap = 'round';
  var multiplier = analyserNode.frequencyBinCount / numBars;

  // Draw rectangle for each frequency bin.
  for (var i = 0; i < numBars; ++i) {
    var magnitude = 0;
    var offset = Math.floor(i * multiplier);
    // gotta sum/average the block, or we miss narrow-bandwidth spikes
    for (var j = 0; j< multiplier; j++)
        magnitude += freqByteData[offset + j];
    magnitude = magnitude / multiplier;
    var magnitude2 = freqByteData[i * multiplier];
    analyserContext.fillStyle = "hsl(" + Math.round((i*360)/numBars) + ", 100%, 50%)";
    analyserContext.fillRect(i * SPACING, canvas.height, BAR_WIDTH, -magnitude);
  }

  rafID = window.requestAnimationFrame(function() {
    updateAnalysers(canvas, analyserNode);
  });
}

function cancelAnalyserUpdates() {
  window.cancelAnimationFrame(rafID);
  rafID = null;
}

function gotStream(stream) {
  inputPoint = audioContext.createGain();

  // Create an AudioNode from the stream.
  realAudioInput = audioContext.createMediaStreamSource(stream);
  audioInput = realAudioInput;
  audioInput.connect(inputPoint);

  var analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 2048;
  inputPoint.connect(analyserNode);

  audioRecorder = new Recorder(inputPoint);

  var zeroGain = audioContext.createGain();
  zeroGain.gain.value = 0.0;
  inputPoint.connect(zeroGain);
  zeroGain.connect(audioContext.destination);

  var canvas = document.getElementById('microphone-analyser');
  updateAnalysers(canvas, analyserNode);
}

// creates a buffer from a file, callback is a function of the newly created buffer
function bufferFromFile(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    callback(e.target.result);
  };
  reader.readAsArrayBuffer(file);
}

function handleFileInput() {
  var fileInput = document.querySelector('.file-input');

  fileInput.addEventListener('change', onNewFile);
}

function onNewFile(e) {
  var file = e.target.files[0];

  bufferFromFile(file, function(buffer) {
    audioContext.decodeAudioData(buffer, function(audioBuffer) {
      var source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      var analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      source.connect(analyserNode);

      var zeroGain = audioContext.createGain();
      zeroGain.gain.value = 0.0;
      source.connect(zeroGain);
      // source.connect(audioContext.destination);
      updateAnalysers(document.getElementById('file-analyser'), analyserNode);
      source.start(0);
    });
  });
}

function handleRecordButton() {
  var recordButton = document.getElementById('record');
  recordButton.addEventListener('click', toggleRecording);
}

function handleMicrophoneInput() {
  navigator.getUserMedia({
    "audio": {
      "mandatory": {
        "googEchoCancellation": "false",
        "googAutoGainControl": "false",
        "googNoiseSuppression": "false",
        "googHighpassFilter": "false"
      },
      "optional": []
    },
  }, gotStream, function(e) {
    alert('Error getting audio');
    console.log(e);
  });
}

function main() {
  if (!navigator.getUserMedia) {
    navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  }
  if (!navigator.cancelAnimationFrame) {
    navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
  }
  if (!navigator.requestAnimationFrame) {
    navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;
  }

  handleRecordButton();
  handleFileInput();
  handleMicrophoneInput();
}

document.addEventListener('DOMContentLoaded', main);
