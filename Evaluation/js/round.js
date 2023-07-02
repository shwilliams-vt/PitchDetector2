import Test from "./test.js"
import PitchController from "../../PitchController/pitchcontroller.js";

function parseTest(testParams, pitchController, control, callback)
{
    let test = new Test(testParams);

    test.pitchController = pitchController;
    test.control = control;
    test.onSuccess = callback;

    return test;
}

export default class Round
{

    constructor(parameters)
    {
        this.results = null;
        this.started = false;

        this.tests = [];
        this.currentTest = 0;

        this.title = parameters.title;
        this.pitchController = new PitchController(parameters.pitchControllerSettings);
        this.control = parameters.control;

        let scope = this;

        parameters.tests.forEach(test=>{
            scope.tests.push(parseTest(test, this.pitchController, this.control, (results)=>scope._onCompleteTest(results)));
        });
    }

    async begin()
    {
        this.results = [];
        this.started = true;
        this.currentTest = 0;
        await this.pitchController.initialize();
    }

    next(onCompleteTest)
    {
        if (this.currentTest < this.tests.length)
        {
            this.currentTest++;
            return this.tests[this.currentTest - 1].generate();
        }

        return null;
    }

    end()
    {
        let results = this.results;
        console.log(results)
        this.results = null;

        return results;
    }

    _onCompleteTest(results)
    {
        console.log("Finished a test: " + results.time);
        this.results.push(results);

        this.onCompleteTest(results);
    }
}