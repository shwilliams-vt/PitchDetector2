import Stage from "./stage.js"
import * as UTILS from "../util.js";

const params = {};

params.resource = "welcome";
params.onComplete = async ()=>
{
    let id = await UTILS.SHA256(new Date());
    id = id.substring(0, 16);
    EVAL.userInfo.innerHTML =  `ID: ${id}`;
    EVAL.id = id;
}

export default new Stage(params);