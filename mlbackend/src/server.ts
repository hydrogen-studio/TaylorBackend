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
import handleError from "./middleware/error-handler.middleware";

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

app.use(express.json());       // to support JSON-encoded bodies

app.get("/", homeController.index);

app.get("/privacy", policiesController.privacy);

app.get("/tos", policiesController.terms);

app.get("/app-guide", guidesController.appGuide);

app.get("/highschool-guide", guidesController.highSchoolGuide);

app.get("/collegecore-plus-guide", guidesController.collegeCorePlusGuide);

app.post("/api/v2/college_core_chatbot", function (req, res) {
  console.log(req.body);

  const data : messageStructure = req.body;
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
      res.send(respondData);
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

    let respondData = {
      intent: data.context,
      msg: responseMsg,
      context: responseContext,
      botParams: botParamsValue,
    };

    
    if(data.context == "search_hospital_by_type"){
      let params = botParamsValue.split(" | ")

      respondData = {
        intent: data.context,
        msg: "This Hospital Does not Exist",
        context: "",
        botParams: botParamsValue,
      };
    }

    res.send(respondData);
  }
});

app.use(handleError);


//start our server
const PORT = process.env.PORT || 8999;
app.listen(PORT, () => {
  console.log(`Server started on`, PORT);
});
