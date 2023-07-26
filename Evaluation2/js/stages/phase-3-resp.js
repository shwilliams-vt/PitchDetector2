import Stage from "./stage.js"
import * as UTILS from "../util.js";
import Questionnaire from "../tools/questionnaire.js";

const params = {};

params.resource = "phase-3-resp";
params.onStart = async function()
{

    const survey = new Questionnaire("phase-3-resp");

    survey.onComplete = function(results) { 

        EVAL.surveys.phase3 = results;

        let button = document.getElementById("finish");
        button.addEventListener("click", EVAL.next);
        button.innerHTML = "Continue >>";
        button.style.background = "darkred";
    }

    document.getElementById("user-survey").appendChild(await survey.build())
}

params.onComplete = () => {
    
}

export default new Stage(params);