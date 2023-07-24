import Stage from "./stage.js"
import * as UTILS from "../util.js";
import PitchController from "../../../PitchController/pitchcontroller.js";
import Slider from "../tools/sliders/slider.js"
import Evaluator from "../tools/evaluator.js";
import ChartJS from "../tools/viz/chart.js"
import * as VIZ from "../tools/viz/viz.js"

const params = {};

params.resource = "phase-2-eval";

let evaluator;

params.onStart = async function()
{

    const evalParams = {
        domElem: document.getElementById("phase2"),
        rounds: [
            "./rounds/official/phase2/round1.json",
            "./rounds/official/phase2/round2.json",
            "./rounds/official/phase2/round3.json"
        ]
    };

    evaluator = new Evaluator(evalParams);

    evaluator.onComplete = async results => {
        EVAL.results = {}
        EVAL.results.phase1 = results;
        // UTILS.downloadJSON(results);
        
        let button = document.getElementById("finish");
        button.addEventListener("click", EVAL.next);
        button.innerHTML = "Continue >>";
        button.style.background = "darkred";

        let rounds = Object.keys(results);

        let label = document.createElement("h3");
        label.innerText = "Phase 2 - Results";

        let resultsTable = document.createElement("div");
        resultsTable.style.maxHeight = "250px";
        resultsTable.style.height = "250px";
        resultsTable.style.display = "inline-block";

        document.getElementById("phase2").appendChild(label);
        document.getElementById("phase2").appendChild(resultsTable);

        (async () => {
            await UTILS.waitOneFrame()
            resultsTable.appendChild(VIZ.drawEvaluation(results, false));
        })()

        document.getElementById("tool-wrapper").innerHTML = "";
        
    }


    await evaluator.start();

}

params.onComplete = async function(params)
{
    await evaluator.destroy();
}

export default new Stage(params);