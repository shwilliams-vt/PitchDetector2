import ChartJS from "./chart.js"

function drawTest(test)
{
    let labels = test.dataPoints.map(xy=>{ return parseInt(xy[0]).toString() });
    let datapoints1 = test.dataPoints.map(xy=>{ return xy[1] });
    let datapoints2 = test.dataPoints.map(xy=>{ return test.metadata.endValue });

    let chartParams = {
        titles: ["Test 1 Results", "Correct Value"],
        labels: labels,
        datapoints: [datapoints1, datapoints2]
    };
    let chart = new ChartJS(chartParams);
    return chart.generateHTML();
}

function drawRound(round)
{
    let domElem = document.createElement("div");

    for (let j = 0; j < round.length; j++)
    {
        domElem.appendChild(drawTest(round[j]));
    }

    return domElem;
}

function drawEvaluation(results)
{
    let domElem = document.createElement("div");

    let rounds = Object.keys(results);

    for (let i = 0; i < rounds.length; i++)
    {
        let round = results[rounds[i]];
        domElem.appendChild(drawRound(round));
    }

    return domElem;
}

export {drawTest, drawRound, drawEvaluation}