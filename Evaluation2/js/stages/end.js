import Stage from "./stage.js"
import * as UTILS from "../util.js";

const params = {};

params.resource = "end";
params.onStart = async () =>
{
    UTILS.downloadJSON(EVAL.generateJSON())
}
params.onComplete = async ()=>
{
    
}

export default new Stage(params);