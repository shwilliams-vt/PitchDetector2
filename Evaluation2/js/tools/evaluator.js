import PitchController from "../../../PitchController/pitchcontroller.js";
import * as UTILS from "../util.js";
import EvaluatorOld from "./evaluatorold.js";

function parseRound(name)
{

}

export default class Evaluator
{

    constructor(params)
    {
        params = params || {};
        this.params = params;

        this.evaluator = new EvaluatorOld({
            rounds: params.rounds,
            domElem: params.domElem
        });

        let scope = this;
        this.evaluator.onCompleteAllRounds = async (results)=>{
            scope.onComplete(results);
            await scope.destroy();
        }

    }

    async start()
    {

        this.evaluator.onRoundStart = this.onRoundStart;
        await UTILS.waitOneFrame();

        await this.evaluator.start();


    }

    async onComplete(results)
    {
        if (this.params.onComplete)
        {
            await this.params.onComplete(results);
        }
    }

    async destroy()
    {
        await this.evaluator.destroy();
    }

    getController()
    {
        return this.evaluator.getController();
    }


}