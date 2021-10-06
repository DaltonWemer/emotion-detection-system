import os
import logging
import pickle
import datetime
from array import array
from struct import pack
from sklearn.neural_network import MLPClassifier
from utils import extract_feature

# Setup Logging
formatter = logging.Formatter("\n\n%(asctime)s\n%(message)s")


def setup_logger(name, log_file, level=logging.INFO):

    handler = logging.FileHandler(log_file)
    handler.setFormatter(formatter)

    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.addHandler(handler)

    return logger


# use: `errorLogger.error("meesage")`
errorLogger = setup_logger('error', 'records/errors.log')

# use: `eventLogger.info("meesage")`
eventLogger = setup_logger('event', 'records/events.log')


if __name__ == "__main__":

    # load the saved model (after training)
    try:
        model = pickle.load(
            open("./external_programs/result/mlp_classifier.model", "rb"))
    except Exception as e:
        errorLogger.error(
            "~Failed to load classifier model\n" + str(e), exc_info=True)

    try:
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, '../records/recording.wav')
    except Exception as e:
        errorLogger.error(
            "~Failed to join recording path\n" + str(e), exc_info=True)

    # extract features and reshape it
    try:
        features = extract_feature(
            filename, mfcc=True, chroma=True, mel=True).reshape(1, -1)
    except Exception as e:
        errorLogger.error("~Failed to process audio\n" + str(e), exc_info=True)

    # predict
    try:
        result = model.predict(features)[0]
    except Exception as e:
        errorLogger.error("~Failed to make prediction\n" +
                          str(e), exc_info=True)

    # write the result for reading by electron
    try:
        file = open("records/result.txt", "w")
        file.write(result)
        file.close()
    except Exception as e:
        errorLogger.error(
            "~Failed to write classification result to file\n" + str(e), exc_info=True)

    # move recording to archive and log run
    try:
        formattedDate = datetime.datetime.now().strftime("%b-%d-%Y_%H-%M-%S")
        newFilename = "../records/archive/" + formattedDate + ".wav"
        archivedFilename = os.path.join(dirname, newFilename)
        os.rename(filename, archivedFilename)
        eventLogger.info("Classification Result: " + result +
                         "\nArchived File Name: " + formattedDate + ".wav")
    except Exception as e:
        errorLogger.error(
            "~Failed to archive recording\n" + str(e), exc_info=True)
