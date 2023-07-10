import Stage from "./stage.js"
import * as UTILS from "../util.js";

const params = {};

params.resource = "q1";
params.onComplete = async ()=>
{
    let favFood = document.getElementById("fav-food").value;
    let id = await UTILS.SHA256(favFood + new Date());
    id = id.substring(0, 16);
    EVAL.userInfo.innerHTML =  `ID: ${id}`;
    EVAL.id = id;
}

export default new Stage(params);