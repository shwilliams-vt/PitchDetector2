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

        let scope = this;

        parameters.rounds.forEach(async round=>{
            scope.rounds.push(await parseRound(round, (results)=>scope._onCompleteTest(results)));
        });
        
        this.domElem = parameters.domElem;

    }

    start()
    {
        this.currentRound = 0;
        this.results = [];
        this.next();
    }

    async next()
    {
        let round = this.rounds[this.currentRound];
        if (round && !round.started)
        {
            await round.begin();
        }

        this.domElem.innerHTML = "";

        let nextTest = round.next(this._onCompleteTest);

        if (!nextTest)
        {
            this.results.push([round.title, round.end()]);
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
                nextRound.begin();

                nextTest = round.next(this._onCompleteTest);
            }
        }

        this.domElem.appendChild(nextTest);
    }

    _onCompleteTest(e)
    {
        this.onCompleteTest();

        this.next();
    }
}