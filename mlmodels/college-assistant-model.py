from typing import List
import nltk
from nltk.stem.lancaster import LancasterStemmer

stemmer = LancasterStemmer()

import numpy
import tflearn
import tensorflow as tf
import json
import pickle

OLD_MODEL = True
TRAIN = False


ignore_characters = ["?", "!", ".", ","]

# Data processing
with open('intents.json', "r") as file:
    data = json.loads(file.read())


# NOTE: DELETE data.pickle if you make any changes to JSON file
words = []
labels = []
docs_x = []
docs_y = []


for intent in data["intents"]:
    for pattern in intent["patterns"]:
        # Stemming Bring Word to root (remove symbols, tenses, etc)
        wrds = nltk.word_tokenize(pattern) # splits up sentense in kind of array
        words.extend(wrds) # add the words to the list
        docs_x.append(wrds)
        docs_y.append(intent["tag"])
    
    if intent["tag"] not in labels:
        labels.append(intent["tag"])


words = [stemmer.stem(w.lower()) for w in words if w not in ignore_characters]
words = sorted(list(set(words))) # unique words, into list, sorted

labels = sorted(labels)

# ML does not understand words

training = []
output = []

out_empty = [0 for _ in range(len(labels))]

for x, doc in enumerate(docs_x):
    bag = []

    wrds = [stemmer.stem(w) for w in doc]

    for w in words:
        if w in wrds:
            bag.append(1)
        else:
            bag.append(0)

    output_row = out_empty[:]
    output_row[labels.index(docs_y[x])] = 1

    training.append(bag)
    output.append(output_row)

training = numpy.array(training)
output = numpy.array(output)
with open("chatbot/data.pickle", "wb") as f:
    pickle.dump((words, labels, training, output), f)


# Building a Model
# tensorflow.reset_default_graph()
tf.compat.v1.reset_default_graph()

net = tflearn.input_data(shape=[None, len(training[0])])
net = tflearn.fully_connected(net, 8)
net = tflearn.fully_connected(net, 8)
net = tflearn.fully_connected(net, len(output[0]), activation="softmax")
net = tflearn.regression(net)

model = tflearn.DNN(net)


model.fit(training, output, n_epoch=2000, batch_size=8, show_metric=True)
model.save("chatbot/model.tflearn")












