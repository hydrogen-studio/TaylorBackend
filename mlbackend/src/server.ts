import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";
import * as axios from "axios";
import Format = require("string-format");

// Pages
import * as homeController from "./controllers/home";
import * as policiesController from "./controllers/policies";
import * as guidesController from "./controllers/guides";

// Templates
import { collegeTemplate } from "./templates/collegeSearch";


import { messageStructure, intentStructure, responseStructure } from "./utils/types";
import { getRandomInt } from "./utils/helpers";
import handleError from "./middleware/error-handler.middleware";

import * as CIP from './utils/CIP.json';
import * as stringSimilarity from 'string-similarity';

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

app.post("/api/v2/college_core_chatbot", async function (req, res) {
  console.log(req.body);

  const data: messageStructure = req.body;
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

    let respondData: responseStructure = {
      intent: data.context,
      msg: responseMsg,
      context: responseContext,
      botParams: botParamsValue,
    };

    // search college
    if (data.context == "search_by_tuition") {
      respondData = await searchCollege(botParamsValue, data)
    }





    res.send(respondData);
  }
});


async function searchCollege(botParamsValue: string, data: messageStructure): Promise<responseStructure> {
  let params = botParamsValue.split(" | ")

  const ithk = {
    intent: data.context,
    msg: "I cannot find the college you are looking for based on your inputs. Please try again.",
    context: "",
    botParams: botParamsValue,
  }

  const apiKey = process.env.COLLEGE_SEARCH_API_KEY
  // console.log(apiKey)
  let fields: string[] = ["latest.programs.cip_4_digit", "latest.school", "latest.student.size", "latest.cost.avg_net_price"]

  console.log(params)

  let param = {
    "api_key": apiKey,
    "fields": fields.join(","),
    "latest.school.state": params[0].toUpperCase(),
    "latest.programs.cip_4_digit.credential.title": "Bachelor’s Degree",
    "latest.programs.cip_4_digit.code": searchMajor(params[1]).join(","),
    "latest.student.size__range": (parseInt(params[2]) - 1500).toString() + ".." + (parseInt(params[2]) + 1500).toString(),
    "latest.cost.avg_net_price.overall__range": (parseInt(params[3]) - 5000).toString() + ".." + (parseInt(params[3]) + 5000).toString(),
    "per_page": "2"
  }

  let majorStoring: string[] = [];
  let reqRes = await axios.default.get('https://api.data.gov/ed/collegescorecard/v1/schools', {
    params: param,
    headers: { "Content-Type": "application/json" }
  })
  let dataRes = reqRes.data;
  console.log(dataRes)
  if (!(dataRes.results.length == 0)) {
    Format.extend(String.prototype, {});

    const fmt = Format.create({
      moneyFormat: (s: string) => s.toLocaleLowerCase()
    });
    for (var i in dataRes.results) {
      let payload = { 
        student: dataRes.results[i]["latest.student.size"],
        name: dataRes.results[i]["latest.school.name"],
        tuition: dataRes.results[i]["latest.cost.avg_net_price.overall"]
      }
      let string = fmt(collegeTemplate, payload);
      majorStoring.push(string)
    }


    let result = majorStoring.join("\n\n")
    ithk["msg"] = result
    // console.log(ithk)
    return ithk
  }



  return ithk;
}


function searchMajor(input: string): string[] {
  var parse = JSON.parse(JSON.stringify(CIP))
  let res: string[] = []
  Object.keys(parse).forEach(key => {
    var similarity = stringSimilarity.compareTwoStrings(parse[key]['CIPTitle'], input);
    // console.log(similarity)
    if (similarity > 0.6) {
      res.push(key)
    }

  })

  return res;
}

app.use(handleError);


//start our server
const PORT = process.env.PORT || 8999;
app.listen(PORT, () => {
  console.log(`Server started on`, PORT);
});
