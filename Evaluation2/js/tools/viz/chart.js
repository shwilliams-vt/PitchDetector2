import { waitOneFrame } from "../../util.js";

let FIRST_ID = 0;
let CHARTS = [];

const defaultConfig = {
    type: 'line',
    data: {},
    options: {
      animation: {
        duration: 0
      },
      responsive: true,
      maintainAspectRatio: false,
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
        xAxes:
          [{
            display: true,
            scaleLabel: {
                display: true,
                labelString: 'Time (ms)'
            }
        }],
        yAxes:
          [{
          display: true,
          ticks: {
              beginAtZero: true,
              steps: 10,
              stepValue: 5,
              min: 0,
              max: 1000
          }
        }]
      },
      title: {
        display: true,
        text: 'Chart.js Line Chart - Legend'
      }
    },
  };

export default class ChartJS
{

    constructor(params)
    {

        params = params || {};

        this.id = FIRST_ID;
        CHARTS.push(this);
        FIRST_ID++;

        params.interactive = params.interactive || false;

        let config = JSON.parse(JSON.stringify(defaultConfig));

        config.type = params.type || config.type;

        config.options.scales.xAxes[0].scaleLabel.labelString = params.xLabel || 'Time (ms)';

        config.options.scales.yAxes[0].ticks.min = params.min || 0;
        config.options.scales.yAxes[0].ticks.max = params.max || 100;

        params.subtitles = params.subtitles || ["Untitled", "Untitled"];
        params.title = params.title || "Untitled";

        let labels = params.labels //
        let datapoints = params.datapoints // [0, 20, 20, 60, 60, 120, NaN, 180, 120, 125, 105, 110, 170];

        let data;
        if (params.scatter)
        {
          let config;
          if (params.datapoints.length < 3)
          {
            config = {
              type: 'scatter',
              data: {
                datasets:
                [
                  {
                    label : "Actual",
                    data : params.datapoints[0],
                    showLine : false,
                    fill : false,
                    borderColor : "rgb(255,0,0)"
                  },
                  {
                    label : "Linear",
                    data : params.datapoints[1],
                    showLine : true,
                    fill : false,
                    borderColor : "rgb(0,0,255)"
                  }
                ]            
              },
              options: {
                animation: {
                  duration: 0
                },
                scales: {
                  xAxes: [{
                    title: {
                      display: true,
                      text: "log2(2D/W)"
                    },
                    scaleLabel: {
                      display: true,
                      labelString: labels.x
                    }
                  }],
                  yAxes: [{
                    title: {
                      display: true,
                      text: "t",
                    },
                    scaleLabel: {
                      display: true,
                      labelString: labels.y
                    },
                    ticks: {
                      min: params.min,
                      max: params.max
                    }
                  }]
                },
                legend: { 
                  display: true,
                  position: 'bottom',
                  labels: {
                      fontColor: '#333'
                  }
                }
              }
            };
          }
          else
          {
            config = {
              type: 'scatter',
              data: {
                         
              },
              options: {
                animation: {
                  duration: 0
                },
                scales: {
                  xAxes: [{
                    title: {
                      display: true,
                      text: "log2(2D/W)"
                    },
                    scaleLabel: {
                      display: true,
                      labelString: labels.x
                    }
                  }],
                  yAxes: [{
                    title: {
                      display: true,
                      text: "t"
                    },
                    scaleLabel: {
                      display: true,
                      labelString: labels.y
                    },
                    ticks: {
                      min: params.min,
                      max: params.max
                    }
                  }]
                },
                plugins: { legend: { display: false } },
                legend: { display: false }
              }
            };

            let datasets = [];
            for (const dataset of params.datapoints)
            {
              datasets.push({
                data : dataset,
                showLine : false,
                fill : false,
                borderColor : "rgb(255,0,0,0.5)"
              });
            }
            config.data.datasets = datasets;
          }
          
          let scope = this;
          let t = FIRST_ID - 1;
          config.options.animation = {onComplete: (()=>{scope.onRender(t)})}
          config.options.title = {
            display: true,
            text: params.title
          }

          this.chartParams = config;
          this.params = params;
          this.rendered = false;
          return;
        }
        else
        {
          if (datapoints.length == 2)
          {
            data = {
              labels: labels,
              datasets: [
                  {
                      label: params.subtitles[0],
                      data: datapoints[0],
                      borderColor: "#FF0000",
                      fill: false,
                      cubicInterpolationMode: 'monotone',
                      tension: 0.4
                  },
                  {
                      label: params.subtitles[1],
                      data: datapoints[1],
                      borderColor: "#0000FF",
                      fill: false,
                      cubicInterpolationMode: 'monotone',
                      tension: 0.4
                  }
              ]
            };
          }
          else
          {
            data = {
              labels: labels,
              datasets: [
                  {
                      label: params.subtitles[0],
                      data: datapoints[0],
                      borderColor: "#FF0000",
                      fill: true,
                      backgroundColor: "rgba(255, 145, 68, 0.7)",
                      cubicInterpolationMode: 'monotone',
                      tension: 0.4
                  }
              ]
            };
          }
        }
        

        config.data = data;
        let scope = this;
        let t = FIRST_ID - 1;
        config.options.animation = {onComplete: (()=>{scope.onRender(t)})}
        config.options.title = {
          display: true,
          text: params.title
        }

        this.chartParams = config;
        this.params = params;
        this.rendered = false;

    }

    generateHTML(onLoad)
    {
        this.domElem = document.createElement("div");
        this.domElem.classList.add("img-fit");
        let canvas = document.createElement("canvas");
        canvas.classList.add("img-fit-important");
        this.canvas = canvas;

        this.onLoad = onLoad;

        this.domElem.appendChild(canvas);

        let scope = this;
        (async () => {

          await waitOneFrame();
          scope.chart = new Chart(canvas.getContext("2d"), scope.chartParams);
          scope.chart.scope = scope;

        })()

        this.domElem.style.opacity = "0";

        return this.domElem;


    }

    onRender(id)
    {
      let scope = CHARTS[id];
      if (scope.params.interactive == false && scope.rendered == false)
      {
          (async () => {
            await waitOneFrame();
            var newCanvas = scope.canvas.cloneNode(true);
            let ctx = newCanvas.getContext("2d");
            ctx.fillStyle = "white";
            ctx.globalAlpha = 1;
            ctx.fillRect(0, 0, scope.canvas.width, scope.canvas.height);
            await waitOneFrame();
            ctx.drawImage(scope.canvas, 0, 0);
            let img = document.createElement("img");
            let src = newCanvas.toDataURL('image/jpeg');
            img.setAttribute("src", src);
            img.classList.add("img-fit");
            await waitOneFrame();
            scope.chart.destroy();
            await waitOneFrame();
            scope.domElem.removeChild(scope.canvas);
            // scope.chart = null;
            scope.domElem.appendChild(img);

            if (scope.onLoad !== undefined)
            {
              scope.onLoad();
            }
          })()
      }

      this.domElem.style.opacity = "1.0";
      scope.rendered = true;
    }
}