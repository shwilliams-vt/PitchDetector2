const ACF = "ACF";
const HPS = "HPS";

import
{ 
    getMaxPeakBin, 
    getNthPeakBin,
    getMaxParabolicApproximatePeakBin,
    getNthParabolicApproximatePeakBin,
    getParabolicApproximateFrequency, 
    getParabolicApproximatePower
} from "./helpers.js";

import FFTHelper from "./ffthelper.js";

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
        // Threshold (probability) for triggering a transient
        this.transientThreshold = 0.8;

        this.userEnabled = true;
        // When transient found, this is triggered
        this.transientSilence = false;
        // When transient is found, count is set to internal buffer size
        this.transientWaitTimeInSamples = 0;
        // Used to indicate if a potential transient has been identified
        this.transientWaiting = false;
        // Allows for audio playback
        this.playback = true;

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
        }

        this.initialize();

    }

    initialize()
    {
        /// Init vars

        // Create buffers
        this.internalBuffer = new Float32Array(this.internalBufferSize);
        this.transientBuffer = new Float32Array(this.internalBufferSize);

        // Determine transient time in sampels
        this.transientTimeInSamples = Math.ceil(this.transientTime / 1000 * this.internalBufferSize);
        // Reset
        this.transientWaitTimeInSamples = 0;
        this.transientWaiting = false;

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

        // Store last pitches
        this.lastreports = [];
        for (let i = 0; i < this.smoothness; i++)
        {
            this.lastreports[i] = new Report({pitch:0, confidence:0});
        }

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
            this.transientBuffer[i] = 0;
        }
    }

    process(inputs, outputs, parameters)
    {

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
        this.detectTransient();

        // If we are in a silence, skip processing
        if (this.transientSilence)
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
        for (let i = 0; i < this.internalBufferSize; i++)
        {
            this.transientBuffer[i] = this.internalBuffer[i];
        }

        // Find the max
        const max = Math.max(...this.transientBuffer);
        if (max != 0)
        {
            for (let i = 0; i < this.internalBufferSize; i++)
            {
                this.transientBuffer[i] /= max;
            }
        }

        // Now break into transient size windows
        let maxes = [];
        let currentmax = -1;
        for (let i = 0; i < this.internalBufferSize; i++)
        {
            // See if we have reached the end of a transient window
            if ((i % this.transientTimeInSamples) + 1 == this.transientTimeInSamples || i == this.internalBufferSize - 1)
            {
                // Record maximum
                maxes.push(currentmax);
                currentmax = -1;
            }

            // Record max
            currentmax = Math.max(currentmax, Math.abs(this.internalBuffer[i]));
        }


        // Normalize the maxes
        let minmax = Math.min(...maxes);
        let maxmax = Math.max(...maxes) - minmax;
        let avgmax = 0;
        if (minmax != 0 && maxmax != 0)
        {
            for (let i = 0; i < maxes.length; i++)
            {
                maxes[i] -= minmax;
                maxes[i] /= maxmax;
                avgmax += maxes[i];
            }
        }

        if (maxes.length > 0)
        {
            avgmax /= maxes.length;
        }
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
                this.transientWaitTimeInSamples = this.internalBufferSize + this.processingRate;

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
                    // Change transient silence flag
                    this.transientSilence = !this.transientSilence;
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
        this.port.postMessage({transientSilence:this.transientSilence});        
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


        // Apply smoothness
        // Do this by averaging last n pitches
        let smoothedPitch = report.pitchInfo.pitch;
        let smoothedConfidence = report.pitchInfo.confidence;
        for (let i = 0; i < this.lastreports.length; i++)
        {
            smoothedPitch += this.lastreports[i].pitch;
            smoothedConfidence += this.lastreports[i].confidence;
        }

        smoothedPitch /= this.lastreports.length + 1;
        smoothedConfidence /= this.lastreports.length + 1;

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

        // Shift last reports
        this.lastreports.shift();
        this.lastreports.push(new Report({pitch:report.pitchInfo.pitch, confidence:report.pitchInfo.confidence}));

        report.pitchInfo.pitch = smoothedPitch;
        report.pitchInfo.confidence = smoothedConfidence;

        this.port.postMessage(report);
    }
}
  
registerProcessor("worklet-analyzer", WorkletAnalyzer);