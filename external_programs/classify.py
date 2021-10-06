import os
import logging
import pickle
import datetime
from array import array
from struct import pack
from sklearn.neural_network import MLPClassifier
from utils import extract_feature
from utils import configure_log


if __name__ == "__main__":
    configure_log()
    # load the saved model (after training)
    try:
        model = pickle.load(
            open("./external_programs/result/mlp_classifier.model", "rb"))
    except Exception as e:    
        logger.error("~Error: Failed to load classifier model\n"+ str(e) + "\n", exc_info=True)
        exit()

    # print("Please talk")
    # filename = "test.wav"
    # record the file (start talking)
    # record_to_file(filename)
    # extract features and reshape it
    try:
        features = extract_feature(
            filename, mfcc=True, chroma=True, mel=True).reshape(1, -1)
    except Exception as e:
        logging.error("~Error: Failed to process audio\n" + str(e) + "\n", exc_info=True)
        exit()

    # predict
    try:
        result = model.predict(features)[0]
    except Exception as e:
        logging.error("~Error: Failed to make prediction\n" + str(e) + "\n", exc_info=True)
        exit()

    # write the result for reading by electron
    try:
        file = open("records/result.txt", "w")
        file.write(result)
        file.close()
    except Exception as e:
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

        errorLogger.error(