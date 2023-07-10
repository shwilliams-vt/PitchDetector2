import stage1 from "./stage1.js"
import stage2 from "./stage2.js"
import stage3 from "./stage3.js"
import stage4 from "./stage4.js"
import stage5 from "./stage5.js"
import stage6 from "./stage6.js"
import stage7 from "./stage7.js"

export default
{
    i: 0,
    stages:  [stage1, stage2, stage3, stage4, stage5, stage6, stage7],
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