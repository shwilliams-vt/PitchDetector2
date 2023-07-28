

function parseCurrentDirectory()
{

    // Use an artificial error to extract file path from stack trace
    var currentFile = new Error().stack.match(/([^ \n])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/ig)[0];

    // Get rid of URL (skip http/https)
    return currentFile.substring(currentFile.indexOf("/", 8));
}

function getFrequencyFromSpectrum(spectrum, sampleRate)
{
    // Use parabolic interpolation
    // https://ccrma.stanford.edu/~jos/sasp/Quadratic_Interpolation_Spectral_Peaks.html

    // 1. Find first peak bin
    let peakbin = -1;
    for (let i = 1; i < spectrum.length / 2; i++)
    {
        if (spectrum[i-1] < spectrum[i] && spectrum[i+1] < spectrum[i])
        {
            peakbin = i;
            break;
        }
    }

    // 2. Create letter vars corresponding to alpha, beta, gamma
    let a = spectrum[peakbin-1];
    let b = spectrum[peakbin];
    let c = spectrum[peakbin+1];

    // 3. Use equation to find interpolated bin value
    let interpolatedbin = 0.5 * ((a - c) / (a - 2 * b + c)) + peakbin;

    // 4. Return peak magnitude estimate
    // return (b - 0.25 * (a - c) * interpolatedbin) / spectrum.length * sampleRate;

    // Real 4. Return bin in terms of freq
    return interpolatedbin / (spectrum.length) * sampleRate;
}

class Report
{
    constructor(parameters)
    {
        this.pitch = parameters.pitch;
        this.confidence = parameters.confidence;
    }
}

class Session
{
    constructor(initialpitch)
    {
        // The initiale pitch (in Hz, all in Hz)
        this.startingpitch = initialpitch;
        // The current pitch offset
        this.currentoffsethz = 0;
        this.currentoffset = 0;
        // The last pitch before current
        this.lastpitch = initialpitch;
        // The difference between the current pitch and the last pitch
        this.deltapitchhz = 0;
        this.deltapitch = 0;
    }

    update(newpitch, weight)
    {
        this.currentoffsethz = newpitch - this.startingpitch;
        this.deltapitchhz = newpitch - this.lastpitch;

        if (weight === undefined)
        {
            weight = 1.0;
        }

        this.currentoffset = weight * 12 * Math.log2(newpitch / this.startingpitch);
        this.deltapitch = weight * 12 * Math.log2(newpitch / this.lastpitch);    

        this.lastpitch = newpitch;
    }
                    
}

export default class PitchController
{

    constructor(parameters)
    {
        this.userenabled = false; // Must be turned on
        this.initialized = false; // Must be initialized

        // See audio analyzer for explanatinons on these
        this.processingMode = "ACF";
        this.smoothness = 0;
        this.precision = 0;
        this.transientwindowtime = 375.1;
        this.processingRate = 256;
        this.lastreports = [];

        // Confidenc misses to end session
        this.maxconfidencemisses = 3;
        this.currconfidencemisses = 0;

        // Indicating a "session"
        // Meaning a pitch has been detected
        this.insession = false;

        // Weight to multiply by
        this.weight = 1.0;

        // Use transient detection for enabled/disabled
        this.useTransientToggle = true;

        // The minimum confience level to be in a session
        this.minconfidenceforsession = 0.7;

        // Session variables 
        this.session = null;

        // if no parameters
        if (parameters === undefined)
        {
            parameters = {};
        }

        // parameters
        if ("sampleRate" in parameters)
        {
            this.sampleRate = parameters.sampleRate;
        }
        if ("frameSize" in parameters)
        {
            this.frameSize = parameters.frameSize;
        }
        if ("afterprocessing" in parameters)
        {
            this.afterprocessing = parameters.afterprocessing;
        }
        if ("smoothness" in parameters)
        {
            this.smoothness = parameters.smoothness;
        }
        if ("processingMode" in parameters)
        {
            this.processingMode = parameters.processingMode;
        }
        if ("precision" in parameters)
        {
            this.precision = parameters.precision;
        }
        if ("minconfidenceforsession" in parameters)
        {
            this.minconfidenceforsession = parameters.minconfidenceforsession;
        }
        if ("transientWindowTime" in parameters)
        {
            this.transientwindowtime = parameters.transientWindowTime;
        }
        if ("processingRate" in parameters)
        {
            this.processingRate = parameters.processingRate;
        }
        if ("useTransientToggle" in parameters)
        {
            this.useTransientToggle = parameters.useTransientToggle;
        }
        if ("weight" in parameters)
        {
            this.weight = parameters.weight;
        }

        // Get the Pitch Controller Directory
        var currentDirectory = parseCurrentDirectory();
        // omit the file name and first slash after domain
        this.pitchControllerDirectory = currentDirectory.substring(1, currentDirectory.lastIndexOf("/")) + "/";

        // Specify analyzer file path
        this.analyzerPath = (this.pitchControllerDirectory === "PitchController/" ? "/" : "https://") + this.pitchControllerDirectory + "audioanalyzer.js";
    }

