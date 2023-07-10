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

        let scope = this;
        this.chartParams = {type: "line", data:data, options: {animation: {onComplete: (()=>scope.onRender() || (()=>{}))}}};
        this.params = params;

    }

    generateHTML()
    {
        this.domElem = document.createElement("div");
        this.domElem.classList.add("img-fit");
        let canvas = document.createElement("canvas");
        canvas.classList.add("img-fit");
        this.canvas = canvas;
    
        this.domElem.appendChild(canvas);

        this.chart = new Chart(canvas.getContext("2d"), this.chartParams);

        
        
        
        return this.domElem;
    }

    onRender()
    {
      let scope = this;
      if (!scope.params.interactive)
      {
          (async () => {
            // await waitOneFrame();
            // await waitOneFrame();
            // await waitOneFrame();
            console.log("DFDFDFDDF")
            await waitOneFrame();
            var newCanvas = scope.canvas.cloneNode(true);
            let ctx = newCanvas.getContext("2d");
            ctx.fillStyle = "white";
            ctx.globalAlpha = 1;
            ctx.fillRect(0, 0, scope.canvas.width, scope.canvas.height);
            ctx.drawImage(scope.canvas, 0, 0);
            let img = document.createElement("img");
            let src = newCanvas.toDataURL('image/jpeg');
            img.setAttribute("src", src);
            img.classList.add("img-fit");
            scope.chart.destroy();
            scope.domElem.removeChild(scope.canvas);
            scope.chart = null;
            scope.domElem.appendChild(img);
          })()
      }
    }
}