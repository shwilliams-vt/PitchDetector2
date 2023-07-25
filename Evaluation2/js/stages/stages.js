import welcome from "./welcome.js"
import introduction from "./introduction.js"
import consent from "./consent.js"
import access_mic from "./access-mic.js"
import intro_pitch from "./intro-pitch.js"
import tool_overview from "./tool-overview.js"
import selection_overview from "./selection-overview.js"
import selection_handling from "./selection-handling.js"
import prototype_intro from "./prototype-intro.js"
import phase_1_intro from "./phase-1-intro.js"
import phase_1_eval from "./phase-1-eval.js"
import phase_1_resp from "./phase-1-resp.js"
import phase_2_intro from "./phase-2-intro.js"
import phase_2_eval from "./phase-2-eval.js"
import end from "./end.js"

export default
{
    i: 0,
    stages:  [
        welcome, 
        introduction, 
        consent, 
        access_mic, 
        intro_pitch, 
        tool_overview, 
        selection_overview, 
        selection_handling, 
        prototype_intro, 
        phase_1_intro, 
        phase_1_eval,  
        phase_1_resp,
        phase_2_intro, 
        phase_2_eval, 
        end
    ],
    current_stage: null,

    next: async function()
    {

        if (this.current_stage != null)
        {
            await this.current_stage.onComplete();
        }

        if (this.i < this.stages.length)
        {
            this.current_stage = this.stages[this.i];
            await this.current_stage.start();
            this.i++;
        }
        else
        {
            this.current_stage = null;
        }
    }
}