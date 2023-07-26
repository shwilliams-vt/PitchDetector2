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

EVAL.generateJSON = function()
{
    let obj = {};
    obj.surveys = EVAL.surveys;
    obj.results = EVAL.results;
    obj.id = EVAL.id;
    obj.canWhistle = EVAL.canWhistle;
    obj.date = new Date();

    return obj;
}


// const skip = 13;
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

window.EVAL = EVAL;

window.onload = start;

