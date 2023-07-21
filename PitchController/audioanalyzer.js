const ACF = "ACF";
const HPS = "HPS";

// import
// { 
//     getMaxPeakBin, 
//     getNthPeakBin,
//     getMaxParabolicApproximatePeakBin,
//     getNthParabolicApproximatePeakBin,
//     getParabolicApproximateFrequency, 
//     getParabolicApproximatePower
// } from "./helpers.js";
// import FFTHelper from "./ffthelper.js";

// -- Begin add helpers

export function getMaxPeakBin(spectrum)
{
    let peakbin = -1;
    let max = -1;
    for (let i = 1; i < spectrum.length / 2; i++)
    {
        if (spectrum[i-1] < spectrum[i] && spectrum[i+1] < spectrum[i])
        {
            if (spectrum[i] > max)
            {
                max = spectrum[i];
                peakbin = i;
            }
        }
    }
    return peakbin;
}
export function getNthPeakBin(spectrum, n)
{
    let peakbin = -1;
    let max = -1;
    let numpeaks = 0;
    for (let i = 1; i < spectrum.length / 2; i++)
    {
        if (spectrum[i-1] < spectrum[i] && spectrum[i+1] < spectrum[i])
        {
            if (spectrum[i] > max)
            {
                max = spectrum[i];
                peakbin = i;

                numpeaks++;
                if (numpeaks == n)
                {
                    break;
                }
            }
        }
    }
    return peakbin;
}
export function getMaxParabolicApproximatePeakBin(spectrum)
{
    // 1. Find max peak bin
    let peakbin = getMaxPeakBin(spectrum);

    // 1.5 check bounds
    if (peakbin <= 0)
    {
        peakbin = 1;
    }
    else if (peakbin >= spectrum.length - 1)
    {
        peakbin = spectrum.length - 2;
    }

    // 2. Create letter vars corresponding to alpha, beta, gamma
    let a = spectrum[peakbin-1];
    let b = spectrum[peakbin];
    let c = spectrum[peakbin+1];

    // 3. Slope
    let m = 0.5 * (a - 2 * b + c);

    // 3. Use equation to find interpolated bin value
    let interpolatedbin = 0.25 * ((a - c) / m) + peakbin;

    return interpolatedbin;
}
export function getNthParabolicApproximatePeakBin(spectrum, n)
{
    // 1. Find max peak bin
    let peakbin = getNthPeakBin(spectrum, n);

    // 1.5 check bounds
    if (peakbin <= 0)
    {
        peakbin = 1;
    }
    else if (peakbin >= spectrum.length - 1)
    {
        peakbin = spectrum.length - 2;
    }

    // 2. Create letter vars corresponding to alpha, beta, gamma
    let a = spectrum[peakbin-1];
    let b = spectrum[peakbin];
    let c = spectrum[peakbin+1];

    // 3. Slope
    let m = 0.5 * (a - 2 * b + c);

    // 3. Use equation to find interpolated bin value
    let interpolatedbin = 0.25 * ((a - c) / m) + peakbin;

    return interpolatedbin;
}
export function getParabolicApproximateFrequency(spectrum, sampleRate)
{
    // Use parabolic interpolation
    // https://ccrma.stanford.edu/~jos/sasp/Quadratic_Interpolation_Spectral_Peaks.html    

    // 1. Get peak approximation bin
    let interpolatedbin = getParabolicApproximateBin(spectrum, getParabolicApproximateBin(spectrum));

    // 2. Return peak magnitude estimate
    // return (b - 0.25 * (a - c) * interpolatedbin) / spectrum.length * sampleRate;

    // Real 2. Return bin in terms of freq
    return interpolatedbin / (spectrum.length) * sampleRate;
}
export function getParabolicApproximatePower(spectrum, sampleRate, frequency)
{
    // 1. Convert Hz to bin frequency
    let binfrequency = frequency / sampleRate * spectrum.length;

    // 2. Find closest bin
    let nearestbin = Math.round(binfrequency);

    // 3. Create letter vars corresponding to alpha, beta, gamma
    let a = spectrum[nearestbin-1];
    let b = spectrum[nearestbin];
    let c = spectrum[nearestbin+1];

    // 4. Slope (coefficient of power 2 polynomial)
    let m = 0.5 * (a - 2 * b + c);

    // 5. Use equation to solve for peak bin
    let peakbinoffset = 0.25 * ((a - c) / m);

    // 6. Use equation to find interpolated peak bin value
    let peakbinvalue = b - 0.25 * (a - c) * peakbinoffset;

    // 7. Return the frequency
    return m * Math.pow(binfrequency - (peakbinoffset + nearestbin), 2) + peakbinvalue;
}
export default class FFTHelper
{

