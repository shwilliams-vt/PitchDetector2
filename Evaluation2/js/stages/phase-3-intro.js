import Stage from "./stage.js"
import * as UTILS from "../util.js";
import PitchController from "../../../PitchController/pitchcontroller.js";
import Slider from "../tools/sliders/slider.js"

const params = {};

let controller; 


params.resource = "phase-3-intro";
params.onStart = async function()
{

    const demo = document.getElementById("demo");
    const slider = new Slider({
        min:"0",
        max:"100",
        value:"90",
        step:"1",
    });

    demo.appendChild(slider.generateHTML());

    controller = new PitchController(
        {
            "frameSize": 1024,
            "sampleRate": 44100,
            "processingMode": "EXP",
            "smoothness": 40,
            "precision": 0,
            "transientWindowTime": 370,
            "processingRate": 512,
            "weight": 20
        }
    );

    controller.afterprocessing = function(e)
    {

        if (e.data.insession == true)
        {
            let val = slider.getValue() + e.data.session.deltapitch;
            slider.setValue(val);
        }
    }
    

    await controller.initialize();
    controller.toggle(true);

    document.getElementById("tool-wrapper").appendChild(controller.buildTool());
}

params.onComplete = () => {
    controller.destroy();
}

export default new Stage(params);