const ACF = "ACF";
const HPS = "HPS";

function getPeakBin(spectrum)
{
    let peakbin = -1;
    for (let i = 1; i < spectrum.length / 2; i++)
    {
        if (spectrum[i-1] < spectrum[i] && spectrum[i+1] < spectrum[i])
        {
            peakbin = i;
            break;
        }
    }
    return peakbin;
}
function getParabolicApproximateBin(spectrum)
{
    // 1. Find first peak bin
    let peakbin = getPeakBin(spectrum);

    // 2. Create letter vars corresponding to alpha, beta, gamma
    let a = spectrum[peakbin-1];
    let b = spectrum[peakbin];
    let c = spectrum[peakbin+1];

    // 3. Use equation to find interpolated bin value
    let interpolatedbin = 0.5 * ((a - c) / (a - 2 * b + c)) + peakbin;

    return interpolatedbin;
}
function getParabolicApproximateFrequency(spectrum)
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

class WorkletAnalyzer extends AudioWorkletProcessor
{
    constructor(parameters)
    {

        super();

        this.sampleRate = 44100;
        this.internalBufferSize = 16384;
        this.fftSize = 512;
        this.mode = HPS;
        this.processingRate = 256; // In samples
        this.internalBufferOffset = 0;
        this.sinceLastProcess = 0;

        // Store sample rate, buffer size, etc
        for (let i = 0; i < parameters.processorOptions.length; i++)
        {
            let key = Object.keys(parameters.processorOptions[i])[0];
            this[key] = parameters.processorOptions[i]; 
        }

        // Create buffers
        this.internalBuffer = new Float32Array(this.internalBufferSize);
        this.fftBuffer = new Float32Array(2*this.fftSize); // real and imaginary
        this.window = new Float32Array(this.fftSize);

        // For HPS
        this.HPSmagnitudeBuffer = new Float32Array(this.fftSize);
        this.HPScorrelationBuffer = new Float32Array(this.fftSize);

        // Fill em
        for (let i = 0; i < this.fftSize; i++)
        {
            this.fftBuffer[i] = 0;
            this.fftBuffer[2*i] = 0;
            // Hamming window
            this.window[i] = 0.5 * (1 - Math.cos((i * 2 * Math.PI) / (this.fftSize - 1)));


            this.HPSmagnitudeBuffer[i] = 0;
            this.HPScorrelationBuffer[i] = 0;
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

        if (inputs.length == 0)
        {
            return;
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
        for (let i = 0; i < this.fftSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.fftSize) % this.internalBufferSize;

            this.fftBuffer[i] = this.internalBuffer[j] * this.window[i]; // real
            this.fftBuffer[i + this.fftSize] = 0; // imaginary

        }


        // Perform FFT
        this.fft();

        // Collect Magnitudes
        for (let i = 0; i < this.fftSize / 2; i++)
        {
            this.HPSmagnitudeBuffer[i] = Math.sqrt(Math.pow(this.fftBuffer[i], 2) + Math.pow(this.fftBuffer[i + this.fftSize], 2));

            // Also, for HPS presave  first iteration
            this.HPScorrelationBuffer[i] = this.HPSmagnitudeBuffer[i] + 1;
        }

        // Perform Analysis
        for (let w = 0; w < this.fftSize / 2; w++)
        {
            // For each frequency downscale n times (say 5)
            const n = 3;
            let tau = this.HPSmagnitudeBuffer[w];
            for (let scalefactor = 1; scalefactor < n && w * Math.pow(2, n) < this.fftSize / 2; scalefactor++)
            {

                tau *= this.HPSmagnitudeBuffer[w * scalefactor];
            }

            this.HPScorrelationBuffer[w] = tau;
        }

        // Normalize first half
        let max = Math.max(...this.HPScorrelationBuffer);
        for (let w = 0; w < this.fftSize / 2; w++)
        {
            this.HPScorrelationBuffer[w] /= max;
            this.HPScorrelationBuffer[w + this.fftSize / 2] = 0;
        }

        // log max        
        this.port.postMessage(this.HPScorrelationBuffer);

    }
    
    processACF()
    {

    }

    fft()
    {

        // 1. Bit flip
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

        // 2. FFT

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
}
  
registerProcessor("worklet-analyzer", WorkletAnalyzer);