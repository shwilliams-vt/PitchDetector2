import { waitOneFrame } from "../../util.js";

const defaultConfig = {
    type: 'line',
    data: {},
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Chart.js Line Chart - Cubic interpolation mode'
        },
      },
      interaction: {
        intersect: false,
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Value'
          },
          suggestedMin: 0,
          suggestedMax: 10
        }
      }
    },
  };

export default class ChartJS
{

    constructor(params)
    {

        params = params || {};

        params.interactive = params.interactive || false;

        let config = defaultConfig;

        params.titles = params.titles || ["Untitled", "Untitled"];

        const labels = params.labels //
        const datapoints = params.datapoints // [0, 20, 20, 60, 60, 120, NaN, 180, 120, 125, 105, 110, 170];
        const data = {
            labels: labels,
            datasets: [
                {
                    label: params.titles[0],
                    data: datapoints[0],
                    borderColor: "#FF0000",
                    fill: false,
                    cubicInterpolationMode: 'monotone',
                    tension: 0.4
                },
                {
                    label: params.titles[1],
                    data: datapoints[1],
                    borderColor: "#0000FF",
                    fill: false,
                    cubicInterpolationMode: 'monotone',
                    tension: 0.4
                }
            ]
        };

        this.chartParams = {type: "line", data:data};
        this.params = params;

    }

    generateHTML()
    {
        this.domElem = document.createElement("div");
        let canvas = document.createElement("canvas");
    
        this.domElem.appendChild(canvas);

        this.chart = new Chart(canvas.getContext("2d"), this.chartParams);

        
        let scope = this;
        if (!this.params.interactive)
        {
            (async () => {
              await waitOneFrame();
              await waitOneFrame();
              await waitOneFrame();
              await waitOneFrame();
              var newCanvas = canvas.cloneNode(true);
              let ctx = newCanvas.getContext("2d");
              ctx.fillStyle = "white";
              ctx.globalAlpha = 1;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(canvas, 0, 0);
              let img = document.createElement("img");
              let src = newCanvas.toDataURL('image/jpeg');
              img.setAttribute("src", src);
              scope.chart.destroy();
              scope.domElem.removeChild(canvas);
              scope.chart = null;
              scope.domElem.appendChild(img);
            })()
        }
        
        return this.domElem;
    }
}