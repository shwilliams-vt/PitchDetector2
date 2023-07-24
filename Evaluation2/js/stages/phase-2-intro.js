import Stage from "./stage.js"
import * as UTILS from "../util.js";
import PitchController from "../../../PitchController/pitchcontroller.js";
import Slider from "../tools/sliders/slider.js"

const params = {};

params.resource = "phase-2-intro";
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
}


export default new Stage(params);