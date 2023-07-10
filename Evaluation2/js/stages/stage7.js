import Stage from "./stage.js"
import * as UTILS from "../util.js";
import PitchController from "../../../PitchController/pitchcontroller.js";
import Slider from "../tools/sliders/slider.js"
import Evaluator from "../tools/evaluator.js";

const params = {};

params.resource = "q7-phase1-2";

let evaluator;

params.onStart = async function()
{
    const evalParams = {
        domElem: document.getElementById("phase1"),
        rounds: ["./rounds/round1.json"]
    };

    evaluator = new Evaluator(evalParams);

    evaluator.onComplete = async results => {
        EVAL.results = {}
        EVAL.results.phase1 = results;
        // UTILS.downloadJSON(results);
        console.log(results)
    }

    await evaluator.start();

}

params.onComplete = async function(params)
{
    await evaluator.destroy();
}

export default new Stage(params);