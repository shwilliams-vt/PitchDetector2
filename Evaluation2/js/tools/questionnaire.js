
async function getSurvey(link)
{
    let r = await fetch("./resources/surveys/" + link + ".json");
    return await r.json();
}

class Question
{
    constructor(params, questionnaire)
    {
        this.params = params;
        this.questionnaire = questionnaire;

        let scope = this;
        this.callback = function(e)
        {
            questionnaire._callback(scope);
        };

        this.visited = false;
        this.complete = false;

        this.optional = params.optional || false;
    }

    async build()
    {
        this.domElem = document.createElement("div");

        const q = document.createElement("p");
        q.innerText = this.params.question;

        if (this.optional == false)
        {
            q.classList.add("incomplete");
        }
        this.q = q;
        this.domElem.appendChild(q);

        let scope = this;

        switch(this.params.type)
        {
            case "textarea":
                this.textarea = document.createElement("textarea");
                this.domElem.appendChild(this.textarea);

                if (this.params.validate !== undefined)
                {
                    let func = new Function(["value"],
                        this.params.validate
                    );
                    this.validate = function(value)
                    {
                        scope.complete = func(scope.textarea.value);
                        return scope.complete;
                    }
                }
                this.textarea.addEventListener("input", scope.callback);
                
                break;
            case "slider":
                this.slider = document.createElement("input");
                this.slider.setAttribute("type", "range");
                this.slider.value = 0;
                this.domElem.appendChild(this.slider);

                for (let option in this.params["extra-params"])
                {
                    this.slider.setAttribute(option, this.params["extra-params"][option])
                }

                this.slider.addEventListener("input", scope.callback);

                break;
            case "list":
                this.form = document.createElement("form");
                this.domElem.appendChild(this.form)

                let listType = "";
                if (this.params["extra-params"].multiple == true)
                {
                    listType = "checkbox";
                }
                else
                {
                    listType = "radio";
                }

                for (let option of this.params["extra-params"].options)
                {
                    let o = document.createElement("p");

                    let input = document.createElement("input");
                    input.setAttribute("type", listType);
                    input.setAttribute("name", "op")
                    o.appendChild(input);

                    let txt = document.createElement("span");
                    txt.innerText = option;
                    o.appendChild(txt);

                    this.form.appendChild(o);

                    
                }

                this.form.addEventListener("input", function(e) {

                    let op = e.target.nextElementSibling.innerText;
                    let val = e.target.checked;

                    // console.log(op, val);

                    if (listType === "radio")
                    {
                        scope.form.value = op;
                    }
                    else
                    {
                        scope.form.value = scope.form.value || [];

                        if (!scope.form.value.includes(op) && val == true)
                        {
                            scope.form.value.push(op)
                        }
                        else if (scope.form.value.includes(op) && val == false)
                        {
                            scope.form.value.splice(scope.form.value.indexOf(op), 1);
                        }
                    }
                    scope.callback(e);
                });

                break;
            case "tlx":
                this.slider = document.createElement("input");
                // 21 pt tlx
                this.slider.setAttribute("type", "range");
                this.slider.setAttribute("min", 0);
                this.slider.setAttribute("max", 20);
                this.slider.value = 10;

                this.datalist = document.createElement("datalist");
                for (let i = 0; i < 21; i++)
                {
                    const doe = document.createElement("option");
                    doe.innerText = i;
                    doe.setAttribute("value", i)
                    this.datalist.appendChild(doe);
                }
                this.datalist.setAttribute("id", "tlx-dl");

                this.labelDiv = document.createElement("div");
                this.labelDiv.style.width = "100%;";

                let left = document.createElement("span");
                left.innerText = "Very Low";
                left.style.float = "left";
                this.labelDiv.appendChild(left);

                let right = document.createElement("span");
                right.innerText = "Very High";
                right.style.float = "right"
                this.labelDiv.appendChild(right);

                this.domElem.appendChild(this.slider);
                this.domElem.appendChild(this.datalist);
                this.domElem.appendChild(this.labelDiv);

                this.domElem.style.textAlign = "center";

                this.slider.setAttribute("list", "tlx-dl");
                this.slider.addEventListener("input", scope.callback);

                this.complete = true;

                break;
            case "likert":
                this.form = document.createElement("form");
                this.domElem.appendChild(this.form);

                q.innerText = "Rate your agreement with the following statement: " + q.innerText;

                let likertOptions = [
                    "Strongly Disagree",
                    "Disagree",
                    "Neither Agree or Disagree",
                    "Agree",
                    "Strongly Agree"
                ]

                for (let i = 0; i < 5; i++)
                {
                    let o = document.createElement("p");
                    o.style.marginBottom = "0px";
                    o.style.marginTop = "2px";

                    let input = document.createElement("input");
                    input.setAttribute("type", "radio");
                    input.setAttribute("name", "op")
                    o.appendChild(input);

                    let txt = document.createElement("span");
                    txt.innerText = likertOptions[i];
                    o.appendChild(txt);

                    this.form.appendChild(o);

                    
                }

                this.form.addEventListener("input", function(e) {

                    let op = e.target.nextElementSibling.innerText;
                    let val = 0;

                    switch (op)
                    {
                        case "Strongly Disagree":
                            val = 0
                            break;
                        case "Disagree":
                            val = 1
                            break;
                        case "Neither Agree or Disagree":
                            val = 2
                            break;
                        case "Agree":
                            val = 3
                            break;
                        case "Strongly Agree":
                            val = 4
                            break;
                        default:
                            break;
                    }

                    scope.form.value = val;
                    
                    scope.callback(e);
                });
                break;
            default:
                break;
        }

        return this.domElem;
    }

