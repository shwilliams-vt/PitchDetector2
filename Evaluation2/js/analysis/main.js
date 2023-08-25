import * as VIZ from "../tools/viz/viz.js"

const MAX_TIME = 15 // s;

async function loadSurvey(s)
{
    s.surveyContent.innerHTML = "";

    for (const q of Object.keys(s.survey))
    {
        let d = document.createElement("div");

        d.innerHTML = `<span>${q}</span> : <span>${s.survey[q]}</span>`;
        d.classList.add("survey-question");

        s.surveyContent.appendChild(d);
    }
}

function roundN(n, places)
{
    let pow10 = Math.pow(10, places);
    return Math.round(n * pow10) / pow10;
}

async function loadRound(r)
{
    r.roundContent.innerHTML = "";

    let avgTimeMacro = 0;
    let sdTimeMacro = 0;

    for (const t of r.round)
    {
        let d = document.createElement("div");

        // console.log(t);
        // continue;

        d.chartArea = document.createElement("div");
        async function createChart()
        {
            d.chartArea.classList.add("test-chart");

            let tClone = JSON.parse(JSON.stringify(t));
            console.log(tClone)

            // Now consider max time
            let sampleRate = 100; // ms
            let maxPoints = MAX_TIME * sampleRate;
            tClone.dataPoints = tClone.dataPoints.slice(0, maxPoints);
            d.chartArea.appendChild(VIZ.drawTest(tClone, false));
        }

        d.label = document.createElement("div");
        d.label.appendChild((()=>{let s=document.createElement("span"); s.innerText=`${t.title}, `; return s})());
        d.label.appendChild((()=>{let s=document.createElement("span"); s.innerText=`Time: ${roundN(t.time, 2)}`; return s})());
        d.label.appendChild((()=>{let s=document.createElement("a"); s.innerText=`Load Chart`; s.addEventListener("click", ()=>createChart()); return s})());
        d.label.classList.add("test-label");
        d.appendChild(d.label);
        d.appendChild(d.chartArea);

        r.roundContent.appendChild(d);
    }
}

async function loadPhase(p)
{
    p.phaseContent.innerHTML = "";

    let avgTimeMacro = 0;
    let sdTimeMacro = 0;

    let lastRound = undefined;
    function toggleRound(r)
    {
        if (r.roundEnabled)
        {
            r.roundContent.innerHTML = "";
            lastRound = undefined;
        }
        else
        {
            // Load all phases
            loadRound(r);
            lastRound = r;
        }
        r.roundEnabled = !r.roundEnabled;
    }

    for (const q of Object.keys(p.phase))
    {
        let d = document.createElement("div");

        d.roundEnabled = false;

        const round = p.phase[q];
        d.round = round;

        let avgTime = round.reduce((s,test)=>s+=test.time, 0) / round.length;
        let sdTime = round.reduce((s,test)=>s+=Math.sqrt((test.time - avgTime) ** 2), 0) / (round.length + 1);

        avgTimeMacro += avgTime;
        sdTimeMacro += sdTime;

        d.label = document.createElement("div");
        d.label.innerHTML = `<span>${q} : </span><span>#tests: ${round.length}, </span><span>Avg: ${roundN(avgTime, 2)} s, </span><span>SD: ${roundN(sdTime, 2)} s</span>`;
        d.label.classList.add("phase-label");
        d.label.addEventListener("click", ()=>{if (lastRound && lastRound !== d) toggleRound(lastRound); toggleRound(d)});
        d.appendChild(d.label);

        d.roundContent = document.createElement("div");
        d.roundContent.classList.add("round-label");
        d.appendChild(d.roundContent);

        p.phaseContent.appendChild(d);
    }

    let numRounds = Object.keys(p.phase).length
    avgTimeMacro /= numRounds;
    sdTimeMacro /= numRounds;

    let macro = document.createElement("div");
    macro.innerHTML = `<span>Macro : </span><span>#rounds: ${numRounds}, </span><span>Avg: ${roundN(avgTimeMacro, 2)} s, </span><span>Avg SD: ${roundN(sdTimeMacro, 2)} s</span>`;
    macro.classList.add("phase-label");

    p.phaseContent.insertBefore(macro, p.phaseContent.firstChild);

}

export default class AnalysisTool
{

    constructor(params)
    {
        this.params = params;
        this.jsonFileReader = new FileReader();
        this.results = [];
        this.domElement = document.body;

        this.init();
    }

