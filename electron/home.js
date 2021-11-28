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
}

async function watchForError() {
    fs.watch(error_log_path, (eventType, filename) => {
        if (eventType == 'change') {
            document.getElementById("result").innerHTML = "error, check logs";
            document.getElementById("result-container").style.visibility = "visible";
            document.getElementById("result-container").style.backgroundColor = "#EE4B2B";
        }
    });
}

async function watchForAndDisplayResult() {
    fs.watch(result_path, (eventType, filename) => {
        if (eventType == 'change') {
            let fileContents = fs.readFileSync(result_path, { encoding: 'utf-8' });
            document.getElementById("result").innerHTML = fileContents;
            document.getElementById("result-container").style.visibility = "visible";
            switch (fileContents) {
                case "anger":
                    document.getElementById("result-container").style.backgroundColor = "#d62d20";
                    break;
                case "happy":
                    document.getElementById("result-container").style.backgroundColor = "#ffa700";
                    break;
                case "fearful":
                    document.getElementById("result-container").style.backgroundColor = "#962fbf";
                    break;
                case "normal":
                    document.getElementById("result-container").style.backgroundColor = "#ffffff";
                    break;
                case "sad":
                    document.getElementById("result-container").style.backgroundColor = "#0057e7";
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

async function startRecording() {

    //Plays audio alerting the user that the recording has started
    var audio = new Audio('./img/retone.mp3');
    document.getElementById("result-container").style.visibility = "hidden";
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

        document.getElementById("recordingAnimation").style.display = "block";
        isRecording = true;

        document.getElementById("start_code").innerHTML = "Stop";
        document.getElementById("start_code").removeEventListener("click", startRecording);
        document.getElementById("start_code").addEventListener("click", stopRecording);

        mediaRecorder.ondataavailable = function (blob) {
            var blobURL = URL.createObjectURL(blob);
            mediaRecorder.stop();
            saveAudioBlob(blob, audio_recording_path)
            //mediaRecorder.save();
            document.getElementById("recordingAnimation").style.display = "none";
            document.getElementById("start_code").removeEventListener("click", stopRecording);
            document.getElementById("start_code").addEventListener("click", startRecording);
            document.getElementById("start_code").innerHTML = "Record";
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

    // //move old audio file
    // let newFileName = new SimpleDateFormat("yyyy-MM-dd hh-mm-ss'.wav'").format(new Date());
    // let newPath = audio_archive_path + newFileName;
    // await moveFile(fPath, newPath);

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
    //document.getElementById("mircophone").addEventListener("click", checkDevice);
    //document.getElementById("send_code").addEventListener("click", send_code_function);
    //document.getElementById("stop_code").addEventListener("click", stop_code_function);
    document.getElementById("open_file").addEventListener("click", open_file_function);
});

