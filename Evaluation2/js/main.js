import stages from "./stages/stages.js";

const EVAL = {};

EVAL.main = document.getElementById("main");
EVAL.userInfo = document.getElementById("user-info");
EVAL.progressInfo = document.getElementById("progress-info");

EVAL.started = false;
EVAL.stages = stages;

function actual_start()
{
    EVAL.started = true;
    actual_next();
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

function actual_next()
{
    console.log("next!")
    EVAL.progressInfo.innerHTML = `Progress: ${EVAL.stages.i + 1}/${EVAL.stages.stages.length}`;
    EVAL.stages.next();
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