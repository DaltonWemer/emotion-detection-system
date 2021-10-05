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

logging.basicConfig(filename="recordings/archive/ErrorLog.txt", format="%(asctime)s %(levelname)s Message: %(message)s\n")
logger = logging.getLogger(__name__)

data_handler = logging.FileHandler("recordings/archive/DataLog.txt")
error_handler = logging.FileHandler("recordings/archive/ErrorLog.txt")
data_handler.setLevel(logging.DEBUG)
error_handler.setLevel(logging.WARNING)

data_format = logging.Formatter("Data Formatting Here. %(message)s") #TODO: Modify this to the correct format, and configure a NEW file for each call of classify.py.
error_format = logging.Formatter("\n%asctime)s %(levelname)s Message: %(message)s\n")

data_handler.setFormatter(data_format)
error_handler.setFormatter(error_format)

logger.addHandler(data_handler)
logger.addHandler(error_handler)

if __name__ == "__main__":
    # load the saved model (after training)
    try:
        a = 5/0
        model = pickle.load(
            open("./external_programs/result/mlp_classifier.model", "rb"))
    except Exception as e:    
        error_handler.error("~Error: Failed to load classifier model\n"+ str(e) + "\n", exc_info=True)
        data_handler.debug("~Testing Debug")
        exit()


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
        logging.error("~Error: Failed to process audio\n" + str(e) + "\n", exc_info=True)

    # predict
    try:
        result = model.predict(features)[0]
    except Exception as e:
        logging.error("~Error: Failed to make prediction\n" + str(e) + "\n", exc_info=True)

    # show the result !
    file = open("result.txt", "w")
    file.write(result)
    file.close()
    webbrowser.open("result.txt")