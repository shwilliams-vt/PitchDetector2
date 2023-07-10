export default class Slider
{

    constructor(params)
    {
        this.params = params;
    }

    generateHTML()
    {
        const slider = document.createElement("input");
        slider.setAttribute("type", "range");
        slider.style.width = "100%";
        
        for (let param in this.params)
        {
            slider.setAttribute(param, this.params[param]);

        }

        this.slider = slider;
        return slider;

    }

    setValue(val)
    {
        this.slider.value = val;

        if (this.params.onInput)
        {
            this.params.onInput(val);
        }
    }

    getValue()
    {
        return parseInt(this.slider.value);
    }
}