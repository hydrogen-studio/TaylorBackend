import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";
import * as axios from "axios";

// Pages
import * as homeController from "./controllers/home";
import * as policiesController from "./controllers/policies";
import * as guidesController from "./controllers/guides";


import { messageStructure, intentStructure, responseStructure } from "./utils/types";
import { getRandomInt } from "./utils/helpers";
import handleError from "./middleware/error-handler.middleware";

import * as CIP from './utils/CIP.json';

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

    let respondData : responseStructure = {
      intent: data.context,
      msg: responseMsg,
      context: responseContext,
      botParams: botParamsValue,
    };

    
    if(data.context == "search_by_major"){
      respondData = searchCollege(botParamsValue, data)
    }



    res.send(respondData);
  }
});



function searchCollege(botParamsValue: string, data: messageStructure): responseStructure {
  let params = botParamsValue.split(" | ")

  const ithk = {
    intent: data.context,
    msg: "Seaching",
    context: "",
    botParams: botParamsValue,
  }

  const apiKey = process.env.COLLEGE_SEARCH_API_KEY
  // console.log(apiKey)
  let fields:string[] = ["latest.programs.cip_4_digit", "latest.school"]

  console.log(params)
  
  let param =  {
    "api_key" : apiKey,
    "fields": fields.join(","),
    "latest.school.state": params[0].toUpperCase(),
    "latest.programs.cip_4_digit.credential.title": "Bachelor’s Degree",
    "per_page": "1"
  }

  let majorStoring:string[] = [];
  axios.default.get('https://api.data.gov/ed/collegescorecard/v1/schools', {
    params: param,
    headers: { "Content-Type": "application/json" }
  }).then(data => {
    let dataRes = data.data;
    if(!(dataRes.results.length == 0)) {
      let majors = dataRes.results[0]["latest.programs.cip_4_digit"]
      for(let i in majors){
        let current = majors[i];
        if(searchMajor(current.title.toUpperCase(), params[1].toUpperCase())){
          majorStoring.push(dataRes.results[0]["latest.school.name"])
        }
      }

      ithk["msg"] = majorStoring.join(",")
      console.log(ithk)
      return ithk
    }
    
  }).catch(e => {
    console.error(e)
  });
  console.log("Old")
  console.log(ithk)
  
  return ithk;
}


function searchMajor(collegeValue:string, userValue:string):boolean{
  let search = collegeValue.search(userValue)

  return search != -1
}

app.use(handleError);


//start our server
const PORT = process.env.PORT || 8999;
app.listen(PORT, () => {
  console.log(`Server started on`, PORT);
});
