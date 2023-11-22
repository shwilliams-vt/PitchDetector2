import * as VIZ from "../tools/viz/viz.js"
import ChartJS from "../tools/viz/chart.js"
import * as UTILS from "../util.js";

const MAX_TIME = 90 // s;

const config = {
    phases: 
    [
        {
            name: "phase1",
            rounds: 
            [
                {
                    name: "Round 1"
                }
            ]
        },
        {
            name: "phase2",
            rounds: 
            [
                {
                    name: "Round 1"
                }
            ]
        },
        {
            name: "phase3",
            rounds: 
            [
                {
                    name: "Round 1"
                }
            ]
        },
        {
            name: "phase4",
            rounds: 
            [
                {
                    name: "Round 1"
                }
            ]
        }
    ]
}

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

function classifyGraph(test, n)
{
    // Some heuristics
    const accuracyThreshold = 0.93;
    const variabilityThreshold = 0.007;
    const sdThreshold = 0.005;

    const startValue = test.metadata.startValue;
    const endValue = test.metadata.endValue;
    const max = test.metadata.max;
    const min = test.metadata.min;
    const scale = max - min;
    // const vari = Math.abs(test.dataPoints.reduce((s,v)=>s+=(v[1] - startValue) / scale, 0)) / test.dataPoints.length;
    const avg = test.dataPoints.reduce((s,v)=>s+=parseFloat(v[1]), 0) / test.dataPoints.length;
    const sd = Math.sqrt(test.dataPoints.reduce((s,v)=>s+=((v[1] - avg))**2, 0) / (test.dataPoints.length - 1)) / scale;
    const acc = 1 - Math.abs(test.dataPoints[test.dataPoints.length - 1][1] - endValue) / scale;
    const err = Math.sqrt(test.dataPoints.reduce((s,v)=>s+=((v[1]-endValue)**2), 0)) / (test.dataPoints.length - 1) / scale;
    
    let vari = 0;
    for (let i = 1; i < test.dataPoints.length; i++)
    {
        vari += (test.dataPoints[i][1] - test.dataPoints[i-1][1]) ** 4;
    }
    vari = Math.sqrt(vari) / (test.dataPoints.length - 1);

    // console.log(n, vari,sd,acc, err);
    // console.log(n, vari >= variabilityThreshold, sd >= sdThreshold, acc >= accuracyThreshold)
    let category = -1;
    // Now classify
    if (vari < variabilityThreshold && acc < accuracyThreshold && sd < sdThreshold)
    {
        // Two separate lines pretty much
        category = 1;
    }
    else if (vari < variabilityThreshold && acc >= accuracyThreshold && sd < sdThreshold)
    {
        // Probably person thought it was close enough
        category = 2;
    }
    else if (vari >= variabilityThreshold && acc < accuracyThreshold && sd < sdThreshold)
    {
        // Person tried a little but did not succeed
        category = 4;
    }
    else if (vari >= variabilityThreshold && acc < accuracyThreshold && sd >= sdThreshold)
    {
        // Person tried a lot but did not succeed
        category = 3;
    }
    else if (vari >= variabilityThreshold && acc >= accuracyThreshold && sd >= sdThreshold)
    {
        // Person tried a lot and succeeded
        category = 5;
    }
    else if (vari >= variabilityThreshold && acc >= accuracyThreshold && sd < sdThreshold)
    {
        // Person tried a little and succeeded
        category = 6;
    }

    return {
        category: category,
        variability: vari,
        sd: sd,
        accuracy: acc,

    };
}