    toggleUseTransientToggle(val)
    {
        val = val || !this.useTransientToggle;

        this.useTransientToggle = val;

        this.analyzer.port.postMessage({useTransientToggle:val});
    }

    inrunningstate()
    {
        // Only return true if user enabled and initialized
        return this.userenabled && this.initialized;
    }

    async initialize()
    {

        // Check to make sure we are not initialized
        if (this.initialized)
        {
            return;
        }

        // Set our constraints
        // Note we don't want a lot of these features because they interfere with our
        // processing
        var constraints = {
            audio: {
              echoCancellation: false,
              noiseSuppression: true,
              autoGainControl: false,
            }
        };

        // Get user input from microphone
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.stream = stream;
        // Create an audio context
        const audioContext = new AudioContext({sampleRate:this.sampleRate});

        // Create audio source from input stream
        const audioSource = audioContext.createMediaStreamSource(stream);

        // Connect input to a bandpass filter (50 - 1000 Hz)
        const from = 50;
        const to = 1000;
        const geometricMean = Math.sqrt(from * to);

        const bandpass = audioContext.createBiquadFilter();
        // bandpass.type = 'bandpass';
        // bandpass.frequency.value = geometricMean;
        // bandpass.Q.value = geometricMean / (to - from);
        bandpass.type = 'lowpass';
        bandpass.frequency.value = 2000;

        if (false)
        {
            let slider = document.getElementById("freq");

            let osc = audioContext.createOscillator();
            osc.frequency.setValueAtTime(440, audioContext.currentTime);
            osc.type = "sawtooth"
            osc.start();
            osc.connect(bandpass);

            // let osc2 = audioContext.createOscillator();
            // // osc2.type = "custom";

            // const n = 2048
            // let arr = new Float32Array(n);
            // let arr2 = new Float32Array(n);
            // for (let i = 0; i < n; i++)
            // {
            //     arr[i] = Math.random() * (Math.random() > 0.5 ? 1 : -1);
            //     arr2[i] = Math.random() * (Math.random() > 0.5 ? 1 : -1);
            // }

            // osc2.setPeriodicWave(audioContext.createPeriodicWave(arr, arr2))
            // osc2.start();
            // osc2.connect(bandpass);

            window.modifyFreq = function()
            {
                // console.log(slider.value)
                osc.frequency.setValueAtTime(slider.value, audioContext.currentTime)
            }
        }
        else
        {
            audioSource.connect(bandpass);
        }

        // Connect input to an analyser
        let res = await fetch(this.analyzerPath);
        let code = await res.text();
        let blob = new Blob([code], {type: 'application/javascript'});
        let reader = new FileReader();
        reader.readAsDataURL(blob);
        let module = await new Promise(resolve=>{reader.onloadend = ()=>{resolve(reader.result)}});
        await audioContext.audioWorklet.addModule(module);
        const analyzer = new AudioWorkletNode(audioContext, "worklet-analyzer", {
            processorOptions:{
                sampleRate:audioContext.sampleRate,
                frameSize:this.frameSize,
                mode:this.processingMode,
                smoothness:this.smoothness,
                precision: this.precision,
                transientWindowTime: this.transientwindowtime,
                processingRate: this.processingRate
            }
        });
        bandpass.connect(analyzer);

        // Connect analyzer to destination
        // analyzer.connect(audioContext.destination);

        audioContext.resume();
        this.audioContext = audioContext;


        // Setup callbacks
        let scope = this;
        analyzer.port.onmessage = e =>{

            scope._callback(e);
        }

        // Set initial enabled state in analyzer
        analyzer.port.postMessage({enabled:this.inrunningstate()});
        analyzer.port.postMessage({useTransientToggle:this.useTransientToggle});

        // Initialized
        this.analyzer = analyzer;
        this.initialized = true;
        this.insession = false;
        this.session = null;
    }

