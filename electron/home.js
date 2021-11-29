const ipc = require('electron').ipcRenderer;
var MediaStreamRecorder = require('msr');
var lottie = require('lottie-web');
const openExplorer = require('open-file-explorer');
let { Readable } = require('stream');
const fs = require('fs');
const SimpleDateFormat = require('@riversun/simple-date-format');
const path = require('path');

// const exec = require('child_process').exec;
const exec = require('child_process').exec;

// Paths
const event_log_path = path.normalize('records/events.log');
const error_log_path = path.normalize('records/errors.log');
const open_file_path = path.normalize('./records');
const audio_recording_path = path.normalize('./records/recording.wav');
const result_path = path.normalize('./records/result.txt');
const audio_archive_path = path.normalize('./records/archive/');

// Setup Logging
const errOutput = fs.createWriteStream(error_log_path, {flags: 'a'});
const normOutput = fs.createWriteStream(event_log_path, {flags: 'a'});
const { Console } = require("console"); // Get Console class
const dataLogger = new Console(normOutput, errOutput); // create error Logger

var nodeConsole = require('console');
var my_console = new nodeConsole.Console(process.stdout, process.stderr);

//Global Vars
var child;
var audioInputSelect;

window.onload = function () {
    // Load our recording animation into memory
    lottie.loadAnimation({
        container: document.getElementById('recordingAnimation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/recorder.json'
    })
    document.getElementById("recordingAnimation").style.display = "none"

    lottie.loadAnimation({
        container: document.getElementById('loadingAnimation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/processing.json'
    })

    document.getElementById("loadingAnimation").style.display = "none"

    //Create select options for mics on system
    navigator.mediaDevices.getUserMedia({ audio: true });
    navigator.mediaDevices.enumerateDevices()
        .then(function (devices) {
            audioInputSelect = document.getElementById("microphone-select");
            let usedGroupIds = [];
            devices.forEach(function (device) {
                //filter out video devices and duplicates
                if (device.kind == "audioinput" && usedGroupIds.indexOf(device.groupId) == -1) {
                    usedGroupIds.push(device.groupId);
                    var option = document.createElement("option");
                    option.innerHTML = device.label;
                    option.value = device.deviceId;
                    audioInputSelect.appendChild(option);
                }
            });
        })

    watchForAndDisplayResult();
    watchForError();
    loadAllAnimations();
}

function loadAllAnimations(){
    // Load Sad Animation
    lottie.loadAnimation({
        container: document.getElementById('sad-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/sad.json'
    })

    // Load Anger Animation
    lottie.loadAnimation({
        container: document.getElementById('angry-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/angry.json'
    })

    // Load Happy Animation
    lottie.loadAnimation({
        container: document.getElementById('happy-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/happy.json'
    })

    // Load Normal Animation
    lottie.loadAnimation({
        container: document.getElementById('normal-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/normal.json'
    })

     // Load Fearful Animation
     lottie.loadAnimation({
        container: document.getElementById('fearful-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/fearful.json'
    })

}

async function watchForError() {
    fs.watch(error_log_path, (eventType, filename) => {
        if (eventType == 'change') {
            document.getElementById("loadingAnimation").style.display = "none"
        }
    });
}

async function watchForAndDisplayResult() {
    fs.watch(result_path, (eventType, filename) => {
        if (eventType == 'change') {
            document.getElementById("loadingAnimation").style.display = "none"
            document.getElementById("start_code").style.pointerEvents = 'auto';
            let fileContents = fs.readFileSync(result_path, { encoding: 'utf-8' });
            switch (fileContents) {
                case "angry":
                    document.getElementById("angry-result-container").style.display = 'flex';
                    break;
                case "happy":
                    document.getElementById("happy-result-container").style.display = 'flex';
                    break;
                case "fearful":
                    document.getElementById("fearful-result-container").style.display = 'flex';
                    break;
                case "normal":
                    document.getElementById("normal-result-container").style.display = 'flex';
                    break;
                case "sad":
                    document.getElementById("sad-result-container").style.display = 'flex';
                    break;
                default:
                    document.getElementById("result-container").style.backgroundColor = "#111111";
                    break;
            }
        }
    });
}

function print_both(str) {
    console.log('Javascript: ' + str);
}

function log_error(str) {
    dataLogger.error("\n\r\n\rError: " + str);
}

function log_data(str) {
    dataLogger.log("\n\r\n\r" + str);
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
    log_data("Recording in progress");
    child = exec("python3 ./external_programs/classify.py", function (error, stdout, stderr) {
        if (error !== null) {
            print_both('exec error: ' + error);
            log_error("ELECTRON ERROR: Error executing classify.py: " + error);
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
            log_error("ELECTRON: Error requesting OS to open a file explorer to recording archive: " + err);
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
var countDownDate = new Date();
countDownDate.setSeconds(countDownDate.getSeconds() + 5);



function startTimer(id, endtime) {
    var timeleft = 5;
    var recordingTimer = setInterval(function(){
      if(timeleft <= 0){
        clearInterval(recordingTimer);
      } else {
        document.getElementById("buttonText").innerHTML = timeleft;
      }
      timeleft -= 1;
    }, 1000);
}



function decrementTime(){
    display.textContent = seconds;
}

async function startRecording() {

    //Plays audio alerting the user that the recording has started
    var audio = new Audio('./img/retone.mp3');

    // Hide all possible results
    document.getElementById("sad-result-container").style.display = 'none';
    document.getElementById("angry-result-container").style.display = 'none';
    document.getElementById("fearful-result-container").style.display = 'none';
    document.getElementById("normal-result-container").style.display = 'none';
    document.getElementById("happy-result-container").style.display = 'none';

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
        mediaRecorder.sampleRate = 48000;

        // Start timer for recording
        startTimer();

        document.getElementById("recordingAnimation").style.display = "block";
        isRecording = true;

        document.getElementById("start_code").style.pointerEvents = 'none';

        mediaRecorder.ondataavailable = function (blob) {
            var blobURL = URL.createObjectURL(blob);
            mediaRecorder.stop();
            saveAudioBlob(blob, audio_recording_path)
            //mediaRecorder.save();
            document.getElementById("recordingAnimation").style.display = "none";
            document.getElementById("loadingAnimation").style.display = "block"

            document.getElementById("buttonText").innerHTML = "Record";
            start_code_function();
        };

        // Recorder is in miliseconds 
        mediaRecorder.start(5 * 1000);

        function stopRecording() {
            console.log("We do not want to stop")
            // mediaRecorder.stop();
        }
    }

    function onMediaError(e) {
        console.error('media error', e);
    }
}

function bufferToStream(buffer) {
    let stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

async function moveFile(oldPath, newPath) {
    if (!fs.existsSync(audio_archive_path)) {
        await fs.mkdir(path.dirname(newPath), { recursive: false }, (err) => {
            if (err) {
                print_both(err);
            }
        });
    }
    return fs.rename(oldPath, newPath, (err) => {
        if (err) {
            print_both(err);
        }
    });
}

saveAudioBlob = async function (audioBlobToSave, fPath) {
    print_both(`Trying to save: ${fPath}`);

    // create the writeStream - this line creates the 0kb file, ready to be written to
    const writeStream = fs.createWriteStream(fPath);
    const arrayBuffer = await audioBlobToSave.arrayBuffer(); // ArrayBuffer(17955) {}
    const array = new Uint8Array(arrayBuffer); // Uint8Array(17955) [26, 69, ... ]
    const buffer = Buffer.from(array); // Buffer(17955) [26, 69, ... ]
    let readStream = bufferToStream(buffer); // Readable {_readableState: ReadableState, readable: true, ... }

    // and now we can pipe:
    readStream.pipe(writeStream);
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("start_code").addEventListener("click", startRecording);
    document.getElementById("open_file").addEventListener("click", open_file_function);
});