    async loadFiles()
    {
        // Load all files
        await (async ()=>{for (const file of this.params.files) {

            await new Promise(resolve=>
            {
                // Set on file read callback
                function onRead(e)
                {
                    var result = JSON.parse(e.target.result);
                    this.results.push(result)
                    resolve();
                }
                this.jsonFileReader.onload = onRead.bind(this);

                this.jsonFileReader.readAsText(file);
            })
        }})()
    }

    async collectData()
    {
        // 2 modes: aggregate and individual
        // collect data works for aggregate
        this.aggregateResults = {};

        // Determine the amount of phases
        let numPhases = Object.keys(this.results[0].results).length;
        let numSurveys = Object.keys(this.results[0].surveys).length;
        console.log(numPhases, numSurveys)

        this.aggregateResults.phases = {};
        this.aggregateResults.surveys = {};

        // for (const result of this.results)
        // {
        //     this.aggregateResults
        // }
    }

    async onClickAggregate()
    {
        this.setMode("aggregate");
    }

    async onClickIndividual()
    {
        this.setMode("individual");

    }

    async draw()
    {
        this.mainBtns = document.createElement("div");
        this.mainBtns.classList.add("main-btns");
        this.content = document.createElement("div");
        this.domElement.appendChild(this.mainBtns);
        this.domElement.appendChild(this.content);

        // Buttons
        const btnAggregate = document.createElement("a");
        btnAggregate.innerText = "Overview";
        this.mainBtns.appendChild(btnAggregate);

        const btnIndividual = document.createElement("a");
        btnIndividual.innerText = "Individual";
        this.mainBtns.appendChild(btnIndividual);

        btnAggregate.addEventListener("click", this.onClickAggregate.bind(this));
        btnIndividual.addEventListener("click", this.onClickIndividual.bind(this));

        // Content
        this.content.classList.add("content");

    }

    async loadIndividualResult(id)
    {
        const result = this.results.find(r=>r.id === id);

        if (!result) return;

        this.content.innerHTML = "";

        // Create survey and phase views
        const idName = document.createElement("h2");
        const surveyList = document.createElement("div");
        const phaseList = document.createElement("div");
        this.content.appendChild(idName);
        this.content.appendChild(surveyList);
        this.content.appendChild(phaseList);

        idName.appendChild((()=>{const d = document.createElement("h2"); d.innerText = `ID: ${id}`; return d})())
        surveyList.appendChild((()=>{const d = document.createElement("h2"); d.innerText = "Surveys"; return d})())
        phaseList.appendChild((()=>{const d = document.createElement("h2"); d.innerText = "Phases"; return d})())

        let lastSurvey = undefined;
        function toggleSurvey(s)
        {
            if (s.surveyEnabled)
            {
                s.surveyContent.innerHTML = "";
                lastSurvey = undefined;
            }
            else
            {
                // Load all questions
                loadSurvey(s);
                lastSurvey = s;
            }
            s.surveyEnabled = !s.surveyEnabled;
        }

        for (let survey of Object.keys(result.surveys))
        {
            let s = document.createElement("div");

            s.survey = result.surveys[survey];
            s.surveyEnabled = false;

            s.label = document.createElement("span");
            s.label.innerText = survey;
            s.label.classList.add("survey-label");
            s.label.addEventListener("click", ()=>{if (lastSurvey && lastSurvey !== s) toggleSurvey(lastSurvey); toggleSurvey(s)});
            s.appendChild(s.label);

            s.surveyContent = document.createElement("div");
            s.surveyContent.classList.add("survey-question-list");
            s.appendChild(s.surveyContent);


            surveyList.appendChild(s)
        }

        let lastPhase = undefined;
        function togglePhase(p)
        {
            if (p.phaseEnabled)
            {
                p.phaseContent.innerHTML = "";
                lastPhase = undefined;
            }
            else
            {
                // Load all phases
                loadPhase(p);
                lastPhase = p;
            }
            p.phaseEnabled = !p.phaseEnabled;
        }

        for (let phase of Object.keys(result.results))
        {
            let p = document.createElement("div");

            p.phase = result.results[phase];
            p.phaseEnabled = false;

            p.label = document.createElement("span");
            p.label.innerText = phase;
            p.label.classList.add("survey-label");
            p.label.addEventListener("click", ()=>{if (lastPhase && lastPhase !== p) togglePhase(lastPhase); togglePhase(p)});
            p.appendChild(p.label);

            p.phaseContent = document.createElement("div");
            p.phaseContent.classList.add("survey-question-list");
            p.appendChild(p.phaseContent);


            phaseList.appendChild(p);
        }

    }

