import sys
import os
import numpy as np
import matplotlib.pyplot as plt
from scipy.io import wavfile
from python_speech_features import mfcc, logfbank

dirname = os.path.dirname(__file__)
filename = os.path.join(dirname, '../recordings/recording.wav')

frequency_sampling, audio_signal = wavfile.read(filename)

audio_signal = audio_signal[:15000]

features_mfcc = mfcc(audio_signal, frequency_sampling)

print('\nMFCC:\nNumber of windows =', features_mfcc.shape[0])
print('Length of each feature =', features_mfcc.shape[1])


features_mfcc = features_mfcc.T
plt.matshow(features_mfcc)
plt.title('MFCC')

filterbank_features = logfbank(audio_signal, frequency_sampling)

print('\nFilter bank:\nNumber of windows =', filterbank_features.shape[0])
print('Length of each feature =', filterbank_features.shape[1])

filterbank_features = filterbank_features.T
plt.matshow(filterbank_features)
plt.title('Filter bank')
plt.show()

# or you may use this code to extract the feature

# import numpy as np
# from sklearn import preprocessing
# import python_speech_features as mfcc

# def extract_features(audio,rate):
# """extract 20 dim mfcc features from an audio, performs CMS and combines
# delta to make it 40 dim feature vector"""

#         mfcc_feature = mfcc.mfcc(audio,rate, 0.025, 0.01,20,nfft = 1200, appendEnergy = True)
#         mfcc_feature = preprocessing.scale(mfcc_feature)
#         delta = calculate_delta(mfcc_feature)
#         combined = np.hstack((mfcc_feature,delta))
#         return combined
