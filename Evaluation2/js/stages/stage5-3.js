import Stage from "./stage.js"
import * as UTILS from "../util.js";
import PitchController from "../../../PitchController/pitchcontroller.js";

const params = {};

let controller; 


params.resource = "q5-tutorial-3-3";
params.onStart = async function()
{

    const spinning = document.getElementById("spinning");
    const pitchDetected = document.getElementById("pitch-detected");
    const pitchNumber = document.getElementById("pitch-number");
    const status = document.getElementById("status");

    let rot = 0;
    const rotRate = 1 / 8;
    const rotScale = 0.1;

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

    controller.afterprocessing = function(e)
    {
        
        if (e.data.insession == true)
        {
            pitchDetected.innerHTML = " Pitch Detected (Hz): ";
            pitchNumber.innerHTML = e.data.session.lastpitch;

            rot += rotRate;
            spinning.innerHTML = "hearing";
            let num = 1 + rotScale * Math.sin(rot);
            console.log(num)
            spinning.style.transform = `scale(${num})`;
        }
        else
        {
            spinning.innerHTML = "highlight_off";
            pitchDetected.innerHTML = "Pitch not detected";
            pitchNumber.innerHTML = "";
            spinning.style.transform = `scale(1.0)`;
        }

        if ("transientSilence" in e.data)
        {
            if (e.data.transientSilence == false)
            {
                status.innerHTML = "STATUS: ENABLED ";
            }
            else
            {
                status.innerHTML = "STATUS: DISABLED "
                spinning.innerHTML = "highlight_off";
                pitchDetected.innerHTML = "";
                pitchNumber.innerHTML = "";
                spinning.style.transform = `scale(1.0)`;
            }
        }
    }

    await controller.initialize();
    controller.toggle(true);
}

params.onComplete = () => {
    controller.destroy();
}

export default new Stage(params);