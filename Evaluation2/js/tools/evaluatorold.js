import Round from "./round.js"

async function parseRound(roundFile, callback)
{
    let resp = await fetch(roundFile);
    let j = await resp.json();

    let round = new Round(j);
    round.onCompleteTest = callback;
    return round;
}

export default class Evaluator
{

    constructor(parameters)
    {
        this.currentRound = 0;
        this.rounds = [];
        this.results = [];

        this.onCompleteTest = ()=>{};
        this.onCompleteRound = ()=>{};
        this.onCompleteAllRounds = ()=>{};

        this.parameters = parameters;
        this.domElem = parameters.domElem;

    }

    async buildRounds()
    {
        let scope = this;
        for (let i = 0; i < this.parameters.rounds.length; i++)
        {
            let round = await parseRound(this.parameters.rounds[i], (results)=>scope._onCompleteTest(results));
            scope.rounds.push(round);
        }
    }

    async start()
    {
        await this.buildRounds();
        
        this.currentRound = 0;
        this.results = {};
        await this.next();
    }

    async next()
    {

        let round = this.rounds[this.currentRound];
        if (round && !round.started)
        {
            await round.begin();
            if (this.onRoundStart !== undefined)
            {
                await this.onRoundStart();
            }
        }

        this.domElem.innerHTML = "";

        let nextTest = round.next(this._onCompleteTest);

        if (nextTest == null)
        {
            this.results[round.title] = await round.end();
            // Check if we have another round
            if (this.currentRound == this.rounds.length - 1)
            {
                this.onCompleteRound();
                this.onCompleteAllRounds(this.results);
                return;
            }
            else
            {
                this.onCompleteRound();
                this.currentRound++;

                let nextRound = this.rounds[this.currentRound];
                nextRound.started = true;
                await nextRound.begin();
                await round.begin();
                if (this.onRoundStart !== undefined)
                {
                    await this.onRoundStart();
                }

                nextTest = nextRound.next(this._onCompleteTest);
            }
        }

        this.domElem.appendChild(nextTest);
    }

    _onCompleteTest(e)
    {
        this.onCompleteTest();

        this.next();
    }

    async destroy()
    {
        let scope = this;
        await new Promise(async resolve=>{

            let c = scope.getController();
            if (c !== undefined)
            {
                await c.destroy();
            }
            resolve();
        });
    }

    getController()
    {
        let round = this.rounds[this.currentRound];

        if (round === undefined || round === null)
        {
            return undefined;
        }

        return round.pitchController;
    }
}