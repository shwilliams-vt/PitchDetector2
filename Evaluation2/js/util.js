async function loadHTMLResource(name)
{
    let res = await fetch("./resources/html/" + name + ".html");
    let txt = await res.text();
    return txt;
}

async function SHA256(text)
{
    const sourceBytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
    const resultBytes = [...new Uint8Array(digest)];
    return resultBytes.map(x => x.toString(16).padStart(2, '0')).join("");
}

async function waitOneFrame()
{
    return new Promise(resolve=>{

        requestAnimationFrame(resolve);
        
    });
}

function downloadJSON(results)
{
    let e = document.createElement("a");
    let blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    let obj = URL.createObjectURL(blob);
    e.setAttribute("href", obj);
    e.setAttribute("download", "Results from " + new Date());
    e.click();
} 
function downloadJSONAsCSV(results)
{
    let e = document.createElement("a");
    console.log(results)

    let r = null;
    for (const res of results)
    {
        if (Object.keys(res.surveys.phase2))
        {
            r = res;
            break;
        }
    }
    if (r == null)
    {
        r = results[0];
    }

    // Build csv
    let csv = "";
    for (const key of Object.keys(r))
    {
        if (key === "surveys")
        {
            break;
        }
        csv += key + ",";
    }

    const surveys = [
        "pre-survey",
        "phase1",
        "phase2",
        "phase3",
        "phase4",
        "phase-1-tlx",
        "phase-2-tlx",
        "phase-3-tlx",
        "phase-4-tlx",
        "sus"
    ];

    const survey_num = {};
    surveys.map(n=>survey_num[n]=0);

    for (const key of surveys)
    {
        if (r.surveys[key])
        {
            csv += key + ",";
        
            for (const q of Object.keys(r.surveys[key]))
            {
                csv += q + ",";
                survey_num[key]++;
            }
        }
    }

    const phases = [
        "phase1",
        "phase2",
        "phase3",
        "phase4"
    ]

    for (const key of phases)
    {
        if (r.results[key])
        {
            csv += key + ",";
            for (const round of Object.keys(r.results[key]))
            {
                csv += round + ",";
                csv += "t_avg,";
                csv += "t_sd,";
            }
            
        }
        
    }

    csv += "\n";

    // Now iterate through results
    for (const result of results)
    {

        for (const key of Object.keys(result))
        {
            if (key === "surveys")
            {
                break;
            }
            csv += result[key] + ",";
        }

        for (const key of surveys)
        {
            let n = 0;
            if (result.surveys[key])
            {
                
                csv += ",";
                for (const q of Object.keys(result.surveys[key]))
                {
                    if (q === "can-whistle")
                        console.log(result.surveys[key])
                    let s = result.surveys[key][q] + "";
                    s=s.replaceAll("\\\"", "\'").replaceAll(",", " ");
                    s = "\"" + s + "\"";
                    if (s === "\"\"")
                    {
                        s= q;
                    }
                    csv += s + ",";
                    n++;
                }
                if (n != survey_num[key])
                {
                    for (let i = 0; i < survey_num[key] - n; i++)
                    {
                        csv += ",";
                    }
                }
                
            }
            else
            {
                csv += ",";
                for (const q of Object.keys(r.surveys[key]))
                {
                    csv += ",";
                }
            }
        }
    
    
        for (const key of phases)
        {
            if (result.results[key])
            {
                csv += ",";
                for (const round of Object.keys(result.results[key]))
                {
                    csv += ",";
                    let avg = result.results[key][round].reduce((s,v)=>s+=v.time, 0) / result.results[key][round].length;
                    csv += avg + ",";
                    csv += Math.sqrt(result.results[key][round].reduce((s,v)=>s+=((v.time-avg) ** 2), 0) / (result.results[key][round].length - 1)) + ",";
                }
            }
            else
            {
                csv += ",";
                for (const round of Object.keys(r.results[key]))
                {
                    csv += ",";
                    csv += ",";
                    csv += ",";
                }
            }
        }
        csv += "\n";
    }
    


    let blob = new Blob([csv], { type: "text/csv" });
    let obj = URL.createObjectURL(blob);
    e.setAttribute("href", obj);
    e.setAttribute("download", "Results from " + new Date());
    e.click();
} 

function postError(msg, e)
{
    let main = document.getElementById("main");
    main.innerHTML = "";

    let wall = document.createElement("div");
    wall.classList.add("wall");
    main.appendChild(wall);

    let title = document.createElement("h2");
    title.innerText = "Uh oh!";
    wall.appendChild(title);

    let msgBody = document.createElement("div");
    msgBody.classList.add("basic-page")
    msgBody.innerHTML = msg;
    wall.appendChild(msgBody);

    if (e !== undefined)
    {
        let extra = e;

        let extraBody = document.createElement("p");
        extraBody.classList.add("extra-error");
        extraBody.innerText = "MORE DETAILS: " + extra;
        wall.appendChild(extraBody)
    }
}

function createTool(controller)
{
    
}

function animationLoop()
{

    requestAnimationFrame(animationLoop)

    try 
    {
        // Fill in spaces
        let spaces = document.getElementsByTagName("space");

        for (const space of spaces)
        {
            if (space.getAttribute("_") === null)
            {
                let n = parseInt(space.getAttribute("n"));

                for (let j = 0; j < n; j++)
                {
                    space.innerHTML += "&nbsp;"
                }

                space.setAttribute("_", "1")

                
            }
        }
    }
    finally {

    }
    
}
animationLoop();

async function waitUntil(condition)
{

    return new Promise(resolve => {
        function f()
        {
            if (condition())
            {
                resolve();
            }
            else
            {
                requestAnimationFrame(f)
            }
        }
        f();
    });
}


export {loadHTMLResource, SHA256, waitOneFrame, downloadJSON, downloadJSONAsCSV, postError, waitUntil};