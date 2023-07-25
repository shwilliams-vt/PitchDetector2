import Stage from "./stage.js"
import * as UTILS from "../util.js";
import Questionnaire from "../tools/questionnaire.js";

const params = {};

params.resource = "phase-1-resp";
params.onStart = async function()
{

    const survey = new Questionnaire("phase-1-resp");

    survey.onComplete = function(e) { console.log(e); }

    document.getElementById("user-survey").appendChild(await survey.build())
}

params.onComplete = () => {
    
}

export default new Stage(params);