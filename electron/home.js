const ipc = require('electron').ipcRenderer;
var MediaStreamRecorder = require('msr');
var lottie = require('lottie-web');
const openExplorer = require('open-file-explorer');
let { Readable } = require('stream');
const fs = require('fs');

// const exec = require('child_process').exec;
const exec = require('child_process').exec;

var nodeConsole = require('console');
var my_console = new nodeConsole.Console(process.stdout, process.stderr);
var child;
var audioInputSelect;

const open_file_path = '.\\recordings';
const audio_recording_path = '.\\recordings\\recording.wav'

window.onload = function () {
    // Insert try catch here that calls log_error from utils.py when an error occurs
    // Load our recording animation into memory
    lottie.loadAnimation({
        container: document.getElementById('recordingAnimation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/recorder.json'
    })
    document.getElementById("recordingAnimation").style.display = "none"

    //Create select options for mics on system
    navigator.mediaDevices.getUserMedia({ audio: true });
    navigator.mediaDevices.enumerateDevices()
        .then(function (devices) {
            audioInputSelect = document.getElementById("microphone-select");
            let usedGroupIds = [];
            devices.forEach(function (device) {
                console.log(device);
                //filter out video devices and duplicates
                if (device.kind == "audioinput" && usedGroupIds.indexOf(device.groupId) == -1) {
                    usedGroupIds.push(device.groupId);
                    var option = document.createElement("option");
                    option.innerHTML = device.label;
                    option.value = device.deviceId;
                    audioInputSelect.appendChild(option);
                    console.log(device.label);
                }
            });
        })
}

function print_both(str) {
    console.log('Javascript: ' + str);
    my_console.log('Javascript: ' + str);
}

function send_to_program(str) {
    child.stdin.write(str);
    child.stdout.on('data', function (data) {
        print_both('Following data has been piped from python program: ' + data.toString('utf8'));
    });
}

// starts program execution from within javascript and
function start_code_function(evt) {
    print_both('Initiating program');
    child = exec("python ./external_programs/classify.py", function (error, stdout, stderr) {
        if (error !== null) {
            print_both('exec error: ' + error);
        }
    });

    child.stdout.on('data', function (data) {
        print_both('Calling Python Script ' + data.toString('utf8'));
    });
}

// sends data to program
function send_code_function(evt) {
    let string_to_send = document.getElementById("string_to_send").value;
    print_both('Sending "' + string_to_send + '" to program:');
    send_to_program(string_to_send);
}

// sends termination message to python program and closed stream
// that recieves information from it
function stop_code_function(evt) {
    print_both('Terminated program');
    send_to_program("terminate");
    child.stdin.end();
}

// requests os to open a file explorer to recording archive
function open_file_function(evt) {
    // print_both('From gui_example.js sending a request to main.js via ipc');
    // ipc.send('open_json_file');

    var path = open_file_path;
    //handle for different os 
    //if (macOS) { path = './' }
    //if (linux) { }

    openExplorer(path, err => {
        if (err) {
            console.log(err);
        }
        else {
            //Do Something
        }
    });
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

let chunks = []
isRecording = false

async function startRecording() {

    //Plays audio alerting the user that the recording has started
    var audio = new Audio('./img/retone.mp3');
    audio.play();
    await sleep(400); //audio clip is 360 milliseconds
    // Filter out webcams from our media and choose mic
    let audioSource = audioInputSelect.value;
    console.log(audioSource);
    var mediaConstraints = {
        audio: { deviceId: audioSource }
    };

    // Confirm that our electron app has access to the desired microphone
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
    // If we have access to the microphone, create the MediaStreamRecorder and start recording
    function onMediaSuccess(stream) {

        var mediaRecorder = new MediaStreamRecorder(stream);
        //console.log("recording with: " + mediaConstraints.audio.deviceId);

        mediaRecorder.mimeType = 'audio/wav'; // check this line for audio/wav
        mediaRecorder.audioChannels = 1;
        mediaRecorder.sampleRate = 44100;

        document.getElementById("recordingAnimation").style.display = "block"
        isRecording = true

        document.getElementById("start_code").innerHTML = "Stop"
        document.getElementById("start_code").removeEventListener("click", startRecording);
        document.getElementById("start_code").addEventListener("click", stopRecording);

        mediaRecorder.ondataavailable = function (blob) {
            var blobURL = URL.createObjectURL(blob);
            mediaRecorder.stop();
            saveAudioBlob(blob, audio_recording_path)
            //mediaRecorder.save();
            document.getElementById("recordingAnimation").style.display = "none"
            document.getElementById("start_code").removeEventListener("click", stopRecording);
            document.getElementById("start_code").addEventListener("click", startRecording);
            document.getElementById("start_code").innerHTML = "Record"
            start_code_function();
        };

        // Recorder is in miliseconds 
        mediaRecorder.start(5 * 1000);

        // mediaRecorder.onstop = function() {
        //     mediaRecorder.save();
        // };

        function stopRecording() {
            mediaRecorder.stop();
        }
    }

    function onMediaError(e) {
        console.error('media error', e);
    }
}

function delayInMilliseconds() {
    setTimeout(function () {
        return;
    }, delayInMilliseconds);
}

function bufferToStream(buffer) {
    let stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}


saveAudioBlob = async function (audioBlobToSave, fPath) {
    console.log(`Trying to save: ${fPath}`);
    // create the writeStream - this line creates the 0kb file, ready to be written to
    const writeStream = fs.createWriteStream(fPath);
    console.log(writeStream); // WriteStream {...}
    // The incoming data 'audioToSave' is an array containing a single blob of data.
    console.log(audioBlobToSave); // [Blob]
    // now we go through the following process: blob > arrayBuffer > array > buffer > readStream:
    const arrayBuffer = await audioBlobToSave.arrayBuffer(); // ArrayBuffer(17955) {}
    const array = new Uint8Array(arrayBuffer); // Uint8Array(17955) [26, 69, ... ]
    const buffer = Buffer.from(array); // Buffer(17955) [26, 69, ... ]
    let readStream = bufferToStream(buffer); // Readable {_readableState: ReadableState, readable: true, ... }
    // and now we can pipe:
    readStream.pipe(writeStream);
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("start_code").addEventListener("click", startRecording);
    //document.getElementById("mircophone").addEventListener("click", checkDevice);
    //document.getElementById("send_code").addEventListener("click", send_code_function);
    //document.getElementById("stop_code").addEventListener("click", stop_code_function);
    document.getElementById("open_file").addEventListener("click", open_file_function);
});

