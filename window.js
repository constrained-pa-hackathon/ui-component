/* global $ */

var replySoundBuffer = null // Holds the sound file for the last reply
var context
var rec

// Run this function after the page has loaded
$(() => {

  var prev_background = $('#recordBtn').css('background-color');
  console.log(prev_background)
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  context = new AudioContext();
  document.getElementById('recordBtn').addEventListener('mousedown', function () {

    $("#stt-result").text("wait...")
    $("#intention-result").text("wait...")
    $("#tts-to-be-synthesized").text("wait...")

    /////
    $('#recordBtn').css('background-color', "red")
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {

        /* assign to gumStream for later use */
        gumStream = stream;
        /* use the stream */
        audioContext = new AudioContext()
        input = audioContext.createMediaStreamSource(stream);
        /* Create the Recorder object and configure to record mono sound (1 channel) Recording 2 channels will double the file size */
        rec = new Recorder(input, {
          numChannels: 1
        })
        //start the recording process
        rec.record()
        console.log("Recording started");
      });
  })

  /**
   * This function should be the callback of a finished STT process
   * @param {*} stt_text The result of the STT process.
   */
  function onFinishedStt(stt_text) {
    $("#stt-result").text(stt_text)

    get_command_json(stt_text, function (command) {
      $("#intention-result").text(JSON.stringify(command, null, "\t"))

      get_response(command, function (responseText) {
        $("#tts-to-be-synthesized").text(responseText.text)

        get_synth_tts(responseText.text, function (buff) {
          var source = context.createBufferSource(); // creates a sound source
          source.buffer = buff;                      // tell the source which sound to play
          source.connect(context.destination);       // connect the source to the context's destination (the speakers)
          source.start(0);                           // play the source now
          // note: on older systems, may have to use deprecated noteOn(time);
        })
      })
    })
  }

  /**
   * Send a request to the intention detection server.
   * The server responds with a json containing the command
   * requested by the user.
   * @param {*} sentence The user input text after STT.
   * @param {*} cb 
   */
  function get_command_json(sentence, cb) {
    var oReq = new XMLHttpRequest();
    oReq.open("POST", "http://52.166.69.21:5000/parse_sentence", true);
    oReq.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    oReq.onload = function (oEvent) {
      cb(JSON.parse(oReq.response))
    };

    oReq.send(`sentence=${sentence}`);
  }


  /**
   * Send the intention command to the respond generator
   * and receive the respond from it.
   * @param {*} jsonObj 
   * @param {*} cb 
   */
  function get_response(jsonObj, cb) {
    var oReq = new XMLHttpRequest();
    // TODO: IP and PORT should be parameters
    oReq.open("POST", "http://52.166.69.21:3000/response", true);
    oReq.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    oReq.onload = function (oEvent) {
      cb(JSON.parse(oReq.response))
    };

    oReq.send(JSON.stringify(jsonObj));
  }

  /**
   * Ask the TTS server to synthesize speech out of an input text.
   * @param {} text 
   * @param {*} cb 
   */
  function get_synth_tts(text, cb) {

    var oReq = new XMLHttpRequest();
    oReq.open("POST", `http://52.166.69.21:3000/synth?text=${text}`, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function (oEvent) {
      context.decodeAudioData(oReq.response, function (buffer) {

        cb(buffer)

        replySoundBuffer = buffer;
      }, null); // todo: onError
    };

    oReq.send(null);
  }



  document.getElementById('recordBtn').addEventListener('mouseup', function () {
    $('#recordBtn').css('background-color', prev_background)
    rec.stop();
    console.log("Recording stopped")
    document.getElementById('recordBtn').style.background = prev_background
    rec.exportWAV((blob) => {

      var fd = new FormData();
      fd.append("sentence-audio", blob);
      $.ajax({
        url: "http://52.166.69.21:4444/speech_to_text",
        type: "POST",
        data: fd,
        processData: false,
        contentType: false,
        success: function (data, status) {
          console.log(`Received data from stt: ${data}`)

          // TODO: Move this function into the appropriate place
          onFinishedStt(data.output_text);
        }
      })
    })
  })

})