    async loadAggregateView(filters)
    {
        this.content.innerHTML = "";

        // Create sort by dropdown
        const sortByDiv = document.createElement("div");
        this.content.appendChild(sortByDiv);
        let newFilters = [];
        function appendFilter(f)
        {
            sortByDiv.appendChild((()=>{let s = document.createElement("span"); s.innerText = "Filter where : "; return s})())
            let query = document.createElement("select");
            sortByDiv.appendChild(query);
            const options = [
                "Whistle",
                "Sex",
                "Age",
                "Music BG",
                "Pitch ID"
            ];

            for (const o of options)
            {
                let s = document.createElement("option");
                s.innerText = o;
                s.value = o;
                query.appendChild(s);
            }

            const label = document.createElement("span");
            label.innerText = " = ";
            sortByDiv.appendChild(label)

            let queryValue = document.createElement("input");
            queryValue.setAttribute("type", "text");
            sortByDiv.appendChild(queryValue);

            if (f !== undefined)
            {
                query.value = f.filter;
                queryValue.value = f.value;
            }

            let addFilter = document.createElement("a");
            addFilter.innerText = "+";
            sortByDiv.appendChild(addFilter);
            addFilter.addEventListener("click", ()=>{appendFilter()})

            sortByDiv.appendChild((()=>{let s = document.createElement("br"); return s})());

            newFilters.push({filter: query, value: queryValue});
            
        }
        function grabFilters()
        {
            let filterss = [];

            for (const f of newFilters)
            {
                filterss.push({filter: f.filter.value, value: f.value.value});
            }

            return filterss;
        }
        let submit = document.createElement("a");
        submit.innerText = "Update";
        sortByDiv.appendChild(submit);
        submit.addEventListener("click", ()=>{this.loadAggregateView(grabFilters())})
        sortByDiv.appendChild((()=>{let s = document.createElement("br"); return s})());

        if (filters !== undefined)
        {
            for (const f of filters)
            {
                appendFilter(f);
            }
        }
        else
        {
            appendFilter();
        }
        // Create list of all entries
        let tmpResults = [...this.results];
        if (filters !== undefined)
        {
            for (const f of filters)
            {
                const filter = f.filter;
                let value = f.value;
                switch (filter)
                {
                    case "Whistle":
                        value = value.toLowerCase();
                        switch (value)
                        {
                            case "true":
                                tmpResults = tmpResults.filter(v=>v.canWhistle == true);
                                break;
                            case "false":
                                tmpResults = tmpResults.filter(v=>v.canWhistle == false);
                                break;
                            default: 
                                tmpResults = [];
                                break;
                        }
                        break;
                    case "Sex":
                        tmpResults = tmpResults.filter(v=>Object.values(v.surveys)[0].sex.toLowerCase() == value.toLowerCase());
                        break;
                    case "Age":
                        tmpResults = tmpResults.filter(v=>Object.values(v.surveys)[0].age == value);
                        break;
                    case "Music BG":
                        tmpResults = tmpResults.filter(v=>Object.values(v.surveys)[0]["music-background"] == value);
                        break;
                    case "Pitch ID":
                        tmpResults = tmpResults.filter(v=>Object.values(v.surveys)[0]["pitch-id-skills"] == value);
                        break;
                    default:
                        console.log("undefined filter: ", filter);
                        tmpResults = [];
                        break;
                }
            }
        }
        for (const result of tmpResults)
        {
            let newDiv = document.createElement("div");

            newDiv.innerHTML += `<span>ID: ${result.id}</span>`;
            newDiv.innerHTML += `<span>Whistle: ${result.canWhistle}</span>`;
            newDiv.innerHTML += `<span>Sex: ${Object.values(result.surveys)[0].sex}</span>`;
            newDiv.innerHTML += `<span>Age: ${Object.values(result.surveys)[0].age}</span>`;
            newDiv.innerHTML += `<span>Music BG: ${Object.values(result.surveys)[0]["music-background"]}/5</span>`;
            newDiv.innerHTML += `<span>Pitch ID: ${Object.values(result.surveys)[0]["pitch-id-skills"]}/5</span>`;

            newDiv.classList.add("individual-result-list");
            newDiv.addEventListener("click", ()=>this.loadIndividualResult.bind(this)(result.id))
            this.content.appendChild(newDiv);
        }
    }

