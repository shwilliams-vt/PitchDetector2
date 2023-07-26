import Stage from "./stage.js"
import * as UTILS from "../util.js";
import Questionnaire from "../tools/questionnaire.js";

const params = {};

params.resource = "pre-survey";
params.onStart = async function()
{

    const survey = new Questionnaire("pre-survey");

    survey.onComplete = function(results) { 

        EVAL.surveys["pre-survey"] = results;

        EVAL.canWhistle = results[6] === "Yes" ? true : false;
        EVAL.canWhistle &&= results[7] >= 2;
        let button;
        
        button = document.getElementById("finish");
        button.addEventListener("click", function() {

            if (EVAL.canWhistle == false)
            {
                let main = document.getElementsByClassName("wall")[0];
                main.innerHTML = "";

                let title = document.createElement("h2");
                title.classList.add("crimson");
                title.innerHTML = "Notice";
                main.appendChild(title);

                let p1 = document.createElement("p");
                p1.innerHTML = "We have determined that whistling will not be an effective way for you to control our NVVI tool. But good news, you can control it by humming instead!";

                let p2 = document.createElement("p");
                p2.innerHTML = "In the following exercises and questionnaires, you may mark any questions about whistling or comparing whistling with humming with <span class='italic'>N/A</span> or something similar.";

                let p3 = document.createElement("p");
                p3.innerHTML = "If you have any further questions regarding this, please ask your proctor.";

                p1.classList.add("half-width");
                p1.classList.add("blurb");
                p2.classList.add("half-width");
                p2.classList.add("blurb");
                p3.classList.add("half-width");
                p3.classList.add("blurb");

                main.appendChild(p1);
                main.appendChild(p2);
                main.appendChild(p3);


                button = document.createElement("a");
                button.innerHTML = "Continue >>";
                button.style.background = "darkred";
                button.addEventListener("click", ()=>EVAL.next(7));
                main.appendChild(button);
            }
            else
            {
                

                EVAL.next();

            }

        });

        button.innerHTML = "Continue >>";
        button.style.background = "darkred";
        
    }

    document.getElementById("user-survey").appendChild(await survey.build())
}

params.onComplete = () => {
    
}

export default new Stage(params);