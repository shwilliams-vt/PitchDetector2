import Stage from "./stage.js"
import * as UTILS from "../util.js";

const params = {};

params.resource = "access-mic";

function success(stream)
{
    stream.getTracks().forEach((track) => {
        track.stop();
    });

    EVAL.next();
}

function generateError(e)
{
    UTILS.postError(`
    <p class="half-width blurb">You (probably accidentally) denied access to your microphone, but that's ok! Just access your web browser settings and grant access to the microphone for this site. After you've done this, please restart the study!</p>
    <p class="half-width blurb">For help on how to grant access to the microphone for this site, you may ask your proctor for assistance, but don't forget Google is your friend, too.</p>
    <a onclick="window.location.reload()"><i class='material-icons'>cached</i><space n=2></space> Restart</a>
    `, e);
}

params.onStart = () => {
    let mic = document.getElementById("grant-mic");

    mic.addEventListener("click", async _=>{
        
        navigator.mediaDevices.getUserMedia({audio:true})
            .then(success)
            .catch(generateError)
    });

}

export default new Stage(params);