    toggle(val)
    {
        if (val === undefined)
        {
            val = !this.userenabled;
        }

        this.userenabled = val;

        this.analyzer.port.postMessage({enabled:this.inrunningstate()})
    }

    _callback(e)
    {

        if ("shutdown" in e.data)
        {

            if (this.afterprocessing)
            {
                this.afterprocessing({data:{shutdown:true}});
            }

            this.onshutdown();
            return;
        }

        // In this function, we handle the callback to perform a variety of things
        // Check for silence
        if ("transientSilence" in e.data)
        {
            console.log("transient silence: " + e.data.transientSilence);
        }

        if ("pitchInfo" in e.data)
        {

            let isvalid = this.inrunningstate() && !isNaN(e.data.pitchInfo.pitch);
            let report = e.data;

            if (e.data.pitchInfo.confidence >= this.minconfidenceforsession)
            {
                this.currconfidencemisses = 0;
            }
            else
            {
                this.currconfidencemisses++;
            }
            // Check if confidence misses
            if (this.currconfidencemisses == this.maxconfidencemisses)
            {
                isvalid = false;
            }

            let smoothedPitch = report.pitchInfo.pitch;
            let smoothedConfidence = report.pitchInfo.confidence;

            if (this.lastreports.length == 0 && this.smoothness != 0)
            {
                for (let i = 0; i < this.smoothness; i++)
                {
                    this.lastreports[i] = new Report({pitch:report.pitchInfo.pitch, confidence:report.pitchInfo.confidence});
                }
            }
            for (let i = 0; i < this.lastreports.length; i++)
            {
                smoothedPitch += this.lastreports[i].pitch;
                smoothedConfidence += this.lastreports[i].confidence;
            }

            smoothedPitch /= this.lastreports.length + 1;
            smoothedPitch = Math.round(smoothedPitch);
            smoothedConfidence /= this.lastreports.length + 1;

            // if (isvalid)
            // {
            //     console.log("---", smoothedPitch, report.pitchInfo.pitch);
            //     console.log(this.lastreports.length)
            // }
            

            this.lastreports.shift();
            this.lastreports.push(new Report({pitch:report.pitchInfo.pitch, confidence:report.pitchInfo.confidence}));

            // Check confidence
            if (isvalid && smoothedConfidence >= this.minconfidenceforsession)
            {
                if (!this.insession)
                {
                    // Not in session so make one, as confidence is adequate
                    this.insession = true;

                    // Create a session
                    this.session = new Session(report.pitchInfo.pitch);

                    this.lastreports = [];
                    for (let i = 0; i < this.smoothness; i++)
                    {
                        this.lastreports.push(new Report({pitch:report.pitchInfo.pitch, confidence:report.pitchInfo.confidence}));
                    }

                    this.currconfidencemisses = 0;
                    console.log("Started session!");
                }
                else
                {
                    // Update our current session
                    this.session.update(smoothedPitch, this.weight);
                }
                e.data.session = this.session;

                

            }
            else
            {
                if (this.insession)
                {
                    // We are in session and confidence is too low! Terminate it
                    this.insession = false;

                    // Delete session
                    this.session = null;

                    console.log("Ended session!");

                }
            }
        }

        // Set final vals
        e.data.insession = this.insession;

        if (e.data.session === undefined)
        {
            e.data.session = {}
            e.data.session.lastpitch = undefined;
        }


        // Draw tool
        if (this.tool !== undefined)
        {

            let {main, status, spinning, pitchDetected, pitchNumber, rot, rotRate, rotScale} = this.tool;

            if (e.data.insession == true)
            {
                // Pitch has been detected (in session)

                pitchDetected.innerHTML = " Pitch Detected (Hz): ";
                pitchNumber.innerHTML = e.data.session.lastpitch + " | ";
                pitchNumber.innerHTML += (e.data.session.currentoffset > 0) ? "+" : "";
                pitchNumber.innerHTML += e.data.session.currentoffset;

                spinning.innerHTML = "hearing";
                let num = 1 + rotScale * Math.sin(rot);
                spinning.style.transform = `scale(${num})`;
                this.tool.rot += rotRate;
            }
            else
            {
                // Pitch has NOT been detected (NOT in session)

                spinning.innerHTML = "highlight_off";
                pitchDetected.innerHTML = "Listening...";
                pitchNumber.innerHTML = "";
                spinning.style.transform = `scale(1.0)`;
            }

            if ("transientSilence" in e.data)
            {
                if (e.data.transientSilence == false)
                {
                    // Turning on tool
                    status.innerHTML = "ON";
                    main.style.background = "darkgreen";
                    pitchDetected.style.display = "inline"
                    pitchNumber.style.display = "inline"
                }
                else
                {
                    // Turning off tool
                    main.style.background = "maroon";
                    status.innerHTML = "OFF"
                    spinning.innerHTML = "highlight_off";
                    pitchDetected.innerHTML = "";
                    pitchDetected.style.display = "none"
                    pitchNumber.innerHTML = "";
                    pitchNumber.style.display = "none"
                    spinning.style.transform = `scale(1.0)`;
                }
            }
            
    
        }


        // Callback
        if (this.afterprocessing)
        {
            this.afterprocessing(e);
        }
    }

