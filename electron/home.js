// Core Electron Packages and Third Party Libraries
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

//Global Variables
var child;
var audioInputSelect;

// Function called before DOM renders
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

    // Hide the loading animation when not processing any data
    document.getElementById("loadingAnimation").style.display = "none"

    // Create select options for mics on system
    navigator.mediaDevices.getUserMedia({ audio: true });
    navigator.mediaDevices.enumerateDevices()
        .then(function (devices) {
            audioInputSelect = document.getElementById("microphone-select");
            let usedGroupIds = [];
            devices.forEach(function (device) {
                // Filter out video devices and duplicates
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

// Load the rest of the animations that can't be visible directly after the software launches
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

    // Load Fearful Animation
    lottie.loadAnimation({
        container: document.getElementById('error-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/error.json'
    })

}

// Check the error directory and display the error animation and message 
// if a new file gets added to it
async function watchForError() {
    fs.watch(error_log_path, (eventType, filename) => {
        if (eventType == 'change') {
            document.getElementById("loadingAnimation").style.display = "none"
            document.getElementById("error-result-container").style.display = 'flex';
        }
    });
}

// Watch the .txt file that we use to hold the result, when it updates we read the file's word into
// a variable and render the corresponding text and animation. 
async function watchForAndDisplayResult() {
    fs.watch(result_path, (eventType, filename) => {
        if (eventType == 'change') {
            // Hide the loading animation when classification completes
            document.getElementById("loadingAnimation").style.display = "none"
            document.getElementById("start_code").style.pointerEvents = 'auto';

            let fileContents = fs.readFileSync(result_path, { encoding: 'utf-8' });

            // Render emotion containers based on the result in the .txt file
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

// Denotes when a specific log is coming from our front end (Javascript) or backend (Python)
function print_both(str) {
    console.log('Javascript: ' + str);
}

// Logs errors to the console as they occur
function log_error(str) {
    dataLogger.error("\n\r\n\rError: " + str);
}

// Logs data to the console as the data as computed
function log_data(str) {
    dataLogger.log("\n\r\n\r" + str);
}

// Used for testing sending data back to our Python backend, it a useful developer tool
// but is not interactable using the GUI by the user
function send_to_program(str) {
    child.stdin.write(str);
    child.stdout.on('data', function (data) {
        print_both('Following data has been piped from python program: ' + data.toString('utf8'));
    });
}

// Starts Python program execution from within javascript, will log if there are any issues
// in reaching out to our backend
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

// Sends string data to a Python program, not reachable by the end user
// can be useful for future development.
function send_code_function(evt) {
    let string_to_send = document.getElementById("string_to_send").value;
    print_both('Sending "' + string_to_send + '" to program:');
    send_to_program(string_to_send);
}

// Sends termination message to python program and closed stream
// that recieves information from it.
function stop_code_function(evt) {
    print_both('Terminated program');
    send_to_program("terminate");
    child.stdin.end();
}

// Requests OS to open a file explorer to recording archive
function open_file_function(evt) {
    var path = open_file_path;


    openExplorer(path, err => {
        if (err) {
            log_error("ELECTRON: Error requesting OS to open a file explorer to recording archive: " + err);
        }
        else {
            //Do Something
        }
    });
}

// Creates the asynchronous promise that is used in our timer function
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// Timer starts at 5 and counts down until the timer hits 1,updating every second
// used to show the user how much time they have 
// left in their recording before the system
// begins classifying the audio
function startTimer() {
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

// Starts recording the audio file that will be sent to the audio processor
async function startRecording() {

    //Plays audio alerting the user that the recording has started
    var audio = new Audio('./img/retone.mp3');

    // Hide all possible results
    document.getElementById("sad-result-container").style.display = 'none';
    document.getElementById("angry-result-container").style.display = 'none';
    document.getElementById("fearful-result-container").style.display = 'none';
    document.getElementById("normal-result-container").style.display = 'none';
    document.getElementById("happy-result-container").style.display = 'none';
    document.getElementById("error-result-container").style.display = 'none';
    // Play the recording tone
    audio.play();
    // Don't start recording until the audio clip has finished playing

    await sleep(400); //audio clip is 360 milliseconds

    // Filter out webcams from our media and choose mic
    let audioSource = audioInputSelect.value;
    
    var mediaConstraints = {
        audio: { deviceId: audioSource }
    };

    // Confirm that our electron app has access to the desired microphone
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
    // If we have access to the microphone, create the MediaStreamRecorder and start recording
    function onMediaSuccess(stream) {
        var mediaRecorder = new MediaStreamRecorder(stream);
        //console.log("recording with: " + mediaConstraints.audio.deviceId);

        // Set our paramemeters for our audio recording
        mediaRecorder.mimeType = 'audio/wav';
        mediaRecorder.audioChannels = 1;
        mediaRecorder.sampleRate = 48000;

        // Start timer for recording
        startTimer();
        
        // Display the recording animation
        document.getElementById("recordingAnimation").style.display = "block";
        isRecording = true;
        document.getElementById("start_code").style.pointerEvents = 'none';

        mediaRecorder.ondataavailable = function (blob) {
            var blobURL = URL.createObjectURL(blob);
            mediaRecorder.stop();
            saveAudioBlob(blob, audio_recording_path)
            // Hide the recording animation
            document.getElementById("recordingAnimation").style.display = "none";
            // Show the loading animation
            document.getElementById("loadingAnimation").style.display = "block"

            // Update the text to show the record functionality
            document.getElementById("buttonText").innerHTML = "Record";
            start_code_function();
        };

        // Recorder is in miliseconds, so record for 5 seconds
        mediaRecorder.start(5 * 1000);
    }

    // If something goes wrong in the recording process, the system will log 
    // it to the console
    function onMediaError(e) {
        console.error('media error', e);
    }
}

// Update the audio file with the new data returned by the media recorder
function bufferToStream(buffer) {
    let stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

// Save the audio file once the recording in progress and pushes 
// the blob into permenant storage
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

// Even listeners for the start recording button and open file system
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("start_code").addEventListener("click", startRecording);
    document.getElementById("open_file").addEventListener("click", open_file_function);
});

