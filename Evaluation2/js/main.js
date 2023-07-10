import stages from "./stages/stages.js";

const EVAL = {};

EVAL.main = document.getElementById("main");
EVAL.userInfo = document.getElementById("user-info");
EVAL.progressInfo = document.getElementById("progress-info");

EVAL.started = false;
EVAL.stages = stages;

const skip = 7;

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

EVAL.next = function()
{
    if (EVAL.started == true)
    {
        actual_next();
    }
}

window.EVAL = EVAL;

start();

