from scipy.signal.filter_design import EPSILON
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score
from utils import load_data
import os
import pickle

X_train, X_test, y_train, y_test = load_data(test_size=0.15)
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
mlp_gs = MLPClassifier(max_iter=50000)
parameter_space = {
    'hidden_layer_sizes': [(10,30,10),(20,),(1,1,1,1,1)],
    'activation': ['tanh', 'relu'],
    'solver': ['adam'],
    'epsilon':[1e-08, 1e-04, 1],
    'alpha': [0.0001, 0.05, 0.1],
    'learning_rate': ['constant','adaptive'],
}
from sklearn.model_selection import GridSearchCV
print("[*] Training the model...")
model = GridSearchCV(mlp_gs, parameter_space, n_jobs=-1, cv=5)
model.fit(X_train, y_train) # X is train samples and y is the corresponding labels

print('Best parameters found: ', model.best_params_)
#model.fit(X_train, y_train)
y_true, y_pred =y_test, model.predict(X_test)
accuracy = accuracy_score(y_true=y_test, y_pred=y_pred)
print("Accuracy: {:.2f}%".format(accuracy*100))

if not os.path.isdir("result"):
    os.mkdir("result")

pickle.dump(model, open("result/mlp_classifier.model", "wb"))
