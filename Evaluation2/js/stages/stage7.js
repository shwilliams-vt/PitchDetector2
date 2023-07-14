import Stage from "./stage.js"
import * as UTILS from "../util.js";
import PitchController from "../../../PitchController/pitchcontroller.js";
import Slider from "../tools/sliders/slider.js"
import Evaluator from "../tools/evaluator.js";
import ChartJS from "../tools/viz/chart.js"
import * as VIZ from "../tools/viz/viz.js"

const params = {};

params.resource = "q7-phase1-2";

let evaluator;

params.onStart = async function()
{

    const spinning = document.getElementById("spinning");
    const pitchDetected = document.getElementById("pitch-detected");
    const pitchNumber = document.getElementById("pitch-number");
    const status = document.getElementById("status");

    let rot = 0;
    const rotRate = 1 / 8;
    const rotScale = 0.1;

    const evalParams = {
        domElem: document.getElementById("phase1"),
        rounds: ["./rounds/round2.json"]
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
        label.innerText = "Phase 1 - Results";

        let resultsTable = document.createElement("div");
        resultsTable.style.maxHeight = "250px";
        resultsTable.style.height = "250px";
        resultsTable.style.display = "inline-block";

        resultsTable.appendChild(VIZ.drawEvaluation(results))

        document.getElementById("phase1").appendChild(label);
        document.getElementById("phase1").appendChild(resultsTable);

        

        // for (let i = 0; i < rounds.length; i++)
        // {
        //     let round = results[rounds[i]];

        //     for (let j = 0; j < round.length; j++)
        //     {
        //         let test = round[j];
        //         console.log(test)

        //         let labels = test.dataPoints.map(xy=>{ return parseInt(xy[0]).toString() });
        //         let datapoints1 = test.dataPoints.map(xy=>{ return xy[1] });
        //         let datapoints2 = test.dataPoints.map(xy=>{ return test.metadata.endValue });

        //         let chartParams = {
        //             titles: ["Test 1 Results", "Correct Value"],
        //             labels: labels,
        //             datapoints: [datapoints1, datapoints2]
        //         };
        //         let chart = new ChartJS(chartParams);
        //         document.getElementById("phase1").appendChild(chart.generateHTML())
        //     }
            
        // }
        
    }


    await evaluator.start();

    document.getElementById("tool-wrapper").appendChild(evaluator.getController().buildTool());
}

params.onComplete = async function(params)
{
    await evaluator.destroy();
}

export default new Stage(params);