    async loadIndividualView(filter)
    {
        this.content.innerHTML = "";

        // Create sort by dropdown
        const sortByDiv = document.createElement("div");
        this.content.appendChild(sortByDiv);
        {
            sortByDiv.appendChild((()=>{let s = document.createElement("span"); s.innerText = "Sort By: "; return s})())
            let query = document.createElement("select");
            sortByDiv.appendChild(query);
            const options = [
                "ID",
                "Whistle",
                "Sex",
                "Age",
                "Music BG",
                "Pitch ID"
            ];

            for (const o of options)
            {
                let s = document.createElement("option");
                s.innerText = o;
                s.value = o;
                query.appendChild(s);
            }

            query.addEventListener("change", e=>this.loadIndividualView(e.target.value), false);
            if (filter !== undefined)
            {
                query.value = filter;
            }

        }
        // Create list of all entries
        if (filter !== undefined)
        {
            console.log(filter)
            switch (filter)
            {
                case "ID":
                    this.results.sort((a,b)=>{
                        const idA = a.id.toUpperCase();
                        const idB = b.id.toUpperCase();
                        console.log(idA, idB)
                        if (idA < idB) {
                            return -1;
                        }
                        if (idA > idB) {
                            return 1;
                        }
                        return 0;
                    });
                    break;
                case "Whistle":
                    this.results.sort((a,b)=>{
                        if (a.canWhistle && !b.canWhistle)
                        {
                            return -1;
                        }
                        else if (!a.canWhistle && b.canWhistle)
                        {
                            return 1;
                        }
                        return 0;
                    });
                    break;
                case "Sex":
                    this.results.sort((a,b)=>{
                        const sexA = Object.values(a.surveys)[0].sex.toUpperCase();
                        const sexB = Object.values(b.surveys)[0].sex.toUpperCase();
                        if (sexA < sexB) {
                            return -1;
                        }
                        if (sexA > sexB) {
                            return 1;
                        }
                        return 0;
                    });
                    break;
                case "Age":
                    this.results.sort((a,b)=>{
                        let numA = parseInt(Object.values(a.surveys)[0].age.substring(0,2));
                        let numB = parseInt(Object.values(b.surveys)[0].age.substring(0,2));
                        return numA - numB;
                    });
                    break;
                case "Music BG":
                    this.results.sort((a,b)=>{
                        let numA = parseInt(Object.values(a.surveys)[0]["music-background"]);
                        let numB = parseInt(Object.values(b.surveys)[0]["music-background"]);
                        return numA - numB;
                    });
                    break;
                case "Pitch ID":
                    this.results.sort((a,b)=>{
                        let numA = parseInt(Object.values(a.surveys)[0]["pitch-id-skills"]);
                        let numB = parseInt(Object.values(b.surveys)[0]["pitch-id-skills"]);
                        return numA - numB;
                    });
                    break;
                default:
                    console.log("undefined filter");
                    break;
            }
        }
        for (const result of this.results)
        {
            let newDiv = document.createElement("div");

            newDiv.innerHTML += `<span>ID: ${result.id}</span>`;
            newDiv.innerHTML += `<span>Whistle: ${result.canWhistle}</span>`;
            newDiv.innerHTML += `<span>Sex: ${Object.values(result.surveys)[0].sex}</span>`;
            newDiv.innerHTML += `<span>Age: ${Object.values(result.surveys)[0].age}</span>`;
            newDiv.innerHTML += `<span>Music BG: ${Object.values(result.surveys)[0]["music-background"]}/5</span>`;
            newDiv.innerHTML += `<span>Pitch ID: ${Object.values(result.surveys)[0]["pitch-id-skills"]}/5</span>`;

            newDiv.classList.add("individual-result-list");
            newDiv.addEventListener("click", ()=>this.loadIndividualResult.bind(this)(result.id))
            this.content.appendChild(newDiv);
        }


    }

    async setMode(mode)
    {
        switch(mode)
        {
            case "aggregate":
                this.loadAggregateView();
                break;
            case "individual":
                this.loadIndividualView();
                break;
            default:
                break;
        }
    }

    async init()
    {

        await this.loadFiles();
        await this.draw();
        await this.setMode("individual");
    }
}