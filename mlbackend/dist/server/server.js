"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const helpers_1 = require("./utils/helpers");
const Client = require("node-rest-client").Client;
const client = new Client();
const CHATBOT_URL = "http://127.0.0.1:5001/college-ml/api/v1.0/assistant";
const list_of_intents = JSON.parse(fs.readFileSync("intents.json", "utf8"));
const app = express();
//initialize a simple http server
const server = http.createServer(app);
//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });
wss.on("connection", (socket) => {
    const extSocket = socket;
    extSocket.isAlive = true;
    socket.on("pong", () => {
        extSocket.isAlive = true;
    });
    socket.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
        const data = JSON.parse(message);
        if (data.context === undefined || data.context === "") {
            // out of context
            let args = {
                data: { sentence: data.msg },
                headers: { "Content-Type": "application/json" },
            };
            client.post(CHATBOT_URL, args, (data, response) => {
                let intents = list_of_intents.intents;
                let responseMsg = "";
                let responseContext = "";
                for (let i = 0; i < intents.length; i++) {
                    if (intents[i].tag === data[0].intent) {
                        let responseId = (0, helpers_1.getRandomInt)(0, intents[i].responses.length - 1);
                        responseMsg = intents[i].responses[responseId];
                        responseContext = intents[i].context[0];
                        break;
                    }
                }
                const respondData = {
                    intent: data[0].intent,
                    msg: responseMsg,
                    context: responseContext,
                };
                const responseString = JSON.stringify(respondData);
                socket.send(responseString);
            });
        }
        else {
            let intents = list_of_intents.intents;
            let responseMsg = "";
            let responseContext = "";
            // Get Response
            for (let i = 0; i < intents.length; i++) {
                if (intents[i].tag === data.context) {
                    let responseId = (0, helpers_1.getRandomInt)(0, intents[i].responses.length - 1);
                    responseMsg = intents[i].responses[responseId];
                    responseContext = intents[i].context[0];
                    break;
                }
            }
            // console.log("Intent: " + data.context);
            let botParamsValue = "";
            if (data.botParams) {
                botParamsValue = data.botParams + " | " + data.msg;
            }
            else {
                botParamsValue = data.msg;
            }
            const respondData = {
                intent: data.context,
                msg: responseMsg,
                context: responseContext,
                botParams: botParamsValue,
            };
            const responseString = JSON.stringify(respondData);
            socket.send(responseString);
        }
        // socket.send(`Hello, you sent -> ${data.msg}`);
    }));
    socket.send("Hi there, I am a WebSocket server");
    socket.on("error", (err) => {
        console.warn(`Client disconnected - reason: ${err}`);
    });
});
setInterval(() => {
    wss.clients.forEach((ws) => {
        const extWs = ws;
        if (!extWs.isAlive)
            return ws.terminate();
        extWs.isAlive = false;
        ws.ping(null, undefined);
    });
}, 10000);
//start our server
server.listen(process.env.PORT || 8999, () => {
    console.log(`Server started on`, server.address());
});
//# sourceMappingURL=server.js.map