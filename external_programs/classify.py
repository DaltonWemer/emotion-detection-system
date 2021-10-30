import os
import logging
import pickle
import datetime
import soundfile as sf
import librosa
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
    # Used for logging
    startTime = datetime.datetime.now()

    # load the saved model (after training)
    try:
        model = pickle.load(
        open("./external_programs/result/mlp_classifier.model", "rb"))
    except Exception as e:
        errorLogger.error(
            "~Failed to load classifier model\n" + str(e), exc_info=True)
        exit()

    try:
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, '../records/recording.wav')
        PRfilename = os.path.join(dirname, '../records/archive/processed/recording.wav')
    except Exception as e:
        errorLogger.error(
            "~Failed to join recording path\n" + str(e), exc_info=True)
        exit()

    # extract features and reshape it
    try:
        features = extract_feature(filename, mfcc=True, chroma=True, mel=True).reshape(1, -1)
    except Exception as e:
        errorLogger.error("~Failed to process audio\n" + str(e), exc_info=True)
        exit()

    # predict 
    try:
        result = model.predict(features)[0]
        
        # Used for logging
        endTime = datetime.datetime.now()
        
    except Exception as e:
        errorLogger.error("~Failed to make prediction\n" +
                          str(e), exc_info=True)
        exit()

    # write the result for reading by electron
    try:
        file = open("records/result.txt", "w")
        file.write(result)
        file.close()
    except Exception as e:
        errorLogger.error(
            "~Failed to write classification result to file\n" + str(e), exc_info=True)
        exit()

    # move recording to archive/raw and log run
    # rename processed recording in archive/processed
    try:
        formattedDate = datetime.datetime.now().strftime("%b-%d-%Y_%H-%M-%S")

        newFilename = "../records/archive/raw/" + formattedDate + "-raw.wav"
        newPRFilename = "../records/archive/processed/" + formattedDate + "-processed.wav"

        archivedFilename = os.path.join(dirname, newFilename)
        processedFilename = os.path.join(dirname, newPRFilename)
        os.rename(filename, archivedFilename)
        os.rename(PRfilename, processedFilename)

        eventLogger.info("Classification Result: " + result +
                         "\nArchived File Name: " + formattedDate + ".wav")
                         
    except Exception as e:
        errorLogger.error(
            "~Failed to archive recording\n" + str(e), exc_info=True)
        exit()
    
    # Create successful log, to be found in records/archive/result_logs
    try:
        logname = os.path.join(dirname, '../records/archive/result_logs/' + formattedDate + '.txt')
        # classificationTime = datetime.timedelta(startTime, endTime)
        delta = endTime - startTime
        # delta = endTime - datetime.timedelta(delta)

        y, sr = librosa.load("./records/archive/raw/" + formattedDate + "-raw.wav")
        rawDur = librosa.get_duration(y=y, sr=sr)

        y1, sr1 = librosa.load("./records/archive/processed/" + formattedDate + "-processed.wav")
        procDur = librosa.get_duration(y=y1, sr=sr1)

        file = open(logname, "a+")
        file.write("Classification Date and Time: " + formattedDate + 
                "\nClassification Result: " + result + 
                "\nTime to Process: " + str(delta.total_seconds()) + " seconds" +
                "\nRaw Recording: " + "records/archive/raw/" + formattedDate + "-raw.wav" +
                "\nProcessed Recording: " + "records/archive/processed/" + formattedDate + "-processed.wav" +
                "\nRaw recording Length: " + str(rawDur) + " seconds" +
                "\nProcessed Recording Length: " + str(procDur) + " seconds")
                #"\nClassifier Model Data: " +
                #"\nAlpha Value:\t" + str(model.alpha) +
                #"\nBatch Size:\t" + str(model.batch_size) +
                #"\nHidden Layer Sizes:\t" + str(model.hidden_layer_sizes) +
                #"\nLearning Rate:\t" + str(model.learning_rate) +
                #"\nMax Iterations:\t" + str(model.max_iter))
        file.close()
        eventLogger.info("\nSpecific classification log: result_logs/" +  formattedDate + ".txt")
        
    except Exception as e:
        errorLogger.error("~Failed to create a log for successful classification\n" + str(e), exc_info=True)
        exit()
