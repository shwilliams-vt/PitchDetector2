import Results from "./results.js"

// const recordInterval = 15; //ms

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

function createLabel(text)
{
    let label = document.createElement("p");
    label.innerText = text;
    label.style.width = "100%";

    return label;
}

export default class Test
{
    constructor(parameters)
    {

        this.parameters = parameters || {};

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

        let instructions = createLabel(`${this.parameters.testNumber}. Please match the bottom slider's position to the top slider's position using the pitch-based NVVI tool.`)
        let controlSlider = createSlider({min: min, max: max, startValue: endValue});
        let userSlider = createSlider({min: min, max: max, startValue: startValue});

        elem.appendChild(instructions);
        elem.appendChild(controlSlider);
        elem.appendChild(document.createElement("br"))
        elem.appendChild(userSlider);

        let scope = this;

        // Control mechanisms (overloaded word control)
        if (this.control == false)
        {
            this.pitchController.afterprocessing = function(e)
            {
                if (e.data.insession == true)
                {
                    userSlider.value = parseInt(userSlider.value) + e.data.session.deltapitch;
                    // onInput(userSlider.value);
                }

                if (e.data.transientSilence == true)
                {
                    scope._onSuccess();
                }
            }
        }
        else
        {
            userSlider.addEventListener("input", e=>{
                // onInput(e.target.value);
                // onInput was checking if vals were equal
            });
        }

        // Store value
        scope.dataPoints.push([0, startValue]);
        setInterval(e=>{
            scope.dataPoints.push([performance.now() - scope.startTime, userSlider.value])
        }, scope.parameters.recordInterval)

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