    getValue()
    {
        switch(this.params.type)
        {
            case "textarea":
                return this.textarea.value;
            case "slider":
                return this.slider.value;
            case "list":
                return this.form.value;
            case "likert":
                return this.form.value;
            case "tlx":
                return this.slider.value;
            default:
                return undefined;
        }
    }

    checkCompletion()
    {
        let scope = this;
        let complete = (scope.validate || (()=>scope.complete = true))();


        if (this.optional == false)
        {
            if (complete)
            {
                this.q.classList.remove("incomplete");
            }
            else
            {
                this.q.classList.add("incomplete");
            }
        }

        return complete;
    }
}

export default class Questionnaire
{

    constructor(link)
    {
        this.jsonLink = link;
    }

    async build()
    {
        if (this.domElem !== undefined)
        {
            this.domElem.parentElement.removeChild(this.domElem);
            this.domElem = undefined;
        }

        this.params = await getSurvey(this.jsonLink);
        this.params.questions ||= [];
        this.questions = [];

        let scope = this;
        this.params.questions.forEach(question => {
            scope.questions.push(new Question(question, scope));
        });

        this.domElem = document.createElement("div");
        
        const title = document.createElement("h3");
        title.innerText = this.params.title || "Title";

        const label = document.createElement("p");
        label.innerText = this.params.label || "";

        const qframe = document.createElement("div");
        qframe.classList.add("qframe");

        const foot = document.createElement("div");
        foot.classList.add("qfoot");

        const prev_btn = document.createElement("a");
        prev_btn.innerText = "<< Back";
        prev_btn.addEventListener("click", ()=>scope.move(-1));

        const next_btn = document.createElement("a");
        next_btn.innerText = "Next >>";
        next_btn.addEventListener("click", ()=>scope.move(1));

        const status = document.createElement("span");
        status.innerText = "-/-";

        let btns = document.createElement("div");
        this.btns = {prev: prev_btn, next: next_btn};
        btns.appendChild(prev_btn);
        btns.appendChild(next_btn);

        foot.appendChild(btns);
        foot.appendChild(status);

        this.domElem.appendChild(title);
        if (label.innerText !== "")
        {
            this.domElem.appendChild(label);
        }
        this.domElem.appendChild(qframe);
        this.domElem.appendChild(foot);

        for (let i = 0; i < this.questions.length; i++)
        {
            let question = this.questions[i];

            qframe.appendChild(await question.build());
        }

        this.status = status;
        this.currentQuestion = 0;
        this.updateStatus();

        return this.domElem;
    }

    move(amt)
    {

        if (this.currentQuestion + amt < 0 ||this.currentQuestion + amt >= this.questions.length)
        {
            return;
        }

        this.currentQuestion += amt;

        this.questions[this.currentQuestion].domElem.scrollIntoView();

        this.updateStatus();
    }

    updateStatus()
    {
        let q = this.questions[this.currentQuestion];
        q.visited = true;

        if (this.currentQuestion == 0)
        {
            this.btns.prev.classList.add("no-nav");
        }
        else if (this.currentQuestion == this.questions.length - 1)
        {
            this.btns.next.classList.add("no-nav");
        }
        else
        {
            this.btns.prev.classList.remove("no-nav");
            this.btns.next.classList.remove("no-nav");

        }

        this.status.innerText = "Question " + (this.currentQuestion + 1) + "/" + this.questions.length;
        this.checkStatus();
    }

    checkStatus()
    {
        let complete = true;

        this.questions.forEach(question => {
            if (question.visited == false || (question.optional == false && question.complete == false))
            {
                complete = false;
            }
        })

        if (complete)
        {
            (this.onComplete || (()=>{}))(this.collectResults());
            console.log("Completed survey!");
        }
    }

    collectResults()
    {
        let results = {};
        this.questions.forEach(question =>{
            let id =  question.params.id;
            let val = question.getValue();
            results[id] = val;
        });

        return results;
    }

    _callback (question)
    {
        question.checkCompletion();

        this.checkStatus();
    }
}