    constructor(parameters)
    {
        this.fftSize = 512;
        this.sampleRate = 44100;
        this.windowfunction = this.hannwindow;

        // Load parameters
        for (let i = 0; i < Object.keys(parameters).length; i++)
        {
            let key = Object.keys(parameters)[i];
            this[key] = parameters[key]; 
        }

        this.initialize();
    }

    initialize()
    {
        // Create arrays
        this.fftBuffer = new Float32Array(2*this.fftSize); // real and imaginary
        this.tempFFTBuffer = new Float32Array(this.fftSize);
        this.windowBuffer = new Float32Array(this.fftSize);

        for (let i = 0; i < this.fftSize; i++)
        {
            // Clear fft buffer
            this.fftBuffer[i] = 0;
            this.fftBuffer[2*i] = 0;

            this.tempFFTBuffer[i] = 0;

            // Set window buffer
            this.windowBuffer[i] = this.windowfunction(i, this.fftSize);
        }
    }

    hannwindow (index, length)
    {
        return 0.5 * (1 - Math.cos((index * 2 * Math.PI) / (length - 1)));
    }

    fft()
    {
        // 1. Window and clear
        for (let i = 0; i < this.fftSize; i++)
        {
            this.fftBuffer[i] = this.fftBuffer[i] * this.windowfunction(i, this.fftSize);
            this.fftBuffer[i + this.fftSize] = 0;
        }

        // 3. Bit flip
        let logSize = Math.log2(this.fftSize);

        for (let i = 0; i < this.fftSize; i++)
        {
            let reversed = 0;
            for (let j = 0; j < logSize; j++) {
                reversed |= !!((1 << j) & i) << (logSize - j - 1);
            }
            
            if (reversed >= i) {

                let tmp = this.fftBuffer[i];
                this.fftBuffer[i] = this.fftBuffer[reversed];
                this.fftBuffer[reversed] = tmp;

                tmp = this.fftBuffer[i + this.fftSize];
                this.fftBuffer[i + this.fftSize] = this.fftBuffer[reversed + this.fftSize];
                this.fftBuffer[reversed + this.fftSize] = tmp;
            }
        }

        // 4. FFT

        // Radix 2
        const TWOPI = 2 * Math.PI;

        // Log2 size stages (see diagram for how many butterfly stages there are)
        for (let stage = 1; stage <= logSize; stage++) {

            // distance between the start of each butterfly chain
            let butterflySeperation = Math.pow(2,stage);

            // distance between lo and hi elements in butterfly
            let butterflyWidth = butterflySeperation / 2; 

            // For each butterfly separation
            for (let j = 0; j < this.fftSize; j += butterflySeperation) {

                // Perform synthesis on offset (i-j) and offset + width (hi and lo) for each butterfly chain
                for (let i = j; i < j + butterflyWidth; i++) {

                    // get frequency, set coefficient
                    // Note that sampling size is the butterfly seperation
                    let f = (i-j) / butterflySeperation;
                    let a = TWOPI * f;

                    // Indices for hi and low values (low is actually further up)
                    let idxHi = i;
                    let idxLo = idxHi + butterflyWidth;

                    // Get all time values, real and imaginary
                    let gtkrHi = this.fftBuffer[idxHi];
                    let gtkiHi = this.fftBuffer[idxHi + this.fftSize];
                    let gtkrLo = this.fftBuffer[idxLo];
                    let gtkiLo = this.fftBuffer[idxLo + this.fftSize];

                    // Recall the below is the exact same as adding all vals from DFT
                    let ValRLo = gtkrLo * Math.cos(a) - gtkiLo * Math.sin(a);
                    let ValILo = gtkrLo * Math.sin(a) + gtkiLo * Math.cos(a);
                    // Nature of the Radix 2 algorithm means the hi val is equal to itself (see diagram)
                    let ValRHi = gtkrHi;
                    let ValIHi = gtkiHi;

                    // Now add the lo to the high and TODO
                    this.fftBuffer[idxHi] = ValRLo + ValRHi;
                    this.fftBuffer[idxHi + this.fftSize] = ValILo + ValIHi;
                    this.fftBuffer[idxLo] = ValRHi - ValRLo;
                    this.fftBuffer[idxLo + this.fftSize] = ValIHi - ValILo;

                }
            }
        }
    }

