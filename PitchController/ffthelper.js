import { getParabolicApproximatePower } from "./helpers.js";

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