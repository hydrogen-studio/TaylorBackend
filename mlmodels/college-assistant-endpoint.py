import nltk
from nltk.stem.lancaster import LancasterStemmer

stemmer = LancasterStemmer()

import numpy
import tflearn
import tensorflow as tf
import pandas as pd
import json
import pickle

from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin


with open('intents.json', "r") as file:
    data = json.loads(file.read())

with open("chatbot/data.pickle", "rb") as f:
        words, labels, training, output = pickle.load(f)


tf.compat.v1.reset_default_graph()

net = tflearn.input_data(shape=[None, len(training[0])])
net = tflearn.fully_connected(net, 8)
net = tflearn.fully_connected(net, 8)
net = tflearn.fully_connected(net, len(output[0]), activation="softmax")
net = tflearn.regression(net)

model = tflearn.DNN(net)

model.load("chatbot/model.tflearn")

def bow(s, words):
    bag = [0 for _ in range(len(words))]

    s_words = nltk.word_tokenize(s)
    s_words = [stemmer.stem(word.lower()) for word in s_words]

    for se in s_words:
        for i, w in enumerate(words):
            if w == se:
                bag[i] = 1
    
    return numpy.array(bag)



def classify_local(sentence):
    ERROR_THRESHOLD = 0.25
    
    # generate probabilities from the model
    results = model.predict([bow(sentence, words)])[0]
    # filter out predictions below a threshold, and provide intent index
    results = [[i,r] for i,r in enumerate(results) if r>ERROR_THRESHOLD]
    # sort by strength of probability
    results.sort(key=lambda x: x[1], reverse=True)
    return_list = []
    for r in results:
        return_list.append({ "intent": labels[r[0]], "probability": str(r[1]) })
    # return tuple of intent and probability
    
    return return_list


app = Flask(__name__)
CORS(app)

@app.route("/college-ml/api/v1.0/assistant", methods=['POST'])
def classify():    
    sentence = request.json['sentence']
    return_list = classify_local(sentence)
    
    response = jsonify(return_list)
    return response

# running REST interface, port=5000 for direct test, port=5001 for deployment from PM2
if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=5001)
