import Stage from "./stage.js"
import * as UTILS from "../util.js";
import PitchController from "../../../PitchController/pitchcontroller.js";
import Slider from "../tools/sliders/slider.js"
import Evaluator from "../tools/evaluator.js";
import ChartJS from "../tools/viz/chart.js"
import * as VIZ from "../tools/viz/viz.js"

const params = {};

let listener = false;

params.resource = "phase-4-eval";

let evaluator;

params.onStart = async function()
{

    const evalParams = {
        domElem: document.getElementById("phase4"),
        rounds: [
            "./rounds/official/phase4/round1.json"
        ]
    };

    evaluator = new Evaluator(evalParams);

    evaluator.onComplete = async results => {
        EVAL.results.phase4 = results;
        // UTILS.downloadJSON(results);
        
        if (listener == false)
        {
            let button = document.getElementById("finish");
            button.addEventListener("click", EVAL.next);
            button.innerHTML = "Continue >>";
            button.style.background = "darkred";

            let rounds = Object.keys(results);

            let label = document.createElement("h3");
            label.innerText = "Phase 4 - Results";

            let resultsTable = document.createElement("div");
            resultsTable.style.maxHeight = "250px";
            resultsTable.style.height = "250px";
            resultsTable.style.display = "inline-block";

            document.getElementById("phase4").appendChild(label);
            document.getElementById("phase4").appendChild(resultsTable);

            (async () => {
                await UTILS.waitOneFrame()
                resultsTable.appendChild(VIZ.drawEvaluation(results, false));
            })()

            document.getElementById("tool-wrapper").innerHTML = "";
            listener = true;
        }
    }


    await evaluator.start();

}

params.onComplete = async function(params)
{
    await evaluator.destroy();
}

export default new Stage(params);