    magnitude(index)
    {
        return Math.sqrt(Math.pow(this.fftBuffer[index], 2) + Math.pow(this.fftBuffer[index + this.fftSize], 2));
    }
}

// -- End helpers


class Report
{
    constructor(parameters)
    {
        this.pitch = parameters.pitch;
        this.confidence = parameters.confidence;
    }
}

class WorkletAnalyzer extends AudioWorkletProcessor
{
    constructor(parameters)
    {

        super();

        this.sampleRate = 44100;
        // Buffer size (NOTE implicitly window size for detecting transients)
        this.internalBufferSize = 16384;
        // The frame size of input samples
        this.frameSize = 512;
        // The processing mode/algorithm for pitch detection
        this.mode = HPS;
        // The rate in samples to process at
        this.processingRate = 256; 
        // Should initially start at 0
        this.internalBufferOffset = 0;
        // Used for determining when to process
        this.sinceLastProcess = 0;
        // Used for averaging previous pitches and confidences
        this.smoothness = 0;
        // Used for precision of pitch (rounded to this decimal place)
        this.precision = 0;
        // The time to detect a transient (ms and samples)
        this.transientTime = 30;
        this.transientTimeInSamples = Math.ceil(this.transientTime / 1000 * this.internalBufferSize);
        // The window length of time to detect a transient
        this.transientWindowTime = 375.1; // ms
        this.transientWindowTimeSamples = Math.ceil(this.transientWindowTime / 1000 * this.sampleRate);
        // Threshold (probability) for triggering a transient
        this.transientThreshold = 0.8;
        // Number of transients to trigger a transient callback
        this.numTransientsToTrigger = 2;
        // The current number of transients considered (internal use only)
        this.numTransients = 0;
        // The period of time to listen for consecutive transient callbacks (s) 
        this.transientListenPeriod = 2.0;
        // the time of the last transient detected
        this.timeOfLastTransient = Date.now();

        this.userEnabled = true;
        // When transient found, this is triggered
        this.transientSilence = false;
        // When transient is found, count is set to internal buffer size
        this.transientWaitTimeInSamples = 0;
        // Used to indicate if a potential transient has been identified
        this.transientWaiting = false;
        // Allows for audio playback
        this.playback = true;
        // Use transient toggle
        this.useTransientToggle = true;

        this.shouldShutdown = false;

        // For HPS
        // The number of harmonics to weigh for HPS
        this.HPSharmonicCount = 4;

        // For ACF
        // The threshold to eliminate trash data after ACF peak
        // detection, normalized {0, 1}
        this.ACFthreshold = 0.3;

        // Store sample rate, buffer size, etc
        for (let i = 0; i < Object.keys(parameters.processorOptions).length; i++)
        {
            let key = Object.keys(parameters.processorOptions)[i];
            this[key] = parameters.processorOptions[key]; 
        }

        // Set message settings
        this.port.onmessage = e => {

            if ("enabled" in e.data)
            {
                this.userEnabled = e.data.enabled;
            }
            if ("useTransientToggle" in e.data)
            {
                this.useTransientToggle = e.data.useTransientToggle;
            }
            if ("shutdown" in e.data)
            {
                this.shouldShutdown = true;
            }
        }

        this.initialize();

    }

    initialize()
    {
        /// Init vars

        // Create buffers
        this.internalBuffer = new Float32Array(this.internalBufferSize);

        // Determine transient time in sampels
        this.transientTimeInSamples = Math.ceil(this.transientTime / 1000 * this.internalBufferSize);
        this.transientWindowTimeSamples = Math.ceil(this.transientWindowTime / 1000 * this.sampleRate);

        // Create buffers
        this.transientBuffer = new Float32Array(this.transientWindowTimeSamples);

        // Obviously they are bounded
        if (this.transientWindowTimeSamples > this.internalBufferSize)
        {
            this.transientWindowTimeSamples = this.internalBufferSize;
        }
        // Reset
        this.transientWaitTimeInSamples = 0;
        this.transientWaiting = false;
        this.transientSilence = true;

        // For HPS
        this.HPSmagnitudeBuffer = new Float32Array(this.frameSize);
        this.HPScorrelationBuffer = new Float32Array(this.frameSize);

        // For ACF
        this.ACFbuffer = new Float32Array(this.frameSize);
        this.ACFpeaksBuffer = new Float32Array(this.frameSize);

        this.ffthelper = new FFTHelper({
            sampleRate: this.sampleRate,
            fftSize: this.frameSize
        });

        // Fill buffers
        for (let i = 0; i < this.frameSize; i++)
        {
            this.HPSmagnitudeBuffer[i] = 0;
            this.HPScorrelationBuffer[i] = 0;

            this.ACFbuffer[i] = 0;
            this.ACFpeaksBuffer[i] = 0;
        }

        for (let i = 0; i < this.internalBufferSize; i++)
        {
            this.internalBuffer[i] = 0;
        }
        for (let i = 0; i < this.transientWindowTimeSamples; i++)
        {
            this.transientBuffer[i] = 0;
        }
    }

