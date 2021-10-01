import pyaudio
import os
import logging
import wave
import pickle
from sys import byteorder
from array import array
from struct import pack
from sklearn.neural_network import MLPClassifier
import webbrowser
from utils import extract_feature


if __name__ == "__main__":

    logging.basicConfig(filename="recordings/archive/fileLogTest.txt", format="%(asctime)s Error Message: %(message)s\n")

    # load the saved model (after training)!
    try:
        model = pickle.load(
            open("./external_programs/result/mlp_classifier.model", "rb"))
    except Exception as e:
        logging.error("~Error: Failed to load classifier model\n" + e, exc_info=True)

    # print("Please talk")
    # filename = "test.wav"
    # record the file (start talking)
    # record_to_file(filename)
    # extract features and reshape it
    dirname = os.path.dirname(__file__)
    filename = os.path.join(dirname, '../recordings/recording.wav')
    try:
        features = extract_feature(
            filename, mfcc=True, chroma=True, mel=True).reshape(1, -1)
    except Exception as e:
        logging.error("~Error: Failed to process audio\n" + e, exc_info=True)

    # predict
    try:
        result = model.predict(features)[0]
    except Exception as e:
        logging.error("~Error: Failed to make prediction\n" + e, exc_info=True)

    # show the result !
    file = open("result.txt", "w")
    file.write(result)
    file.close()
    webbrowser.open("result.txt")
