import ChartJS from "./chart.js"

function drawTest(test, interactive)
{
    let labels = test.dataPoints.map(xy=>{ return parseInt(xy[0]).toString() });
    let datapoints1 = test.dataPoints.map(xy=>{ return xy[1] });
    let datapoints2 = test.dataPoints.map(xy=>{ return test.metadata.endValue });

    let chartParams = {
        title: test.title,
        subtitles: ["Test Results", "Correct Value"],
        labels: labels,
        datapoints: [datapoints1, datapoints2],
        min: 0,
        max: 1000,
        interactive: interactive
    };
    let chart = new ChartJS(chartParams);
    return chart.generateHTML();
}

function drawRound(round, interactive)
{
    let domElem = document.createElement("div");
    domElem.classList.add("inline");

    for (let j = 0; j < round.length; j++)
    {
        domElem.appendChild(drawTest(round[j], interactive));
    }

    return domElem;
}

function drawEvaluation(results, interactive)
{
    let domElem = document.createElement("div");
    domElem.classList.add("img-fit");
    domElem.style.overflowX = "scroll";
    domElem.style.whiteSpace = "nowrap";

    let rounds = Object.keys(results);

    for (let i = 0; i < rounds.length; i++)
    {
        let round = results[rounds[i]];
        domElem.appendChild(drawRound(round, interactive));
    }

    return domElem;
}

export {drawTest, drawRound, drawEvaluation}