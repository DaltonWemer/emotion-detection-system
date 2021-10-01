import pyaudio
import os
import wave
import pickle
from sys import byteorder
from array import array
from struct import pack
from sklearn.neural_network import MLPClassifier
import webbrowser
from utils import extract_feature


if __name__ == "__main__":
    # load the saved model (after training)
    model = pickle.load(
        open("./external_programs/result/mlp_classifier.model", "rb"))
    # print("Please talk")
    # filename = "test.wav"
    # record the file (start talking)
    # record_to_file(filename)
    # extract features and reshape it
    dirname = os.path.dirname(__file__)
    filename = os.path.join(dirname, '../recordings/recording.wav')
    features = extract_feature(
        filename, mfcc=True, chroma=True, mel=True).reshape(1, -1)
    # predict
    result = model.predict(features)[0]
    # show the result !
    file = open("result.txt", "w")
    file.write(result)
    file.close()
    webbrowser.open("result.txt")
