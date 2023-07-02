import Results from "./results.js"
import PitchController from "../../PitchController/pitchcontroller.js";

const recordInterval = 15; //ms

function createSlider(args)
{
    let slider = document.createElement("input");
    slider.type = "range";
    slider.min = args.min;
    slider.max = args.max;
    slider.value = args.startValue;

    slider.style.width = "100%";

    return slider;
}

export default class Test
{
    constructor(parameters)
    {

        // this.pitchController -- Pitch Controller
        // this.control -- Control flag
        this.dataPoints = [];
        this.metadata = {};

        let scope = this;

        Object.keys(parameters).forEach(key=>{
            scope[key] = parameters[key];
        })
    }

    generate()
    {
        let elem = document.createElement("div");

        const min = 0;
        const max = this.resolution;

        let startValue = 0;

        if (this.randomStart)
        {
            startValue = Math.round(this.resolution * Math.random());
        }
        else
        {
            startValue = this.startValue;
        }

        let endValue = 0;
        if (this.randomEnd)
        {
            endValue = Math.round(this.resolution * Math.random());
        }
        else
        {
            endValue = this.endValue;
        }

        this.metadata.startValue = startValue;
        this.metadata.endValue = endValue;
        this.metadata.min = min;
        this.metadata.max = max;

        let controlSlider = createSlider({min: min, max: max, startValue: endValue});
        let userSlider = createSlider({min: min, max: max, startValue: startValue});

        elem.appendChild(controlSlider);
        elem.appendChild(document.createElement("br"))
        elem.appendChild(userSlider);

        let scope = this;

        function onInput(value)
        {
            if (value == endValue)
            {
                scope._onSuccess();
            }
        }

        // Control mechanisms (overloaded word control)
        if (this.control == false)
        {
            this.pitchController.afterprocessing = function(e)
            {
                if (e.data.insession == true)
                {
                    userSlider.value = parseInt(userSlider.value) + e.data.session.deltapitch;
                    onInput(userSlider.value);
                }
            }
        }
        else
        {
            userSlider.addEventListener("input", e=>{
                onInput(e.target.value);
            });
        }

        // Store value
        scope.dataPoints.push([0, startValue]);
        setInterval(e=>{
            scope.dataPoints.push([performance.now() - scope.startTime, userSlider.value])
        }, recordInterval)

        this.startTime = performance.now();
        this.pitchController.toggle(true);

        return elem;
    }

    _onSuccess()
    {
        this.pitchController.toggle(false);

        this.onSuccess(new Results({
            time: (performance.now() - this.startTime) / 1000,
            metadata: this.metadata,
            dataPoints: this.dataPoints
        }));
    }
}