    shutdown()
    {
        console.log("Shutting down analyzer");
        this.port.postMessage({shutdown:true})
    }

    process(inputs, outputs, parameters)
    {

        if (this.shouldShutdown == true)
        {
            this.shutdown();
            return false;
        }

        if (this.playback)
        {
            for (let i = 0; i < inputs.length; i++)
            {
                for (let channel = 0; channel < inputs[i].length; channel++)
                {
                    for (let sample = 0; sample < inputs[i][channel].length; sample++)
                    {
                        outputs[i][channel][sample] = inputs[i][channel][sample];
                    }
                }
            }
        }

        if (inputs.length == 0 || !this.userEnabled)
        {
            return true;
        }

        // Only use first channel
        let input = inputs[0][0];

        let oldInternalBufferOffset = this.internalBufferOffset;

        // Append input
        for (let i = 0; i < input.length; i++)
        {
            let j = (this.internalBufferOffset + i) % this.internalBufferSize;
            this.internalBuffer[j] = input[i];

            if (++this.sinceLastProcess == this.processingRate)
            {
                // Begin processing
                this.beginprocessing();
                this.sinceLastProcess = 0;

                // Move forward offset
                this.internalBufferOffset = (oldInternalBufferOffset + i) % this.internalBufferSize;
            }
        }

        // Move forward offset
        this.internalBufferOffset = (oldInternalBufferOffset + input.length) % this.internalBufferSize;
        
        // Required
        return true;
    }

    beginprocessing()
    {

        // 1. Detect transient
        if (this.useTransientToggle)
        {
            this.detectTransient();
        }

        // If we are in a silence, skip processing
        if (this.transientSilence && this.useTransientToggle)
        {
            return;
        }

        switch(this.mode)
        {
            case ACF:
                this.processACF();
                break;
            default:
                // HPS
                this.processHPS();
                break;
        }
    }

    detectTransient()
    {
        // From https://ismir2011.ismir.net/papers/PS2-6.pdf
        // What something looks like in two domains looks the same vice versa
        // So since a sine wave would be a strong peak in frequency domain
        // and a sine wave in time domain (obviously), a peak in the time domain
        // Would look like a sine wave in the frequency domain

        // ... TBD
        
        // OR just detect peaks in time domain by dividing into a few windows based on
        // the n ms transient and find the probability that a transient is detected.

        // To ensure it's really a transient, let the buffer flush and ensure that the
        // probability remains the same (or higher) for the duration of the buffer.

        // Normalize it

        // Load transient buffer
        for (let i = 0; i < this.transientWindowTimeSamples; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.transientWindowTimeSamples) % this.internalBufferSize;

            this.transientBuffer[i] = this.internalBuffer[j];
        }

        // Find the max
        const max = Math.max(...this.transientBuffer);
        if (max != 0)
        {
            for (let i = 0; i < this.transientWindowTimeSamples; i++)
            {
                this.transientBuffer[i] /= max;
            }
        }

        // Now break into transient size windows
        let maxes = [];
        let currentmax = -1;
        for (let i = 0; i < this.internalBufferSize; i++)
        {
            // Record max
            currentmax = Math.max(currentmax, Math.abs(this.transientBuffer[i]));

            // See if we have reached the end of a transient window
            if ((i % this.transientTimeInSamples) + 1 == this.transientTimeInSamples)
            {
                // Record maximum
                maxes.push(currentmax);
                currentmax = -1;
            }
        }

        if (maxes.length == 0)
        {
            // Return false
            return false;
        }

