async function loadResource(name)
{
    let res = await fetch("./resources/" + name + ".html");
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


export {loadResource, SHA256, waitOneFrame, downloadJSON, postError};