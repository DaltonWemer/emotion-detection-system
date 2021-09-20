const ipc = require('electron').ipcRenderer;
var MediaStreamRecorder = require('msr');
var lottie = require('lottie-web');

// const exec = require('child_process').exec;
const exec = require('child_process').exec;

var nodeConsole = require('console');
var my_console = new nodeConsole.Console(process.stdout, process.stderr);
var child;

window.onload = function() {
    console.log('Load is now called!')
    // Load our recording animation into memory
    lottie.loadAnimation({
        container: document.getElementById('recordingAnimation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'img/recorder.json'
    })
    document.getElementById("recordingAnimation").style.display = "none" 
}


function print_both(str) {
    console.log('Javascript: ' + str);
    my_console.log('Javascript: ' + str);
}

function send_to_program(str) {
    child.stdin.write(str);
    child.stdout.on('data', function(data) {
        print_both('Following data has been piped from python program: ' + data.toString('utf8'));
    });
}

// starts program execution from within javascript and
function start_code_function(evt) {
    print_both('Initiating program');
    child = exec("python -i ./external_programs/python_example.py ", function(error, stdout, stderr) {
        if (error !== null) {
            print_both('exec error: ' + error);
        }
    });

    child.stdout.on('data', function(data) {
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

// requests main.js to open a file from the filesystem
function open_file_function(evt) {
    print_both('From gui_example.js sending a request to main.js via ipc');
    ipc.send('open_json_file');
}

async function checkDevice(constraints) {
    let stream = null;
  
    navigator.mediaDevices.getUserMedia({ audio: true, video: false})
    .then(function(stream) {
       /* use the stream */ 
       console.log(stream)
    })
    .catch(function(err) {
       /* handle the error */
       console.log(err)
    });
  }

  let chunks = []
  isRecording = false

  function startRecording(){
    // Filter out webcams from our media
    var mediaConstraints = {
        audio: true
    };
    
    // Confirm that our electron app has access to the desired microphone
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
    
    // If we have access to the microphone, create the MediaStreamRecorder and start recording
    function onMediaSuccess(stream) {
        var mediaRecorder = new MediaStreamRecorder(stream);
        mediaRecorder.mimeType = 'audio/wav'; // check this line for audio/wav

        document.getElementById("recordingAnimation").style.display = "block" 
        isRecording = true

        //Plays audio alerting the user that the recording has started
        var audio = new Audio('./img/retone.mp3');
        audio.play();

        mediaRecorder.ondataavailable = function (blob) {
            var blobURL = URL.createObjectURL(blob);
            mediaRecorder.stop();
            mediaRecorder.save();    
            document.getElementById("recordingAnimation").style.display = "none" 

        };

        // Recorder is in miliseconds 
        mediaRecorder.start(5 * 1000);

        // mediaRecorder.onstop = function() {
        //     mediaRecorder.save();
        // };
    }
    
    
    
    function onMediaError(e) {
        console.error('media error', e);
    }
  }


  

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("start_code").addEventListener("click", startRecording);
    document.getElementById("mircophone").addEventListener("click", checkDevice);
    document.getElementById("send_code").addEventListener("click", send_code_function);
    document.getElementById("stop_code").addEventListener("click", stop_code_function);
    document.getElementById("open_file").addEventListener("click", open_file_function);
});

