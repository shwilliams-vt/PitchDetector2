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

class WorkletAnalyzer extends AudioWorkletProcessor
{
    constructor(parameters)
    {

        super();

        this.sampleRate = 44100;
        this.internalBufferSize = 16384;
        this.frameSize = 512;
        this.mode = HPS;
        this.processingRate = 256; // In samples
        this.internalBufferOffset = 0;
        this.sinceLastProcess = 0;

        this.enabled = true;

        // For HPS
        this.HPSharmonicCount = 2;

        // For ACF
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
                this.enabled = e.data.enabled;
                console.log(this.enabled)
            }
        }

        this.initialize();

    }

    initialize()
    {
        /// Init vars

        // Create buffers
        this.internalBuffer = new Float32Array(this.internalBufferSize);

        // For HPS
        this.HPSmagnitudeBuffer = new Float32Array(this.frameSize);
        this.HPScorrelationBuffer = new Float32Array(this.frameSize);

        // For ACF
        this.ACFbuffer = new Float32Array(this.frameSize);
        this.ACFpeaksBuffer = new Float32Array(this.frameSize);

        this.ffthelper = new FFTHelper({
            sampleRate: this.sampleRate,
            fftSize: this.frameSize
        })

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
    }

    process(inputs, outputs, parameters)
    {

        if (true)
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

        if (inputs.length == 0 || !this.enabled)
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

        // If pitch is NaN confidence is 0
        if (isNaN(pitch))
        {
            confidence = 0;
        }

        if (isNaN(confidence))
        {
            confidence = 0;
        }

        confidence = Math.max(0, Math.min(1, confidence));

        // Report findings        
        this.port.postMessage({
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
        let pitch = this.sampleRate / firstpeakbin - 4;

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

        // If pitch is NaN confidence is 0
        if (isNaN(pitch))
        {
            confidence = 0;
        }

        if (isNaN(confidence))
        {
            confidence = 0;
        }

        confidence = Math.max(0, Math.min(1, confidence));


        // Report findings        
        this.port.postMessage({
            spectrum: this.ACFpeaksBuffer.slice(0,this.frameSize/2), 
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence},
            peaks:numbands
        });
    }
}
  
registerProcessor("worklet-analyzer", WorkletAnalyzer);