    setAfterProcessingCallback(callback)
    {
        this.afterprocessing = callback;
    }

    async destroy()
    {
        this.analyzer.port.postMessage({shutdown: true});

        let scope = this;
        await new Promise(resolve=>{
            var checkIfDestroyed = setInterval(()=>{
                if (scope.destroyed !== undefined && scope.destroyed == true)
                {
                    clearInterval(checkIfDestroyed);
                    resolve();
                }
            }, 20);
        })
    }

    onshutdown()
    {
        this.stream.getTracks().forEach((track) => track.stop())
        this.audioContext.close();

        if (this.tool !== undefined)
        {
            this.tool.main.parentElement.removeChild(this.tool.main);
        }

        console.log("Bye bye! (DO NOT ATTEMPT TO USE THIS INSTANCE AGAIN)");
        this.destroyed = true;
    }

    buildTool()
    {
        const main = document.createElement("div");
        main.id = "tool";
        main.style.background = "maroon";

        const name = document.createElement("span");
        name.innerText = "NVVI:"

        const st = document.createElement("span");
        st.id = "status";
        st.innerText = "OFF";

        const sp = document.createElement("i");
        sp.id = "spinning";
        sp.classList.add("material-icons");
        sp.innerText = "highlight_off";
        
        const pd = document.createElement("span");
        pd.id = "pitch-detected";
        pd.style.display = "none"

        const pn = document.createElement("span");
        pn.id = "pitch-number";
        pn.style.display = "none"

        main.appendChild(name);
        main.appendChild(st);
        main.appendChild(sp);
        main.appendChild(pd);
        main.appendChild(pn);


        this.tool = {
            rot : 0,
            rotRate : 1 / 8,
            rotScale : 0.1,

            main: main,
            spinning: sp,
            status: st,
            pitchDetected: pd,
            pitchNumber: pn,
        }

        return main;
    }

}