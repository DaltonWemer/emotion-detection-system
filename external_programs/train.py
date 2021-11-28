from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import accuracy_score, ConfusionMatrixDisplay, classification_report, plot_roc_curve, \
    RocCurveDisplay
from sklearn.metrics import confusion_matrix
from utils import load_data
import matplotlib.pyplot as plt
from sklearn.model_selection import RepeatedStratifiedKFold
import os
import pickle

X_train, X_test, y_train, y_test = load_data(test_size=0.25)
print("[+] Number of training samples:", X_train.shape[0])
print("[+] Number of testing samples:", X_test.shape[0])
print("[+] Number of features:", X_train.shape[1])

'''
Previous params before grid search:
model_params = {
    'alpha': 0.0001,
    'batch_size': 256,
    'epsilon': 1e-08,
    'hidden_layer_sizes': (300),
    'learning_rate': 'adaptive',
    'max_iter': 10,
}

model = MLPClassifier(**model_params)
'''
mlp_gs = MLPClassifier(max_iter=10000000)

parameter_space = {
    'hidden_layer_sizes': [(54)],
    'activation': ['tanh'],
    'epsilon': [5e-10,1e-10,1e-11],
    'solver': ['adam'],
    'alpha': [0.000115],
    'learning_rate': ['adaptive'],

}

print("[*] Training the model...")

rskf = RepeatedStratifiedKFold(n_splits=4, n_repeats=4, random_state=36851234)
model = GridSearchCV(mlp_gs, parameter_space, n_jobs=-1, cv=rskf)
model.fit(X_train, y_train) # X is train samples and y is the corresponding labels

print('Best parameters found: ', model.best_params_)
y_true, y_pred =y_test, model.predict(X_test)
accuracy = accuracy_score(y_true=y_test, y_pred=y_pred)
print("Accuracy: {:.2f}%".format(accuracy*100))

if not os.path.isdir("result"):
    os.mkdir("result")

pickle.dump(model, open("../external_programs/result/mlp_classifier.model", "wb"))

confusion_matrix = confusion_matrix(y_true=y_test, y_pred=y_pred)
disp = ConfusionMatrixDisplay(confusion_matrix=confusion_matrix, display_labels=model.classes_)
disp.plot()
plt.savefig("external_programs/result/confusion_matrix.jpg")

f= open("external_programs/result/classification_report.txt","w+")
f.write(classification_report(y_true=y_test, y_pred=y_pred))
f.close()

f = open("external_programs/result/best_parameters.txt","w+")
f.write(str(model.best_params_))
f.close()

f = open("external_programs/result/accuracy.txt","w+")
f.write(str(accuracy))
f.close()