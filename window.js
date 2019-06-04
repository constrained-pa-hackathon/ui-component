/* global $ */
var $ = global.jQuery = require('./jquery-3.2.1.js')
/* global $ */

var stt_text = "Get the frequency of pirates 1";
var command = { "action": "get", "subject": "frequency", "params": { "callsign": "pirates", "number": "1" } }
var tts_text //= "Frequency of pirates 1 is 305.25"

var replySoundBuffer= null // Holds the sound file for the last reply
var context

// Run this function after the page has loaded
$(() => {

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
    document.getElementById('recordBtn').addEventListener('click', function () {

        // TODO: Clear variables and GUI
        $("#stt-result").text(stt_text)
        $("#intention-result").text(JSON.stringify(command, null, "\t"))
        $("#tts-to-be-synthesized").text(tts_text)
        /////
        let prev_background = this.style.background;
        this.style.background = 'red'
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // const mediaRecorder = new MediaRecorder(stream);
                // mediaRecorder.start();
                // const audioChunks = [];
                //
                // mediaRecorder.addEventListener("dataavailable", e => {
                //     audioChunks.push(e.data);
                // });
                //
                // mediaRecorder.addEventListener("stop", () => {
                //     console.log("Finished listening");
                //     const audioBlob = new Blob(audioChunks, { type: "audio/wav; codec=PCM" });
                //     console.log("Finished creating blob");
                //     const audioUrl = URL.createObjectURL(audioBlob);
                //     const audio = new Audio(audioUrl);
                //     var formData = new FormData();
                //     formData.append('sentence_audio', audioBlob);
                //     $.ajax({
                //         url: "http://localhost:4444/speech_to_text",
                //         type: "POST",
                //         data: formData,
                //         processData: false,
                //         contentType: false,
                //         success : function(data, status) {
                //             console.log("Sent data as ${data}")
                //         }
                //     }
                //     )
                //
                //     audio.play();
                //     // new Response(audioBlob).arrayBuffer().then(
                //     //     () => {
                //     //         formData1 = {"sentence_audio": 1}
                //     //         var formData = new FormData().append('sentence_audio', 1)
                //     //         $.ajax({
                //     //             url: "http://localhost:4444/speech_to_text",
                //     //             type: "POST",
                //     //             data: formData,
                //     //             processData: false,
                //     //             contentType: "multipart/formdata",
                //     //             success : function(data, status) {
                //     //                 console.log("Sent data as ${data}")
                //     //             }
                //     //         }
                //     //         )
                //     //     })
                //     });
                //
                // setTimeout(() => {
                //     mediaRecorder.stop();
                //     document.getElementById('recordBtn').style.background = prev_background
                // }, 3000);

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
                setTimeout(() => {
                        rec.stop();
                        console.log("Recording stopped")
                        document.getElementById('recordBtn').style.background = prev_background
                        rec.exportWAV((blob) => {
                            var fd = new FormData();
                            fd.append("sentence-audio", blob);
                            $.ajax({
                                                url: "http://localhost:4444/speech_to_text",
                                                type: "POST",
                                                data: fd,
                                                processData: false,
                                                contentType: false,
                                                success : function(data, status) {
                                                    console.log("Sent data as ${data}")
                                                }
                                            }
                                            )
                        });
                    }, 3000);
            });
        /*
              get_response(command, function(jsonObj) {
                $("#tts-to-be-synthesized").text(jsonObj.text)

                get_synth_tts(jsonObj.text, function(buff) {
                  var source = context.createBufferSource(); // creates a sound source
                  source.buffer = buff;                      // tell the source which sound to play
                  source.connect(context.destination);       // connect the source to the context's destination (the speakers)
                  source.start(0);                           // play the source now
                                                             // note: on older systems, may have to use deprecated noteOn(time);
                })
              })*/
    });
})

function get_response(jsonObj, cb)
{
    var oReq = new XMLHttpRequest();
    oReq.open("POST", "http://127.0.0.1:3000/response", true);
    oReq.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    oReq.onload = function (oEvent) {
        cb(JSON.parse(oReq.response))
    };

    oReq.send(JSON.stringify(jsonObj));
}

function get_synth_tts(text, cb) {

    var oReq = new XMLHttpRequest();
    oReq.open("POST", `http://127.0.0.1:3000/synth?text=${text}`, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function (oEvent) {
        context.decodeAudioData(oReq.response, function(buffer) {

            cb(buffer)

            replySoundBuffer = buffer;
        }, null); // todo: onError
    };

    oReq.send(null);
}
