import Stage from "./stage.js"
import * as UTILS from "../util.js";

const params = {};

function onSendResultsSuccess()
{
    document.getElementById("an-h2").innerText = "Finished!";
    document.getElementById("an-icon").classList.remove("spinning");
    document.getElementById("an-icon").innerText = "waving_hand";
    document.getElementById("send-results-status").innerHTML = "Well done! Thank you for participating in the study. Your resulting evaluation data has been successfully received by the server."
    document.getElementById("send-results-status").innerHTML += "<br/><br/>Please record your ID, located at the top left of the screen.";
}

function onSendResultsError(e)
{
    document.getElementById("an-h2").innerText = "Error!";
    document.getElementById("an-icon").classList.remove("spinning");
    document.getElementById("an-icon").innerText = "warning";
    document.getElementById("send-results-status").innerHTML = "Uh oh. There appears to have been an error. Please reach out to a study administrator and tell them you saw this message."
    document.getElementById("send-results-status").innerHTML += "<br/><br/>Error: " + ((e.code ? e.code : (e.data ? e.data : e)) + "");
    document.getElementById("send-results-status").innerHTML += "<br/><br/>Please also record your ID, located at the top left of the screen.";
}

params.resource = "end";
params.onStart = async () =>
{
    // UTILS.downloadJSON(EVAL.generateJSON())
    const results = EVAL.generateJSON();

    let ws = new WebSocket(EVAL.SERVER_URI);

    ws.addEventListener("open", e=>{
        ws.send(JSON.stringify(results));
    });

    ws.addEventListener("close", e=>{
        if (e.code == 1000)
        {
            onSendResultsSuccess();
        }
        else
        {
            onSendResultsError(e);
        }
    })

    ws.addEventListener("error", e=>{
        onSendResultsError(e);
    })
}
params.onComplete = async ()=>
{
    
}

export default new Stage(params);