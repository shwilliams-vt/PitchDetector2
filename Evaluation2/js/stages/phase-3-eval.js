import Stage from "./stage.js"
import * as UTILS from "../util.js";
import PitchController from "../../../PitchController/pitchcontroller.js";
import Slider from "../tools/sliders/slider.js"
import Evaluator from "../tools/evaluator.js";
import ChartJS from "../tools/viz/chart.js"
import * as VIZ from "../tools/viz/viz.js"

const params = {};

params.resource = "phase-3-eval";

let evaluator;

params.onStart = async function()
{

    const evalParams = {
        domElem: document.getElementById("phase3"),
        rounds: [
            "./rounds/official/phase3/round1.json",
            "./rounds/official/phase3/round2.json",
            "./rounds/official/phase3/round3.json",
            "./rounds/official/phase3/round4.json",
            "./rounds/official/phase3/round5.json",
            "./rounds/official/phase3/round6.json"
        ]
    };

    evaluator = new Evaluator(evalParams);

    evaluator.onComplete = async results => {
        EVAL.results.phase3 = results;
        // UTILS.downloadJSON(results);
        
        let button = document.getElementById("finish");
        button.addEventListener("click", EVAL.next);
        button.innerHTML = "Continue >>";
        button.style.background = "darkred";

        let rounds = Object.keys(results);

        let label = document.createElement("h3");
        label.innerText = "Phase 3 - Results";

        let resultsTable = document.createElement("div");
        resultsTable.style.maxHeight = "250px";
        resultsTable.style.height = "250px";
        resultsTable.style.display = "inline-block";

        document.getElementById("phase3").appendChild(label);
        document.getElementById("phase3").appendChild(resultsTable);

        (async () => {
            await UTILS.waitOneFrame()
            resultsTable.appendChild(VIZ.drawEvaluation(results, false));
        })()

        document.getElementById("tool-wrapper").innerHTML = "";
        
    }

    evaluator.onRoundStart = async () => {
        document.getElementById("tool-wrapper").appendChild(evaluator.getController().buildTool());
    }


    await evaluator.start();

}

params.onComplete = async function(params)
{
    await evaluator.destroy();
}

export default new Stage(params);