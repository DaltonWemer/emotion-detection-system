import soundfile
import numpy as np
import librosa
import glob
import os
import noisereduce
from scipy import signal as sg
from sklearn.model_selection import train_test_split

AVAILABLE_EMOTIONS = {
    "angry",
    "fearful",
    "happy",
    "normal",
    "sad"
}

# make it easier to adjust directory paths
directoryToTrainOver = "ourData/*.wav"

# Using scipy's butterworth filter to highpass frequencies


def highPassFilterStage(signal, sampleRate, cutoff=120.):
    b, a = sg.butter(6, cutoff / (sampleRate / 2.), 'highpass', analog=False)
    filteredSignal = sg.filtfilt(b, a, signal)
    return filteredSignal


# Using denoise library to denoise the signal


def denoiseStage(signal, sampleRate):
    # time_constant_s is the time (sec) to compute the noise floor, increased from 1 to 4 for better results
    return noisereduce.reduce_noise(y=signal, sr=sampleRate, stationary=False, time_constant_s=4.0)


# Use librosa to cut off silent sections before and after the voice command


def trimStage(signal, samplePad=10000, threshold=25):
    trimmedSignal, index = librosa.effects.trim(
        signal, top_db=threshold, frame_length=256, hop_length=64)
    # Add constant padding of samples before and after the non-silent indexes
    beginningPadCheck = index[0] - samplePad
    endingPadCheck = index[1] + samplePad
    numSamples = len(signal) - 1

    # Ensure that padding does not exceed the buffer
    # We cannot have a negative starting index, so make it zero. If its positive, keep it as it is.
    if (beginningPadCheck < 0):
        beginningIndex = 0
    else:
        beginningIndex = beginningPadCheck

    # We cannot have an ending index greater than the length of the buffer; In this case, return the last index of
    # the buffer.
    if (endingPadCheck > numSamples):
        endingIndex = numSamples
    else:
        endingIndex = endingPadCheck

    # Return the trimmed signal with padding to prevent slight cutoff in commands
    return signal[beginningIndex:endingIndex]


# Use this function for processing if you already have the signal loaded using librosa


def processPreloadedAudio(inputSignal, inputSignalSampleRate):
    highPassedInputSignal = highPassFilterStage(
        inputSignal, inputSignalSampleRate)
    denoisedSignal = denoiseStage(highPassedInputSignal, inputSignalSampleRate)
    processedSignal = trimStage(denoisedSignal)
    return processedSignal, inputSignalSampleRate


def extract_feature(file_name, **kwargs):

    # set features to be extracted
    mfcc = kwargs.get("mfcc")
    chroma = kwargs.get("chroma")
    mel = kwargs.get("mel")
    contrast = kwargs.get("contrast")
    tonnetz = kwargs.get("tonnetz")

    inputSignal, inputSignalSampleRate = librosa.load(file_name, sr=None)

    # audio processing stages invoked here
    X, sample_rate = processPreloadedAudio(inputSignal, inputSignalSampleRate)

    # save processed sig
    soundfile.write("./records/archive/processed/recording.wav", X, sample_rate)

    if chroma or contrast:
        stft = np.abs(librosa.stft(X))
        result = np.array([])
    if mfcc:
        mfccs = np.mean(librosa.feature.mfcc(
            y=X, sr=sample_rate, n_mfcc=40).T, axis=0)
        result = np.hstack((result, mfccs))
    if chroma:
        chroma = np.mean(librosa.feature.chroma_stft(
            S=stft, sr=sample_rate).T, axis=0)
        result = np.hstack((result, chroma))
    if mel:
        mel = np.mean(librosa.feature.melspectrogram(
            X, sr=sample_rate).T, axis=0)
        result = np.hstack((result, mel))
    if contrast:
        contrast = np.mean(librosa.feature.spectral_contrast(
            S=stft, sr=sample_rate).T, axis=0)
        result = np.hstack((result, contrast))
    if tonnetz:
        tonnetz = np.mean(librosa.feature.tonnetz(
            y=librosa.effects.harmonic(X), sr=sample_rate).T, axis=0)
        result = np.hstack((result, tonnetz))

    return result


def load_data(test_size=0.2):
    X, y = [], []
    for file in glob.glob(directoryToTrainOver):  # value set at top of file
        basename = os.path.basename(file)
        emotion = basename.split("-")[1]
        if emotion not in AVAILABLE_EMOTIONS:
            continue
        features = extract_feature(file, mfcc=True, chroma=True, mel=True)
        X.append(features)
        y.append(emotion)
    return train_test_split(np.array(X), y, test_size=test_size, random_state=7)
