import stages from "./stages/stages.js";

const EVAL = {};

EVAL.main = document.getElementById("main");
EVAL.userInfo = document.getElementById("user-info");
EVAL.progressInfo = document.getElementById("progress-info");

EVAL.started = false;
EVAL.stages = stages;

EVAL.surveys = {};
EVAL.results = {};
EVAL.canWhistle = true;
EVAL.numTimesHelpClicked = 0;

EVAL.SERVER_URI = "wss://iot.cs.vt.edu:31137";

EVAL.generateJSON = function()
{
    let obj = {};
    
    obj.id = EVAL.id;
    obj.canWhistle = EVAL.canWhistle;
    obj.date = new Date();

    obj.surveys = EVAL.surveys;
    obj.results = EVAL.results;
    

    return obj;
}


// const skip = 24;
const skip = 0;

async function skip_modules()
{
    for (let i = 0; i < skip; i++)
    {
        await actual_next();
    }
}

function actual_start()
{
    EVAL.started = true;

    if (skip && skip > 0)
    {
        skip_modules();
    }
    else
    {
        actual_next()
    }
}


function start()
{
    EVAL.main.onload = () => {
        actual_start();
    }

    if (EVAL.main !== undefined)
    {
        actual_start();
    }
}

async function actual_next()
{
    console.log("next!")
    EVAL.progressInfo.innerHTML = `Progress: ${EVAL.stages.i + 1}/${EVAL.stages.stages.length}`;
    await EVAL.stages.next();
}

async function help_next(num)
{
    for (let i = 0; i < num; i++)
    {
        await actual_next();
    }
}

EVAL.next = function(num)
{
    if (EVAL.started == true)
    {
        if (isNaN(num))
        {
            num = 1;
        }
        help_next(num);
    }
}

EVAL.help = function (context)
{
    // Generate screen
    let helpElemBG = document.createElement("div");
    helpElemBG.classList.add("help-elem-bg");
    document.body.appendChild(helpElemBG);
    let helpElem = document.createElement("div");
    helpElem.classList.add("help-elem");
    helpElemBG.appendChild(helpElem);

    // Generate Text
    let helpMsgH2 = document.createElement("h2");
    helpMsgH2.innerText = "Help!";
    let helpMsg = document.createElement("p");

    // Depends on context
    if (context === "nvvi")
    {
        helpMsg.innerHTML = `
        <p>To use the tool, make sure you activate it by creating 2 consecutive transient sounds (e.g. clapping.)
        Then, you may use your pitch to move the slider to the indicated position. When you are done moving the slider, 
        create 2 transients again to deactivate the tool, which will progress you to the next test. When all tests are 
        completed, you will finish this round of testing.</p>
        `;
    }
    else if (context === "mouse")
    {
        helpMsg.innerHTML = `
        <p>Please use the mouse to drag the slider to the indicated position, which will progress you to the next test. 
        When all tests are completed, you will finish this round of testing.</p>
        `;
    }
    
    let btn = document.createElement("a");
    btn.innerText = "Got it!";
    btn.addEventListener("click", ()=>document.body.removeChild(helpElemBG));

    helpElem.appendChild(helpMsgH2);
    helpElem.appendChild(helpMsg);
    helpElem.appendChild(btn);

    // Signal help was clicked
    EVAL.numTimesHelpClicked++;
}

window.EVAL = EVAL;

window.onload = start;

