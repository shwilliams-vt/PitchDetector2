import * as UTILS from "../util.js";

export default class Stage
{

    constructor(params)
    {
        this.resourceLink = "";

        if (Object.keys(params).includes("resource"))
        {
            this.resourceLink = params["resource"];
        }

        if (Object.keys(params).includes("onComplete"))
        {
            this.userOnComplete = params["onComplete"];
        }

        if (Object.keys(params).includes("onStart"))
        {
            this.userOnStart = params["onStart"];
        }

        this.started = false;
        this.finished = false;
    }

    async start()
    {
        if (this.resourceLink !== "")
        {
            let txt = await UTILS.loadHTMLResource(this.resourceLink);
            EVAL.main.innerHTML = txt;
        }

        await UTILS.waitOneFrame();
        
        if (this.userOnStart)
        {
            await this.userOnStart();
        }

        this.started = true;

        //await UTILS.waitUntil(()=>{return scope.finished == true});
    }

    async onComplete()
    {
        if (this.userOnComplete)
        {
            await this.userOnComplete();
        }

        this.finished = true;
    }
}