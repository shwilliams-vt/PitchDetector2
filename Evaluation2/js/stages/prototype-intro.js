import Stage from "./stage.js"
import * as UTILS from "../util.js";
import PitchController from "../../../PitchController/pitchcontroller.js";

const params = {};

let controller; 


params.resource = "prototype-intro";
params.onStart = async function()
{

    controller = new PitchController(
        {
            "frameSize": 1024,
            "sampleRate": 44100,
            "processingMode": "ACF",
            "smoothness": 40,
            "precision": 0,
            "transientWindowTime": 370,
            "processingRate": 512
        }
    );


    await controller.initialize();
    controller.toggle(true);

    document.getElementById("tool-wrapper").appendChild(controller.buildTool());

}

params.onComplete = () => {
    controller.destroy();
}

export default new Stage(params);