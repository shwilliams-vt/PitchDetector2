import Test from "./test.js"
import PitchController from "../../../PitchController/pitchcontroller.js";

function parseTest(testParams, pitchController, control, callback)
{

    testParams.description = testParams.description || testParams.roundDescription;

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
        this.control = parameters.control;
        this.recordInterval = parameters.recordInterval;
        this.description = parameters.description || "An empty round description";

        this.metadata = parameters.metadata || {};

        if (this.control == false)
        {
            this.pitchController = new PitchController(parameters.pitchControllerSettings);
        }

        let scope = this;

        let i = 0;
        parameters.tests.forEach(test=>{
            i++;
            scope.tests.push(parseTest(
                {...test, 
                    recordInterval:this.recordInterval,
                    metadata:
                    {
                        roundTitle: scope.title,
                        numRounds: scope.metadata.numRounds,
                        testNumber:i, 
                        numTests: parameters.tests.length,
                        description: scope.description
                    }
                }, 
                this.pitchController, this.control, (results)=>scope._onCompleteTest(results)));
        });
    }

    async begin()
    {
        this.results = [];
        this.started = true;
        this.currentTest = 0;
        if (this.control == false)
        {
            await this.pitchController.initialize();
        }
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

    async end()
    {
        let results = this.results;
        this.results = null;

        // Clean up
        if (this.control == false)
        {
            await this.pitchController.destroy();
        }

        return results;
    }

    _onCompleteTest(results)
    {
        console.log("Finished a test: " + results.time);
        this.results.push(results);

        this.onCompleteTest(results);
    }
}