        // Normalize the maxes
        let minmax = Math.min(...maxes);
        let maxmax = Math.max(...maxes) - minmax;
        if (maxmax == 0)
        {
            maxmax = 1;
        }
        let avgmax = 0;
        for (let i = 0; i < maxes.length; i++)
        {
            maxes[i] -= minmax;
            maxes[i] /= maxmax;
            avgmax += maxes[i];
        }

        avgmax /= maxes.length;

        // Will screw up calculation
        if (avgmax == 0)
        {
            avgmax = 1;
        }

        // Find "prob" a transient occurred 
        let probabability = 1 - avgmax;
        
        if (probabability > this.transientThreshold)
        {

            if (!this.transientWaiting)
            {
                // Begin waiting
                this.transientWaiting = true;
                this.transientWaitTimeInSamples = this.internalBufferSize;

                return false;
            }
            else
            {
                // Wait
                if (this.transientWaitTimeInSamples > 0)
                {
                    // Subtract elapsed samples
                    this.transientWaitTimeInSamples -= this.processingRate;
                    return false;
                }
                else
                {
                    // Reset wait time
                    this.transientWaitTimeInSamples = 0;
                    this.transientWaiting = false;
                    // Trigger a transient
                    this.ontransient();
                    return true;
                }
            }
        }
        else
        {
            if (this.transientWaiting)
            {
                this.transientWaitTimeInSamples = 0;
                this.transientWaiting = false;

                return false;
            }
        }

