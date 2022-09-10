import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

// Pages
import * as homeController from "./controllers/home";
import * as policiesController from "./controllers/policies";
import * as guidesController from "./controllers/guides";

import { messageStructure, intentStructure } from "./utils/types";
import { getRandomInt } from "./utils/helpers";

dotenv.config();
const Client = require("node-rest-client").Client;
const client = new Client();

const CHATBOT_URL = "http://127.0.0.1:5001/college-ml/api/v1.0/assistant";
const list_of_intents = JSON.parse(fs.readFileSync("intents.json", "utf8"));

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
}

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Example: styles/main.css
app.use(
  express.static(path.join(__dirname, "static"), { maxAge: 31557600000 })
);

app.get("/", homeController.index);

app.get("/privacy", policiesController.privacy);

app.get("/tos", policiesController.terms);

app.get("/app-guide", guidesController.appGuide);

app.get("/highschool-guide", guidesController.highSchoolGuide);

app.get("/collegecore-plus-guide", guidesController.collegeCorePlusGuide);

//initialize a simple http server
// TODO: it should use HTTPS instead
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

wss.on("connection", (socket: WebSocket) => {
  // // console.log("Connecting...")
  const extSocket = socket as ExtWebSocket;

  extSocket.isAlive = true;

  socket.on("pong", () => {
    extSocket.isAlive = true;
  });

  socket.on("message", async (message: string) => {
    const data: messageStructure = JSON.parse(message);
    if (data.context === undefined || data.context === "") {
      // out of context
      let args = {
        data: { sentence: data.msg },
        headers: { "Content-Type": "application/json" },
      };
      client.post(CHATBOT_URL, args, (data: any, response: any) => {
        let intents: intentStructure[] = list_of_intents.intents;
        let responseMsg: string = "";
        let responseContext: string = "";

        for (let i = 0; i < intents.length; i++) {
          if (intents[i].tag === data[0].intent) {
            let responseId = getRandomInt(0, intents[i].responses.length - 1);
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
    } else {
      let intents: intentStructure[] = list_of_intents.intents;
      let responseMsg: string = "";
      let responseContext: string = "";

      // Get Response
      for (let i = 0; i < intents.length; i++) {
        if (intents[i].tag === data.context) {
          let responseId = getRandomInt(0, intents[i].responses.length - 1);
          responseMsg = intents[i].responses[responseId];
          responseContext = intents[i].context[0];
          break;
        }
      }

      // console.log("Intent: " + data.context);

      let botParamsValue: string = "";
      if (data.botParams) {
        botParamsValue = data.botParams + " | " + data.msg;
      } else {
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
  });

  socket.send("Hi there, I am a WebSocket server");

  socket.on("error", (err) => {
    console.warn(`Client disconnected - reason: ${err}`);
  });
});

setInterval(() => {
  // TODO: not the best method
  wss.clients.forEach((ws: WebSocket) => {
    const extWs = ws as ExtWebSocket;
    if (!extWs.isAlive) return ws.terminate();
    extWs.isAlive = false;
    ws.ping(null, undefined);
  });
}, 10000);

//start our server
server.listen(process.env.PORT || 8999, () => {
  console.log(`Server started on`, server.address());
});
