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

export {loadResource, SHA256, waitOneFrame};