async function loadRound(r)
{
    r.roundContent.innerHTML = "";

    let avgTimeMacro = 0;
    let sdTimeMacro = 0;
    let n = 1;
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

            // Now consider max time
            let sampleRate = 100; // ms
            const time = Math.min(tClone.time, MAX_TIME);
            let maxPoints = time * ( 1000 / sampleRate);
            tClone.dataPoints = tClone.dataPoints.slice(0, maxPoints);
            d.chartArea.appendChild(VIZ.drawTest(tClone, false));
        }
        // const category = classifyGraph(t, n);
        // t.category = category;
        const category = (t.test ? t.test : t).category;

        d.label = document.createElement("div");
        d.label.appendChild((()=>{let s=document.createElement("span"); s.innerText=`${n}: ${t.title}, `; return s})());
        d.label.appendChild((()=>{let s=document.createElement("span"); s.innerText=`Time: ${roundN(t.time, 2)}`; return s})());
        d.label.appendChild((()=>{let s=document.createElement("span"); s.innerText=`Category: ${roundN(category.category, 6)}`; return s})());
        d.label.appendChild((()=>{let s=document.createElement("span"); s.innerText=`Variability: ${roundN(category.variability, 6)}`; return s})());
        d.label.appendChild((()=>{let s=document.createElement("span"); s.innerText=`SD: ${roundN(category.sd, 6)}`; return s})());
        d.label.appendChild((()=>{let s=document.createElement("span"); s.innerText=`Accuracy: ${roundN(category.accuracy, 3)}`; return s})());
        d.label.appendChild((()=>{let s=document.createElement("a"); s.innerText=`Load Chart`; s.addEventListener("click", ()=>createChart()); return s})());
        d.label.classList.add("test-label");
        d.appendChild(d.label);
        d.appendChild(d.chartArea);

        r.roundContent.appendChild(d);
        n++;
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

        for (const t of round)
        {
            const data = t.test;

            // Classify data
            if (data)
            {
                t.test.category = classifyGraph(data);
            }
            else
            {
                t.category = classifyGraph(t);
            }

        }

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
        this.loadbar = params.loadbar;

        this.init();
    }

    async loadFiles()
    {
        // For load bar 
        let scope = this;
        let i = 1;
        let num = this.params.files.length;
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

                if (scope.loadbar)
                {
                    scope.loadbar.innerHTML = `${i}/${num}`;
                }
                i++;
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
                console.log(p.phase)
                loadPhase(p, p.phase);
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

    reset()
    {

    }

    fittsLawOld(results, phaseName)
    {
        // For fitts law, we need to normalize both x and y
        const normalizedResultsX = [];
        const normalizedResultsY= [];

        // number of data points to interpolate
        const nDataPoints = 1000;
        function interpolate(x, xp, fp) {
            var n = xp.length;
            var i = 1;
            while (i < n && x > xp[i]) {
              i++;
            }
            var x0 = xp[i - 1];
            var x1 = xp[i];
            var f0 = fp[i - 1];
            var f1 = fp[i];
            return f0 + (f1 - f0) * (x - x0) / (x1 - x0);
          }

        for (const result of results)
        {
            const phase = result.results[phaseName];

            // Consider Round 1 only for this study
            const round1 = phase["Round 1"];
            for (const test of round1)
            {
                // TODO Add entire test
                // a. Normalize y (| end - start | => [0, 1])
                const end = test.metadata.endValue;
                const range = Math.abs(end - test.metadata.startValue);
                const tMax = test.dataPoints[test.dataPoints.length - 1][0];
                // b. Normalize x (tf - t0 => [0, 1])
                const normalizedTestX = [];
                const normalizedTestY = [];

                for (const tpos of test.dataPoints)
                {
                    normalizedTestX.push(tpos[0] / tMax);
                    normalizedTestY.push(Math.abs(tpos[1] - end) / range);
                }
                normalizedResultsX.push(normalizedTestX);
                normalizedResultsY.push(normalizedTestY);
            }
        }

        // TODO aggregate and plot
        let aggregate = [];
        let step = 1 / nDataPoints;
        for (let i = 0; i <= 1; i += step)
        {
            let avg = 0;
            for (const normalized in normalizedResultsX)
            {
                const normalX = normalizedResultsX[normalized];
                const normalY = normalizedResultsY[normalized];

                avg += interpolate(i, normalX, normalY)
            }
            avg /= normalizedResultsX.length;
            aggregate.push([i, avg]);
        }
        
        
        // console.log(aggregate);

        // Formulate aggregate into a pseudo test
        const test = {
            dataPoints: [aggregate,[]],
            endValue: 0,
            metadata: {
                endValue: 0,
                min: -1,
                max: 1
            },
            title:"Average Normalized Task Graph",
            labels : {
                x: "Time (normalized)",
                y: "Distance (normalized)"
            }
        };

        return test;

    }

    fittsLawOldAll(results, phaseName)
    {
        // For fitts law, we need to normalize both x and y
        const normalizedResults = [];

        for (const result of results)
        {
            const phase = result.results[phaseName];

            // Consider Round 1 only for this study
            const round1 = phase["Round 1"];
            for (const test of round1)
            {
                // TODO Add entire test
                // a. Normalize y (| end - start | => [0, 1])
                const end = test.metadata.endValue;
                const range = Math.abs(end - test.metadata.startValue);
                const tMax = test.dataPoints[test.dataPoints.length - 1][0];
                // b. Normalize x (tf - t0 => [0, 1])
                const normalizedTest = [];

                for (const tpos of test.dataPoints)
                {
                    normalizedTest.push([tpos[0] / tMax, Math.abs(tpos[1] - end) / range]);
                }
                normalizedResults.push(normalizedTest);
            }
        }

        // TODO aggregate and plot
        // let aggregate = [];
        // let step = 1 / nDataPoints;
        // for (let i = 0; i <= 1; i += step)
        // {
        //     let avg = 0;
        //     for (const normalized in normalizedResultsX)
        //     {
        //         const normalX = normalizedResultsX[normalized];
        //         const normalY = normalizedResultsY[normalized];

        //         avg += interpolate(i, normalX, normalY)
        //     }
        //     avg /= normalizedResultsX.length;
        //     aggregate.push([i, avg]);
        // }

        UTILS.downloadJSON(normalizedResults);
        
        
        // console.log(aggregate);

        // Formulate aggregate into a pseudo test
        const test = {
            dataPoints: [],
            endValue: 0,
            metadata: {
                endValue: 0,
                min: -1,
                max: 1
            },
            title:"All Normalized Task Graph",
            labels: {
                x: "Time (normalized)",
                y: "Distance (normalized)"
            }
        };

        return test;

    }


    fittsLaw(results, phaseName)
    {
        
        const aggregate = [];

        function linearRegression(x, y) {
            var n = x.length;
            var sumX = 0;
            var sumY = 0;
            var sumXY = 0;
            var sumXX = 0;
            var sumYY = 0;
        
            for (var i = 0; i < n; i++) {
                sumX += x[i];
                sumY += y[i];
                sumXY += x[i] * y[i];
                sumXX += x[i] * x[i];
                sumYY += y[i] * y[i];
            }
        
            var slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            var intercept = (sumY - slope * sumX) / n;
            var r = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
            var r2 = r * r;
        
            return {slope: slope, intercept: intercept, r: r, r2: r2};
        }
        

        // Define boundaries
        const range = 1000.0;
        const tMax = Math.max(...results.map(result=>Math.max(...result.results[phaseName]["Round 1"].map(test=>test.time))));
        let n = 0;
        let nT = 0;
        let maxTime = 999;//15;

        for (const result of results)
        {
            const phase = result.results[phaseName];

            // Consider Round 1 only for this study
            const round1 = phase["Round 1"];
            for (const test of round1)
            {
                nT++;
                if (test.time > maxTime)
                    continue;
                
                // const t = test.time / tMax;
                // const d = Math.abs(test.metadata.endValue - test.metadata.startValue) / range;
                const t = test.time;
                const d = Math.abs(test.metadata.endValue - test.metadata.startValue);
                const other = Math.log2(2 * d);
                aggregate.push([t, other]);
                n++;
            }
        }

        const regress = [];
        const d = linearRegression(aggregate.map(x=>x[0]), aggregate.map(y=>y[1]));
        for (let i = 0; i < aggregate.length; i++)
        {
            regress.push([aggregate[i][0], d.slope * aggregate[i][0] + d.intercept]);
        }

        // Formulate aggregate into a pseudo test
        const test = {
            dataPoints: [aggregate, regress],
            endValue: 0,
            metadata: {
                endValue: 0,
                min: 0,
                max: 20
            },
            title:`Fitts' Law (n=${n}/${nT}, m=${d.slope.toFixed(3)}, b=${d.intercept.toFixed(3)}, r=${d.r.toFixed(3)}, r2=${d.r2.toFixed(4)})`,
            labels : {
                x: "Time (seconds)",
                y: "log2(2 x Distance)"
            }
        };

        return test;

    }

    dLaw(results, phaseName)
    {
        
        const aggregate = [];

        function linearRegression(x, y) {
            var n = x.length;
            var sumX = 0;
            var sumY = 0;
            var sumXY = 0;
            var sumXX = 0;
            var sumYY = 0;
        
            for (var i = 0; i < n; i++) {
                sumX += x[i];
                sumY += y[i];
                sumXY += x[i] * y[i];
                sumXX += x[i] * x[i];
                sumYY += y[i] * y[i];
            }
        
            var slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            var intercept = (sumY - slope * sumX) / n;
            var r = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
            var r2 = r * r;
        
            return {slope: slope, intercept: intercept, r: r, r2: r2};
        }
        

        // Define boundaries
        const range = 1000.0;
        const tMax = Math.max(...results.map(result=>Math.max(...result.results[phaseName]["Round 1"].map(test=>test.time))));
        let n = 0;
        let nT = 0;
        let maxTime = 999;//15;

        for (const result of results)
        {
            const phase = result.results[phaseName];

            // Consider Round 1 only for this study
            const round1 = phase["Round 1"];
            for (const test of round1)
            {
                nT++;
                if (test.time > maxTime)
                    continue;
                
                // const t = test.time / tMax;
                // const d = Math.abs(test.metadata.endValue - test.metadata.startValue) / range;
                const t = test.time;
                const d = Math.abs(test.metadata.endValue - test.metadata.startValue);
                const other = d;
                aggregate.push([t, other]);
                n++;
            }
        }

        const regress = [];
        const d = linearRegression(aggregate.map(x=>x[0]), aggregate.map(y=>y[1]));
        for (let i = 0; i < aggregate.length; i++)
        {
            regress.push([aggregate[i][0], d.slope * aggregate[i][0] + d.intercept]);
        }

        // Formulate aggregate into a pseudo test
        const test = {
            dataPoints: [aggregate, regress],
            endValue: 0,
            metadata: {
                endValue: 0,
                min: 0,
                max: 100
            },
            title:`Time by Distance (n=${n}/${nT}, m=${d.slope.toFixed(3)}, b=${d.intercept.toFixed(3)}, r=${d.r.toFixed(3)}, r2=${d.r2.toFixed(4)})`,
            labels : {
                x: "Time (seconds)",
                y: "Distance"
            }
        };

        return test;

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
                "Pitch ID",
                "Category",
                "Phase3Choice"
            ];

            for (const o of options)
            {
                let s = document.createElement("option");
                s.innerText = o;
                s.value = o;
                query.appendChild(s);
            }

            let domEqStuff = document.createElement("select");
            sortByDiv.appendChild(domEqStuff)
            const eqStuff = [
                "===",
                "==",
                "<",
                "<=",
                ">",
                ">="
            ];
            for (const o of eqStuff)
            {
                let s = document.createElement("option");
                s.innerText = o;
                s.value = o;
                domEqStuff.appendChild(s);
            }

            let queryValue = document.createElement("input");
            queryValue.setAttribute("type", "text");
            sortByDiv.appendChild(queryValue);

            if (f !== undefined)
            {
                query.value = f.filter;
                domEqStuff.value = f.comparison;
                queryValue.value = f.value;
            }

            let addFilter = document.createElement("a");
            addFilter.innerText = "+";
            sortByDiv.appendChild(addFilter);
            addFilter.addEventListener("click", ()=>{appendFilter()})

            sortByDiv.appendChild((()=>{let s = document.createElement("br"); return s})());

            newFilters.push({filter: query, comparison: domEqStuff, value: queryValue});
            
        }
        function grabFilters()
        {
            let filterss = [];

            for (const f of newFilters)
            {
                filterss.push({filter: f.filter.value, comparison:f.comparison.value, value: f.value.value});
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
        // Create list of all entries deep copy
        // let tmpResults = [...this.results];
        let tmpResults = this.results.map(v=>{
            let newV = {...v};
            newV.results = {...newV.results};
            for (const phase of Object.keys(newV.results))
            {
                newV.results[phase] = {...newV.results[phase]};
                for (const round of Object.keys(newV.results[phase]))
                {
                    // console.log(newV.results[phase][round])
                    newV.results[phase][round] = [...newV.results[phase][round]];
                }   
            }

            return newV;
        });


        // Categorize all tests
        for (const res of tmpResults)
        {
            for (const phase of Object.values(res.results))
            {
                for (const round of Object.keys(phase))
                {
                    for (const test in phase[round])
                    {
                        phase[round][test].category = classifyGraph(phase[round][test]);
                    }
                }
            }
        }

        const presurvey = function(result)
        {
            return Object.values(result.surveys)[0];
        }

        if (filters !== undefined)
        {
            for (const f of filters)
            {
                const filter = f.filter;
                let comparison = f.comparison;
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
                        tmpResults = tmpResults.filter(v=>{
                            const resultValue = presurvey(v)["sex"].toLowerCase();
                            const filterValue = value.toLowerCase();
                            return new Function("a","b", `return a ${comparison} b`)(resultValue, filterValue);
                            });
                        break;
                    case "Age":
                        tmpResults = tmpResults.filter(v=>{
                            const resultValue = presurvey(v)["age"];
                            const filterValue = value;
                            return new Function("a","b", `return a ${comparison} b`)(resultValue, filterValue);
                            });
                        break;
                    case "Music BG":
                        tmpResults = tmpResults.filter(v=>{
                                const resultValue = presurvey(v)["music-background"];
                                const filterValue = value;
                                return new Function("a","b", `return a ${comparison} b`)(resultValue, filterValue);
                            });
                        break;
                    case "Pitch ID":
                        tmpResults = tmpResults.filter(v=>{
                                const resultValue = presurvey(v)["pitch-id-skills"];
                                const filterValue = value;
                                return new Function("a","b", `return a ${comparison} b`)(resultValue, filterValue);
                            });
                        break;
                    case "Category":
                        let vals = value.split(",").map(v=>parseInt(v));
                        for (const res of tmpResults)
                        {
                            for (const phase of Object.values(res.results))
                            {
                                for (const round of Object.keys(phase))
                                {
                                    phase[round] = phase[round].filter(v=>vals.includes(v.category.category));
                                    // console.log(phase[round])
                                }
                            }
                        }
                        break;
                        case "Phase3Choice":
                            tmpResults = tmpResults.filter(v=>{
                                console.log(v.surveys)
                                const resultValue = v.surveys["phase3"]["method-used"].toLowerCase();
                                const filterValue = value.toLowerCase()     ;
                                return new Function("a","b", `return a ${comparison} b`)(resultValue, filterValue);
                            });
                            break;
                    default:
                        console.log("undefined filter: ", filter);
                        tmpResults = [];
                        break;
                }
            }
        }

        // Now that we've filtered, create summary

        let summary = {};

        // Create some basic overview things
        let totalNum = tmpResults.length;

        summary.totalNum = totalNum;

        // Create pseudo record
        summary["surveys"] = {};
        summary["results"] = {};

        // Do surveys first
        let surveyNum = 0;
        for (const survey of Object.values(this.results[0]["surveys"]))
        {
            if (surveyNum > 0)
            {
                //console.log(survey);

                for (const answer of Object.values(survey))
                {
                    if (!isNaN(parseInt(answer)))
                    {
                        //console.log(answer)
                    }
                }

            }
            surveyNum++;
        }

        // Then results
        for (const phaseName of Object.values(config.phases).map(p=>p.name))
        {
            const phase = config.phases.find(p=>p.name===phaseName);
            // const phase = this.results[0]["results"][phaseName];

            summary["results"][phaseName] = {};

            // for (const roundName of Object.keys(phase))
            for (const roundName of phase.rounds)
            {
                // const round = phase[roundName];
                try {
                    summary["results"][phaseName][roundName.name] = [];
                }
                catch {
                    console.log("Could not load survey");
                }
            }
        }

        // console.log(summary)
        // console.log(this.results[0])


        let sexVals = [
            ["Male", 0],
            ["Female", 0],
            ["Prefer not to answer", 0]
        ]

        let canWhistleVals = [
            [true, 0], [false, 0]
        ]

        let ageRangeVals = [
            ["18-24", 0],
            ["24-35", 0],
            ["35-50", 0],
            ["50-65", 0],
            ["65+", 0],
            ["Prefer not to answer", 0]
        ];

        let voiceTypeVals = [
            ["Low", 0],
            ["Medium", 0],
            ["High", 0]
        ];

        let musicBGVals = [
            [0, 0],[1, 0],[2, 0],[3, 0],[4, 0],[5, 0]
        ];

        let pitchIDSkillsVals = [
            [0, 0],[1, 0],[2, 0],[3, 0],[4, 0],[5, 0]
        ];

        // Also record the avg results
        function incrementStat(result, stat, key)
        {
            let s = stat.find(v=>v[0]===Object.values(result.surveys)[0][key]);

            if (s)
            {
                s[1]++;
            }
        }

        for (const result of tmpResults)
        {

            // Whistling
            canWhistleVals.find(v=>v[0]===result.canWhistle)[1]++;

            // Sex
            // sexVals.find(v=>v[0]===Object.values(result.surveys)[0].sex)[1]++;
            incrementStat(result, sexVals, "sex");

            // Age
            // ageRangeVals.find(v=>v[0]===Object.values(result.surveys)[0].age)[1]++;
            incrementStat(result, ageRangeVals, "age");

            // Voice type
            // voiceTypeVals.find(v=>v[0]===Object.values(result.surveys)[0]["voice-type"])[1]++;
            incrementStat(result, voiceTypeVals, "voice-type");

            // Music BG
            // musicBGVals.find(v=>v[0]===Object.values(result.surveys)[0]["music-background"])[1]++;
            incrementStat(result, musicBGVals, "music-background");

            // Pitch ID
            // pitchIDSkillsVals.find(v=>v[0]===Object.values(result.surveys)[0]["pitch-id-skills"])[1]++;
            incrementStat(result, pitchIDSkillsVals, "pitch-id-skills");

            // Phases (results)
            for (const phaseName of Object.keys(result["results"]))
            {
                const phase = result["results"][phaseName];

                for (const roundName of Object.keys(phase))
                {
                    const round = phase[roundName];

                    // console.log(roundName)
                    // console.log(round)

                    for (const test of round)
                    {
                        try {
                            summary["results"][phaseName][roundName].push({time:test.time, test:test}); // sum val, 
                        }
                        catch {
                            console.log("Could not load survey");
                        }
                    }

                }
            }
        }

        let num = document.createElement("span");
        num.innerHTML = `<br><h2>Showing ${totalNum} of ${this.results.length} records (${roundN((100 * totalNum / this.results.length), 2)}% included)</h2><br>`
        this.content.appendChild(num);

        function dResults(asJSON)
        {
            if (asJSON)
                UTILS.downloadJSON(JSON.stringify(tmpResults));
            else
                UTILS.downloadJSONAsCSV(tmpResults);
        }
        this.content.appendChild((()=>{let d = document.createElement("button"); d.innerText="Download Filtered Results"; d.addEventListener("click", ()=>dResults(false)); return d})());

        this.content.appendChild((()=>{let d = document.createElement("div");d.innerHTML = "<h3>Survey Results</h3>"; return d})());

        // Now draw them
        const drawMacroChart = async function (name, vals, whereTo)
        {

            if (whereTo === undefined)
            {
                whereTo = this.content;
            }
            let d = document.createElement("div");
            d.style.width = "500px";
            d.style.height = "500px";
            d.style.display = "inline-block";
            whereTo.appendChild(d);

            await UTILS.waitOneFrame();

            d.appendChild(await new ChartJS({
                type: "bar",
                title: name,
                subtitles: [name],
                xLabel: " ",
                labels: vals.map(v=>v[0]),
                datapoints: [vals.map(v=>v[1])],
                min: 0,
                max: totalNum,
                interactive: false
            }).generateHTML());
        }.bind(this)
        // Whistling
        await drawMacroChart("Whistling", canWhistleVals);

        // Sex
        await drawMacroChart("Sex", sexVals);

        // Age
        await drawMacroChart("Age", ageRangeVals);

        // Voice type
        await drawMacroChart("Voice Type", voiceTypeVals);

        // Music BG
        await drawMacroChart("Music BG", musicBGVals);

        // Pitch ID
        await drawMacroChart("Pitch ID", pitchIDSkillsVals);

        // Fitts law
        // await drawMacroChart("Fitt's Law", this.fittsLaw(tmpResults, "phase3"));
        this.content.appendChild((()=>
            {
                let d = document.createElement("div");
                d.style.height = "600px";
                d.appendChild(VIZ.drawPlot(this.fittsLaw(tmpResults, "phase3"), false));
                return d;
            })()            
        );
        this.content.appendChild((()=>
            {
                let d = document.createElement("div");
                d.style.height = "600px";
                d.appendChild(VIZ.drawPlot(this.dLaw(tmpResults, "phase3"), false));
                return d;
            })()            
        );
        this.content.appendChild((()=>
            {
                let d = document.createElement("div");
                d.style.height = "600px";
                d.appendChild(VIZ.drawPlotMany(this.fittsLawOldAll(tmpResults, "phase3"), false));
                return d;
            })()            
        );
        
        this.content.appendChild((()=>
            {
                let d = document.createElement("div");
                d.style.height = "600px";
                d.appendChild(VIZ.drawPlot(this.fittsLawOld(tmpResults, "phase3"), false));
                return d;
            })()            
        );
        
        this.content.appendChild((()=>{let d = document.createElement("div");d.innerHTML = "<h3>Phase Results</h3>"; return d})());

        for (const phaseName of Object.keys(summary["results"]))
        {
            let phaseResults = document.createElement("div");
            let pNDiv = document.createElement("h4");
            pNDiv.innerHTML = phaseName;
            this.content.appendChild(pNDiv);
            this.content.appendChild(phaseResults);

            loadPhase({phaseContent: phaseResults, phase: summary["results"][phaseName]});
            // phaseResults.innerHTML += "<br/>"
        }

        // Custom numerical view thing
        let customNumericalView = document.createElement("div");
        customNumericalView.appendChild((()=>{let h = document.createElement("h3"); h.innerText = "Custom Numerical View"; return h})())
        this.content.appendChild(customNumericalView);
        {
            // Get queried stuff from filtered results
            function getQueriedStuff(sn, q)
            {
                let responses = [];
                for (const result of tmpResults)
                {
                    const survey = Object.values(result["surveys"])[parseInt(sn)];

                    if (!survey)
                    continue;

                    const response = survey[q];

                    if (!response)
                    continue;

                    let found = false;
                    let foundResult = undefined;
                    for (const r of responses)
                    {
                        if (r.key === response)
                        {
                            found = true;
                            foundResult = r;
                            break;
                        }
                    }
                    if (found)
                    {
                        foundResult.num++;
                    }
                    else
                    {
                        responses.push({key: response, num: 1});
                    }
                }

                let result = [];
                for (const r of responses)
                {
                    result.push(Object.values(r));
                }
                return result;
            }
            // Add to custom view
            async function createCustomNumericalView(sn, q)
            {
                let frame = document.createElement("div");
                await drawMacroChart(q, getQueriedStuff(sn, q), customNumericalView)
                customNumericalView.appendChild(frame);
                createAddCustomNumericalViewButton();
            }
            // Create custom view query
            function createCustomNumericalViewQuery()
            {
                let query = document.createElement("div");
                query.innerHTML += "<span>Survey Number: </span>"
                
                let sn = document.createElement("input");
                sn.setAttribute("type", "text");
                query.appendChild(sn);

                query.appendChild((()=>{let s = document.createElement("span");s.innerText="Query/Question/Key: ";return s;})());

                let q = document.createElement("input");
                q.setAttribute("type", "text");
                query.appendChild(q);

                let sbmt = document.createElement("button");
                sbmt.innerText = "Submit";
                sbmt.addEventListener("click", ()=>{console.log(sn);console.log(q);createCustomNumericalView(sn.value, q.value)})
                query.appendChild(sbmt);

                customNumericalView.appendChild(query);
            }
            // Add ability to create anotha one
            function createAddCustomNumericalViewButton ()
            {
                let btn = document.createElement("button");
                btn.innerText = "Add a custom numerical view";
                btn.addEventListener("click", createCustomNumericalViewQuery);
                customNumericalView.appendChild(btn);
            }
            
            createAddCustomNumericalViewButton();
            // createCustomView(<survey num>, <query>);
        }

        // Custom descriptive view thing
        let customDescriptiveView = document.createElement("div");
        customDescriptiveView.appendChild((()=>{let h = document.createElement("h3"); h.innerText = "Custom Descriptive View"; return h})())
        this.content.appendChild(customDescriptiveView);
        {
            // Get queried stuff from filtered results
            function getQueriedStuff(sn, q)
            {
                let responses = [];
                for (const result of tmpResults)
                {
                    const survey = Object.values(result["surveys"])[parseInt(sn)];

                    if (!survey)
                    continue;

                    const response = survey[q];

                    if (!response)
                    continue;

                    responses.push(response);
                }

                return responses;
            }
            // Add to custom view
            async function createCustomDescriptiveView(sn, q)
            {
                let stuff = getQueriedStuff(sn, q);
                if (stuff.length == 0)
                {
                    window.alert(`No results found for query: ${q} in survey number ${sn}.`);
                }
                else
                {
                    // Create text file with results
                    let fString = `Number,${q}\n`;
                    let i = 1;
                    stuff.forEach(thing=>{
                        fString += `${i},${thing}\n`;
                        i++;
                    })

                    const blob = new Blob([fString], {type: 'text/csv'});
                    const filename = `results-q-${q}-sn-${sn}.csv`;
                    if(window.navigator.msSaveOrOpenBlob) {
                        window.navigator.msSaveBlob(blob, filename);
                    }
                    else{
                        const elem = window.document.createElement('a');
                        elem.href = window.URL.createObjectURL(blob);
                        elem.download = filename;        
                        document.body.appendChild(elem);
                        elem.click();        
                        document.body.removeChild(elem);
                    }
                    // createAddCustomDescriptiveViewButton();
                }
            }
            // Create custom view query
            function createCustomDescriptiveViewQuery()
            {
                let query = document.createElement("div");
                query.innerHTML += "<span>Survey Number: </span>"
                
                let sn = document.createElement("input");
                sn.setAttribute("type", "text");
                query.appendChild(sn);

                query.appendChild((()=>{let s = document.createElement("span");s.innerText="Query/Question/Key: ";return s;})());

                let q = document.createElement("input");
                q.setAttribute("type", "text");
                query.appendChild(q);

                let sbmt = document.createElement("button");
                sbmt.innerText = "Submit";
                sbmt.addEventListener("click", ()=>{console.log(sn);console.log(q);createCustomDescriptiveView(sn.value, q.value)})
                query.appendChild(sbmt);

                customDescriptiveView.appendChild(query);
            }
            // Add ability to create anotha one
            function createAddCustomDescriptiveViewButton ()
            {
                let btn = document.createElement("button");
                btn.innerText = "Add a custom descriptive view";
                btn.addEventListener("click", createCustomDescriptiveViewQuery);
                customDescriptiveView.appendChild(btn);
            }
            
            createAddCustomDescriptiveViewButton();
            // createCustomView(<survey num>, <query>);
        }
        

        this.content.appendChild((()=>{let d = document.createElement("div");d.innerHTML = "<h3>Resulting Items</h3>"; return d})());

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

    async categorize()
    {
        for (const result of this.results)
        {
            for (const phase of Object.keys(result.results))
            {
                for (const round of Object.keys(result.results[phase]))
                {
                    let tests = result.results[phase][round];
                    for (const test of tests)
                    {
                        test.category = classifyGraph(test);
                    }
                }
            }

            return result;
        }
    }

    async init()
    {
        await this.loadFiles();
        await this.categorize();
        await this.draw();
        await this.setMode("individual");
    }
}