import Stage from "./stage.js"
import * as UTILS from "../util.js";

const params = {};

params.resource = "web-check";
params.onStart = async function()
{
    const next = document.getElementById("next");

    let ws = new WebSocket(EVAL.SERVER_URI);
    ws.addEventListener("open", ()=>{
        ws.close();
        next.click();
    })

    ws.addEventListener("error", e=>{
        document.getElementById("an-h2").innerText = "Error!";
        document.getElementById("an-icon").classList.remove("spinning");
        document.getElementById("an-icon").innerText = "warning";
        document.getElementById("text").innerText = "A connection to the server could not be made. Please try again later.";

    })
}

export default new Stage(params);