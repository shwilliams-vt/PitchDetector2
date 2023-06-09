

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

class Session
{
    constructor(initialpitch)
    {
        // The initiale pitch (in Hz, all in Hz)
        this.startingpitch = initialpitch;
        // The current pitch offset
        this.currentoffset = 0;
        // The last pitch before current
        this.lastpitch = initialpitch;
        // The difference between the current pitch and the last pitch
        this.deltapitch = 0;
    }

    update(newpitch)
    {
        this.currentoffset = newpitch - this.startingpitch;
        this.deltapitch = newpitch - this.lastpitch;        
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

        // Indicating a "session"
        // Meaning a pitch has been detected
        this.insession = false;

        // The minimum confience level to be in a session
        this.minconfidenceforsession = 0.7;

        // Session variables 
        this.session = null;

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

        // Get the Pitch Controller Directory
        var currentDirectory = parseCurrentDirectory();
        // omit the file name and first slash after domain
        this.pitchControllerDirectory = currentDirectory.substring(1, currentDirectory.lastIndexOf("/")) + "/";

        // Specify analyzer file path
        this.analyzerPath = "/" + this.pitchControllerDirectory + "audioanalyzer.js";
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
        await audioContext.audioWorklet.addModule(this.analyzerPath);
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
        analyzer.connect(audioContext.destination);

        audioContext.resume();
        this.audioContext = audioContext;


        // Setup callbacks
        let scope = this;
        analyzer.port.onmessage = e =>{

            scope._callback(e);
        }

        // Set initial enabled state in analyzer
        analyzer.port.postMessage({enabled:this.inrunningstate()});

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
        // In this function, we handle the callback to perform a variety of things
        // Check for silence
        if ("transientSilence" in e.data)
        {
            console.log("transient silence: " + e.data.transientSilence);
        }

        if ("pitchInfo" in e.data)
        {
            // Set enabled 
            // e.data.insession = this.inrunningstate() && e.data.pitchInfo.pitch != NaN;
            let isvalid = this.inrunningstate() && !isNaN(e.data.pitchInfo.pitch);

            // Check confidence
            if (isvalid && e.data.pitchInfo.confidence >= this.minconfidenceforsession)
            {
                if (!this.insession)
                {
                    // Not in session so make one, as confidence is adequate
                    this.insession = true;

                    // Create a session
                    this.session = new Session(e.data.pitchInfo.pitch);

                    console.log("Started session!");
                }
                else
                {
                    // Update our current session
                    this.session.update(e.data.pitchInfo.pitch);
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
}