        // No transient detected
        return false;
        
    }

    ontransient()
    {
        let elapsed = Date.now() - this.timeOfLastTransient;

        if (this.numTransients == 0)
        {
            this.timeOfLastTransient = Date.now();
            this.numTransients = 1;
        }
        else if (elapsed / 1000 < this.transientListenPeriod)
        {
            if (this.numTransients < this.numTransientsToTrigger - 1)
            {
                this.numTransients++;
            }
            else
            {
                // Change transient silence flag
                this.transientSilence = !this.transientSilence;

                this.port.postMessage({transientSilence:this.transientSilence});        
                this.numTransients = 0;
                this.timeOfLastTransient = 0;
            }
        }
        else
        {
            this.timeOfLastTransient = Date.now();
            this.numTransients = 1;
        }
    }

    processHPS()
    {
        // For HPS, collect samples up to offset, window them, then fft
        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            this.ffthelper.fftBuffer[i] = this.internalBuffer[j];
        }

        // Perform FFT
        this.ffthelper.fft();

        // Collect Magnitudes
        let HPSsize = this.frameSize / 2;
        for (let i = 0; i < HPSsize; i++)
        {
            this.HPSmagnitudeBuffer[i] = this.ffthelper.magnitude(i) + 0.1;
        }

        // Perform Analysis
        // Set our HPS resolution to be frameSize / 2
        // from 50 to 1000 Hz
        let start = 50, end = 1000;
        for (let i = 0; i < HPSsize; i++)
        {
            // Our selected sampling frequencies from 50 - 1000 Hz
            let w = (start + i * (end - start) / HPSsize);

            // For each frequency downscale n times (say 5)
            const n = this.HPSharmonicCount;
            let tau = 1;
            for (let scalefactor = 1; scalefactor <= n && Math.pow(2, scalefactor) < HPSsize; scalefactor++)
            {
                tau *= getParabolicApproximatePower(this.HPSmagnitudeBuffer, this.sampleRate, w * scalefactor);
            }
            
            this.HPScorrelationBuffer[i] = tau;
        }

        // Normalize first half
        let max = Math.max(...this.HPScorrelationBuffer);
        for (let w = 0; w < HPSsize; w++)
        {
            this.HPScorrelationBuffer[w] /= max;
            this.HPScorrelationBuffer[w + HPSsize] = 0;
        }

        // Get a polynomic interpolated value of peak bin
        let peakbin = getMaxParabolicApproximatePeakBin(this.HPScorrelationBuffer); 

        // Convert to Hz
        let pitch = peakbin / HPSsize * (end - start) + start;

        // Gather a confidence value
        let confidence = 0;
        // Based on expected window width
        // above threshold after normalization
        const width = 40;
        const thresh = 0.1
        let numbinsoverthresh = 0;
        for (let i = 0; i < HPSsize; i++)
        {
            if (this.HPScorrelationBuffer[i] > thresh)
            {
                numbinsoverthresh++;
            }
        }
        confidence = 1 - (numbinsoverthresh - width) / (HPSsize - width);

        // Report findings        
        this.postProcess({
            spectrum: this.HPScorrelationBuffer, 
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
        });

    }
    
    processACF()
    {
        // For ACF, collect samples up to offset, window them
        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            this.ACFbuffer[i] = this.internalBuffer[j] * this.ffthelper.hannwindow(i, this.frameSize);
            this.ACFpeaksBuffer[i] = 0;
        }

        // Easy function: 
        for (let lag = 0; lag < this.frameSize; lag++)
        {
            for (let i = 0; i < this.frameSize; i++)
            {
                this.ACFpeaksBuffer[this.frameSize - 1 - lag] += this.ACFbuffer[i] * this.ACFbuffer[(this.frameSize + i - lag) % this.frameSize];
            }
        }

        // Remove noise
        for (let i = 0; i < this.frameSize; i++)
        {
            if (this.ACFpeaksBuffer[i] < this.ACFthreshold)
            {
                this.ACFpeaksBuffer[i] = 0;
            }
        }

        // Normalize peaks
        let max = Math.max(...this.ACFpeaksBuffer);
        if (max == 0)
        {
            max = 1;
        }
        for (let i = 0; i < this.frameSize; i++)
        {
            this.ACFpeaksBuffer[i] /= max;
        }

        // Now calculate avg distance between peaks

        // Pitch is the sample rate divided by the period (in bins)
        let firstpeakbin = getNthParabolicApproximatePeakBin(this.ACFpeaksBuffer, 1);
        let pitch = this.sampleRate / (firstpeakbin + 1) ;

        if (pitch < 0)
        {
            pitch = 0;
        }

        // Gather a confidence value
        let confidence = 0;

        // Basically check band width
        const idealbandwidth = 15;
        let firstactualpeakbin = getNthPeakBin(this.ACFpeaksBuffer, 1);
        let first0band = firstactualpeakbin;
        let last0band = firstactualpeakbin;
        while (first0band > -1 && this.ACFpeaksBuffer[first0band] > 0)
        {
            first0band--;
        }
        while (last0band < this.frameSize && this.ACFpeaksBuffer[last0band] > 0)
        {
            last0band++;
        }

        let numbands = (last0band - first0band);

        // Now we go through and assign difference to confindence
        for (let i = 0; i < numbands / 2; i++)
        {
            confidence += Math.abs(this.ACFpeaksBuffer[last0band] - this.ACFpeaksBuffer[first0band]);
            last0band--;
            first0band++;
        }

        confidence = 1 - (confidence / (2 * numbands));
        confidence = confidence * 10 - 9;

        // Report findings        
        this.postProcess({
            spectrum: this.ACFpeaksBuffer.slice(0,this.frameSize/2), 
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence},
            peaks:numbands
        });
    }

    postProcess(report)
    {

        // Here we modify the report to include the smoothness and precision parameters
        // Note that we don't want to mess with OG data to store in reports, i.e. averages
        // Instead, we want to store the accurate pitch and confidence in a report and 
        // send the adjusted report to user
        
        // If pitch is NaN confidence is 0
        if (isNaN(report.pitchInfo.pitch))
        {
            report.pitchInfo.confidence = 0;
        }

        if (isNaN(report.pitchInfo.confidence))
        {
            report.pitchInfo.confidence = 0;
        }

        report.pitchInfo.confidence = Math.max(0, Math.min(1, report.pitchInfo.confidence));



        let smoothedPitch = report.pitchInfo.pitch;
        let smoothedConfidence = report.pitchInfo.confidence;

        // Apply precision (pitch only)
        if (this.precision >= 0)
        {
            // If >= 0, is rounding decimal places (powers of 10)
            const pow10 = Math.pow(10, this.precision);
            smoothedPitch = Math.round(smoothedPitch * pow10) / pow10;
        }
        else
        {
            // Otherwise, divide range into 2 (hard to explain, see below)
            const pow2 = Math.pow(2, -this.precision);
            smoothedPitch = Math.round(smoothedPitch / pow2) * pow2;
        }

        report.pitchInfo.pitch = smoothedPitch;
        report.pitchInfo.confidence = smoothedConfidence;

        this.port.postMessage(report);
    }
}
  
registerProcessor("worklet-analyzer", WorkletAnalyzer);