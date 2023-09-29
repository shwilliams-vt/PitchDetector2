import * as UTILS from "../util.js"
import test from "./test.js"
import web_check from "./web-check.js"
import welcome from "./welcome.js"
import introduction from "./introduction.js"
import consent from "./consent.js"
import access_mic from "./access-mic.js"
import intro_pitch from "./intro-pitch.js"
import tool_overview from "./tool-overview.js"
import selection_overview from "./selection-overview.js"
import selection_handling from "./selection-handling.js"
import prototype_intro from "./prototype-intro.js"
import prototype_demo from "./prototype-demo.js"
import pre_survey from "./pre-survey.js"
import phase_1_intro from "./phase-1-intro.js"
import phase_1_eval from "./phase-1-eval.js"
import phase_1_tlx from "./phase-1-tlx.js"
import phase_1_resp from "./phase-1-resp.js"
import phase_2_intro from "./phase-2-intro.js"
import phase_2_eval from "./phase-2-eval.js"
import phase_2_tlx from "./phase-2-tlx.js"
import phase_2_resp from "./phase-2-resp.js"
import phase_3_intro from "./phase-3-intro.js"
import phase_3_eval from "./phase-3-eval.js"
import phase_3_tlx from "./phase-3-tlx.js"
import phase_3_resp from "./phase-3-resp.js"
import phase_4_intro from "./phase-4-intro.js"
import phase_4_eval from "./phase-4-eval.js"
import phase_4_tlx from "./phase-4-tlx.js"
import phase_4_resp from "./phase-4-resp.js"
import sus from "./sus.js"
import end from "./end.js"

export default
{
    i: 0,
    stages:  [
        web_check,
        welcome, 
        introduction, 
        consent, 
        access_mic, 
        intro_pitch, 
        tool_overview, 
        selection_overview, 
        selection_handling, 
        prototype_intro, 
        prototype_demo,
        pre_survey,
        phase_1_intro, 
        phase_1_eval,  
        phase_1_tlx,
        phase_1_resp,
        phase_2_intro, 
        phase_2_eval,  
        phase_2_tlx,
        phase_2_resp,
        phase_3_intro, 
        phase_3_eval,  
        phase_3_tlx,
        phase_3_resp,
        phase_4_intro, 
        phase_4_eval, 
        phase_4_tlx,
        phase_4_resp,
        sus,
        end
    ],
    current_stage: null,

    next: async function()
    {

        if (this.current_stage != null && this.current_stage !== undefined)
        {
            

            await this.current_stage.onComplete();

            let scope = this;
            await UTILS.waitUntil(()=>{return scope.current_stage.finished == true});
        }

        

        if (this.i < this.stages.length)
        {
            this.current_stage = this.stages[this.i];
            this.i++;
            await this.current_stage.start();
        }
        else
        {
            this.current_stage = null;
        }
    }
}