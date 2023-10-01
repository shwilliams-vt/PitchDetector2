const ACF = "ACF";
const HPS = "HPS";
const EXP = "EXP";

const window = {};

// -- Begin add helpers

function parabolicInterpolationX(spectrum, bin)
{
    var x1 = spectrum[bin - 1];
    var x2 = spectrum[bin];
    var x3 = spectrum[bin + 1]
    
    var a = (x1 + x3 - 2 * x2) / 2;
    var b = (x3 - x1) / 2
    if (a) {
        bin = bin - b / (2 * a);
    }

    return bin;
}

export function parabolicInterpolationY(spectrum, binfrequency)
{
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
    let f = b;
    if (nearestbin <= 0)
    {
        f = spectrum[0];
    }
    else if (nearestbin >= spectrum.length - 1)
    {
        f = spectrum[spectrum.length - 1];
    }
    else
    {
        f = m * Math.pow(binfrequency - (peakbinoffset + nearestbin), 2) + peakbinvalue;
    }
    return f;
}

function noiseScore(spectrum, maxSearch, type, maxBin, lastSpectrum, sampleRate, processSize)
{
    let s = 0;
    for (let i = 0; i < maxSearch; i++)
    {
        s += 1.7 * Math.abs(spectrum[i] - lastSpectrum[i]);
    }

    return 1 - (s / 10);
}

function normalize(spectrum)
{
    let max = -99999, min = 99999;
    for (let i = 0; i < spectrum.length; i++)
    {
        if (spectrum[i] > max)
            max = spectrum[i];
        if (spectrum[i] < min)
            min = spectrum[i]
    }
    let val = max;
    if (max < Math.abs(min))
    {
        val = Math.abs(min);
    }

    if (val == 0)
    {
        val = 1;
    }
    for (let i = 0; i < spectrum.length; i++)
    {
        spectrum[i] /= val;
    }
}

function getMaxBin(spectrum, maxSearch)
{
    maxSearch ||= spectrum.length;
    return spectrum.reduce((p,v,i)=> (v > spectrum[p] ? i : p) , 0);
}

function isPeak2 (spectrum, i, minPeakGain, useFive)
    {
        let peak = i > 0 && spectrum[i] >= minPeakGain;
        peak &= spectrum[i] >= spectrum[i + 1];
        peak &= spectrum[i] >= spectrum[i - 1];

        if (useFive)
        {
            peak &= spectrum[i] >= spectrum[i + 2];
            // Be lenient with lower bands
            if (i >= 2)
                peak &= spectrum[i] >= spectrum[i - 2];
        }
        return peak;
}

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
export function getNthPeakBin(spectrum, n, minVal)
{
    minVal ||= 0;
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

export function standardDeviation(numArray) {
    const mean = numArray.reduce((s, n) => s + n) / numArray.length;
    const variance = numArray.reduce((s, n) => s + (n - mean) ** 2, 0) / (numArray.length - 1);
    return Math.sqrt(variance);
}

export function approximateValue(numArray, location)
{
    let nearestbin = Math.round(location);

    if (nearestbin < 0)
    {
        nearestbin = 0;
    }
    if (nearestbin >= numArray.length)
    {
        nearestbin = numArray.length - 1;
    }

    // 3. Create letter vars corresponding to alpha, beta, gamma
    let a = numArray[nearestbin-1];
    let b = numArray[nearestbin];
    let c = numArray[nearestbin+1];

    // Handle cases
    if (isNaN(a))
    {
        a = (c - b) * (nearestbin-1);
    }
    if (isNaN(c))
    {
        c = (b - a) * (nearestbin+1);
    }

    // 4. Slope (coefficient of power 2 polynomial)
    let m = 0.5 * (a - 2 * b + c);

    // 5. Use equation to solve for peak bin
    let peakbinoffset = 0.25 * ((a - c) / m);

    // 6. Use equation to find interpolated peak bin value
    let peakbinvalue = b - 0.25 * (a - c) * peakbinoffset;

    // console.log(peakbinvalue)

    // 7. Return the frequency
    return m * Math.pow(location - (peakbinoffset + nearestbin), 2) + peakbinvalue;
}

export function getXPositionOfAvg(numArray)
{
    let mean = 0, weight = 0, size = numArray.length;

    for (let i = 0; i < size; i++)
    {
        mean += numArray[i];
        weight += i * numArray[i];
    }

    let approxAvgPt = weight / mean;

    return approxAvgPt;
}

export function getParabolicBinApproximation(spectrum, bin)
{
    // 2. Create letter vars corresponding to alpha, beta, gamma
    let a = spectrum[bin-1];
    let b = spectrum[bin];
    let c = spectrum[bin+1];

    // 3. Slope
    let m = 0.5 * (a - 2 * b + c);

    // 3. Use equation to find interpolated bin value
    let interpolatedbin = 0.25 * ((a - c) / m) + bin;

    return interpolatedbin;
}

function isPeak (spectrum, i, minPeakGain, useFive)
    {
        let peak = i > 0 && spectrum[i] >= minPeakGain;
        peak &= spectrum[i] >= spectrum[i + 1];
        peak &= spectrum[i] >= spectrum[i - 1];

        if (useFive)
        {
            peak &= spectrum[i] >= spectrum[i + 2];
            // Be lenient with lower bands
            if (i >= 2)
                peak &= spectrum[i] >= spectrum[i - 2];
        }
        return peak;
}

function getPeaks(spectrum, maxSearch, minPeakGain, useFive)
{
    let peaks = [];

    for (let i = 0; i < maxSearch; i++)
    {
        if (isPeak(spectrum, i, minPeakGain, useFive))
        {
            peaks.push(i);
        }
    }
    return peaks;
}

export function getClosestPeakBin(numArray, position)
{
    // Find min or max left and right, prioritize right
    let size = numArray.length;
    let roundedPos = Math.round(position);
    let peakLocation = roundedPos;


    for (let i = 0; i < size; i++)
    {
        let j = roundedPos + i;
        let k = roundedPos - i;

        if (j < size - 1)
        {
            if (isPeak(numArray, j))
            {
                peakLocation = j;
                break;
            }

            if (j == roundedPos)
            {
                // First case but we check anyway
                continue;
            }
        }

        if (k > 0)
        {
            if (isPeak(numArray, k))
            {
                peakLocation = k;
                break;
            }
        }
    }

    // return approximateValue(numArray, peakLocation);
    return peakLocation;
}

export function widthFunction(numArray)
{

    let size = numArray.length;
    let approxAvgPt = getXPositionOfAvg(numArray);

    let trash = 0;


    for (let i = 1; i < size; i++)
    {
        let j = approxAvgPt + i;
        let k = approxAvgPt - i;

        if (j < size)
        {
            let p = approximateValue(numArray, j);
            trash += p / (size - i);
        }

        if (k >= 0)
        {
            let p = approximateValue(numArray, k)
            trash += p / (size - i);
        }
    }
    // console.log(approximateValue(numArray, approxAvgPt))

    return trash;
}

const FFT = (function ()
{
    function fft(amplitudes, inverse)
    {
        if (inverse == true)
        {
            let amps = [];
            amplitudes.map(v=>amps.push(v));
            return new FFTResults(icfft(amps));
        }
        else
        {
            let amps = [];
            amplitudes.map(v=>amps.push(v));
            return new FFTResults(cfft(amps));
        }
    }
    /*
    complex fast fourier transform and inverse from
    http://rosettacode.org/wiki/Fast_Fourier_transform#C.2B.2B
    */
    function icfft(amplitudes)
    {
        var N = amplitudes.length;
        var iN = 1 / N;

        //conjugate if imaginary part is not 0
        for(var i = 0 ; i < N; ++i)
            if(amplitudes[i] instanceof Complex)
                amplitudes[i].im = -amplitudes[i].im;

        //apply fourier transform
        amplitudes = cfft(amplitudes)

        for(var i = 0 ; i < N; ++i)
        {
            //conjugate again
            amplitudes[i].im = -amplitudes[i].im;
            //scale
            amplitudes[i].re *= iN;
            amplitudes[i].im *= iN;
        }
        return amplitudes;
    }

    function cfft(amplitudes)
    {
        var N = amplitudes.length;
        if( N <= 1 )
            return amplitudes;

        var hN = N / 2;
        var even = [];
        var odd = [];
        even.length = hN;
        odd.length = hN;
        for(var i = 0; i < hN; ++i)
        {
            even[i] = amplitudes[i*2];
            odd[i] = amplitudes[i*2+1];
        }
        even = cfft(even);
        odd = cfft(odd);

        var a = -2*Math.PI;
        for(var k = 0; k < hN; ++k)
        {
            if(!(even[k] instanceof Complex))
                even[k] = new Complex(even[k], 0);
            if(!(odd[k] instanceof Complex))
                odd[k] = new Complex(odd[k], 0);
            var p = k/N;
            var t = new Complex(0, a * p);
            t.cexp(t).mul(odd[k], t);
            amplitudes[k] = even[k].add(t, odd[k]);
            amplitudes[k + hN] = even[k].sub(t, even[k]);
        }
        return amplitudes;
    }

    //test code
    //console.log( cfft([1,1,1,1,0,0,0,0]) );
    //console.log( icfft(cfft([1,1,1,1,0,0,0,0])) );

    /*
    basic complex number arithmetic from
    http://rosettacode.org/wiki/Fast_Fourier_transform#Scala
    */
    function Complex(re, im)
    {
        this.re = re;
        this.im = im || 0.0;
    }
    Complex.prototype.add = function(other, dst)
    {
        dst.re = this.re + other.re;
        dst.im = this.im + other.im;
        return dst;
    }
    Complex.prototype.sub = function(other, dst)
    {
        dst.re = this.re - other.re;
        dst.im = this.im - other.im;
        return dst;
    }
    Complex.prototype.mul = function(other, dst)
    {
        //cache re in case dst === this
        var r = this.re * other.re - this.im * other.im;
        dst.im = this.re * other.im + this.im * other.re;
        dst.re = r;
        return dst;
    }
    Complex.prototype.cexp = function(dst)
    {
        var er = Math.exp(this.re);
        dst.re = er * Math.cos(this.im);
        dst.im = er * Math.sin(this.im);
        return dst;
    }
    Complex.prototype.log = function()
    {
        /*
        although 'It's just a matter of separating out the real and imaginary parts of jw.' is not a helpful quote
        the actual formula I found here and the rest was just fiddling / testing and comparing with correct results.
        http://cboard.cprogramming.com/c-programming/89116-how-implement-complex-exponential-functions-c.html#post637921
        */
        if( !this.re )
            console.log(this.im.toString()+'j');
        else if( this.im < 0 )
            console.log(this.re.toString()+this.im.toString()+'j');
        else
            console.log(this.re.toString()+'+'+this.im.toString()+'j');
    }

    function FFTResults(results)
    {
        this.results = results;
    }
    FFTResults.prototype.magnitudes = function()
    {
        let mags = [];
        let length = this.results.length / 2;
        this.results.map((complex, i) => {
            // Only do first part of (duplicate) spectrum
            if (i <= length)
            {
                mags.push(Math.sqrt(complex.re ** 2 + complex.im ** 2))
            }
        });
        return mags;
    }

    return {
        "Complex": Complex,
        "icfft": icfft,
        "cfft": cfft,
        "fft": fft,
        "FFTResults": FFTResults
    }
})();

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

        // For generic audio
        this.audioBuffer = new Float32Array(this.frameSize);
        this.zeroCrossing = new Float32Array(this.frameSize);

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
            this.audioBuffer[i] = 0;
            this.zeroCrossing[i] = 0;

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
            case EXP:
                this.processEXP();
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

    processEXP2()
    {
        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            // this.ffthelper.fftBuffer[i] = this.internalBuffer[j];
            this.audioBuffer[i] = this.internalBuffer[j];
        }

        // Perform FFT
        let results = FFT.fft(this.audioBuffer, false);
        // this.ffthelper.fft();

        // Collect Magnitudes
        // let HPSsize = Math.round(this.frameSize / 14);
        let HPSsize = this.frameSize / 2;

        const magnitudeBuffer = results.magnitudes();
        // for (let i = 0; i < HPSsize; i++)
        // {
        //     magnitudeBuffer[i] = this.ffthelper.magnitude(i);
        // }

        this.lastMags ||= magnitudeBuffer.map(v=>v);

        // options
        let minFreq = 80;
        let maxFreq = 2500;
        let minPeakGain = 0.3;
        let numHarmonics = 5;

        let minAnalysisBin = Math.round(minFreq / this.sampleRate * this.frameSize);
        let maxAnalysisBin = Math.round(maxFreq / this.sampleRate * this.frameSize);

        // Normalize
        normalize(magnitudeBuffer);

        // Get peaks
        let peaks = getPeaks(magnitudeBuffer, maxAnalysisBin, minPeakGain, true);

        // If there is huge difference between peaks due to noise, probably
        // a whistle

        let biggestPeakDifference = 0;
        if (peaks.length > 1)
        {
            for (let i = 1; i < peaks.length; i++)
            {
                let diff = peaks[i] - peaks[i-1];
                if (diff > biggestPeakDifference)
                {
                    biggestPeakDifference = diff;
                }
            }
        }

        let pitch = 0, confidence = 0, type = "unknown";

        if (peaks.length == 1 || biggestPeakDifference > 30)
        {
            type = "whistle";
        }
        else
        {
            type = "hum";
        }

        if (type === "whistle")
        {
            let maxBin = parabolicInterpolationX(magnitudeBuffer, peaks[peaks.length - 1]);
            // confidence =
            //     0.7 * Math.min(parabolicInterpolationY(mags, maxBin),1 )
            //     + 0.2 * nextHighestPeak(mags, peaks)
            //     + 0.1 * noiseScore(mags, maxAnalysisBin, type, maxBin);
            pitch = maxBin / this.frameSize * this.sampleRate;
            confidence = noiseScore(magnitudeBuffer, maxAnalysisBin, type, maxBin, this.lastMags);
        }
        else
        {
            let maxBin = parabolicInterpolationX(magnitudeBuffer, peaks[0]);
            // confidence =
            //     0.6 * Math.min(parabolicInterpolationY(mags, maxBin),1 )
            //     + 0.1 * nextHighestPeak(mags, peaks);
            //     + 0.3 * noiseScore(mags, maxAnalysisBin, type, maxBin);
            pitch = maxBin / this.frameSize * this.sampleRate;
            confidence = noiseScore(magnitudeBuffer, maxAnalysisBin, type, maxBin, this.lastMags, this.sampleRate, this.processRate);

        }

        this.lastMags = magnitudeBuffer;


        // this.port.postMessage({magnitudes: mags, pitch: pitch, type: type, confidence: confidence});
        // Report findings
        this.postProcess({
            spectrum: magnitudeBuffer,
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
        });
    }

    processEXPOld()
    {
        const minPitchVolume = 0.007;
        // const minPitchVolume = 0.05;

        let pitch = 0;
        let confidence = 0;

        // Determine if whistle or humming by...
        // Choice: Calculate standard deviation on power spectrum

        const minDeviation = 0.055;
        // 1. FFT
        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            this.ffthelper.fftBuffer[i] = this.internalBuffer[j];
            this.audioBuffer[i] = this.internalBuffer[j];
        }

        var sumOfSquares = 0;
        for (var i = 0; i < this.frameSize; i++) {
            var val = this.ffthelper.fftBuffer[i];
            sumOfSquares += val * val;
        }
        var rootMeanSquare = Math.sqrt(sumOfSquares / this.frameSize);

        // console.log(rootMeanSquare)

        if (rootMeanSquare < minPitchVolume) {
            // Report findings
            this.postProcess({
                spectrum: new Float32Array(this.frameSize),
                pitchInfo: {pitch: NaN, confidence:0}
            });

            return;
        }

        // Perform FFT
        this.ffthelper.fft();

        // Collect Magnitudes
        let HPSsize = Math.round(this.frameSize / 14);

        const magnitudeBuffer = new Float32Array(HPSsize);
        for (let i = 0; i < HPSsize; i++)
        {
            magnitudeBuffer[i] = this.ffthelper.magnitude(i) + 0.1;
        }

        let max = Math.max(...magnitudeBuffer);
        for (let i = 0; i < HPSsize; i++)
        {
            magnitudeBuffer[i] /= max;
        }

        // Band width
        let width = widthFunction(magnitudeBuffer);

        // console.log(sd > minDeviation);

        // If the band width (not very great name perhaps) is wide enough
        // (think similar to a distribution), then it is a voice or hum,
        // otherwise it "is" a whistle (for the sake of processing a pure tone)

        if (width > minDeviation)
        {
            console.log("hum")

            // this.processACF();
            // this.processHPS();
            // Old
            if (false)
            {
                // Zero cross then ACF

                // Set min and max frequency boundaries

                const minHumHz = 90;
                const maxHumHz = 520;

                const minHumBin = Math.round(minHumHz / this.sampleRate * this.frameSize);
                const maxHumBin = Math.round(maxHumHz / this.sampleRate * this.frameSize);

                let positive = this.audioBuffer[0] > 0;
                this.zeroCrossing[0] = positive ? 1 : -1;

                for (let i = 1; i < this.frameSize; i++)
                {
                    let samp = this.audioBuffer[i];
                    if (positive && samp <= 0 || !positive && samp > 0)
                    {
                        this.zeroCrossing[i] = 0;
                        positive = !positive;
                    }
                    else
                    {
                        this.zeroCrossing[i] = positive ? 1 : -1;
                    }
                }

                // https://alexanderell.is/posts/tuner/
                var SIZE = this.zeroCrossing.length;

                // Find a range in the buffer where the values are below a given threshold.
                var r1 = 0;
                var r2 = SIZE - 1;
                var threshold = 0.2;

                // Walk up for r1
                for (var i = 0; i < SIZE / 2; i++) {
                    if (Math.abs(this.zeroCrossing[i]) < threshold) {
                    r1 = i;
                    break;
                    }
                }

                // Walk down for r2
                for (var i = 1; i < SIZE / 2; i++) {
                    if (Math.abs(this.zeroCrossing[SIZE - i]) < threshold) {
                    r2 = SIZE - i;
                    break;
                    }
                }

                // Trim the buffer to these ranges and update SIZE.
                let buffer = this.zeroCrossing.slice(r1, r2);
                SIZE = buffer.length;

                // Create a new array of the sums of offsets to do the autocorrelation
                var c = new Array(SIZE).fill(0);
                // For each potential offset, calculate the sum of each buffer value times its offset value
                for (let i = 0; i < SIZE; i++) {
                    for (let j = 0; j < SIZE - i; j++) {
                    c[i] = c[i] + buffer[j] * buffer[j+i]
                    }
                }

                // Find the last index where that value is greater than the next one (the dip)
                var d = 0;
                while (c[d] > c[d+1]) {
                    d++;
                }

                // Iterate from that index through the end and find the maximum sum
                var maxValue = -1;
                var maxIndex = -1;
                for (var i = d; i < SIZE; i++) {
                    if (c[i] > maxValue) {
                    maxValue = c[i];
                    maxIndex = i;
                    }
                }

                var T0 = maxIndex;

                // Not as sure about this part, don't @ me
                // From the original author:
                // interpolation is parabolic interpolation. It helps with precision. We suppose that a parabola pass through the
                // three points that comprise the peak. 'a' and 'b' are the unknowns from the linear equation system and b/(2a) is
                // the "error" in the abscissa. Well x1,x2,x3 should be y1,y2,y3 because they are the ordinates.
                var x1 = c[T0 - 1];
                var x2 = c[T0];
                var x3 = c[T0 + 1]

                var a = (x1 + x3 - 2 * x2) / 2;
                var b = (x3 - x1) / 2
                if (a) {
                    T0 = T0 - b / (2 * a);
                }

                pitch = this.sampleRate/T0;

                confidence = Math.min(1, rootMeanSquare / (2 * minPitchVolume));
                confidence *= (0.8 + 0.2 * (1 - pitch / maxHumHz));
                confidence *= (0.8 + 0.2 * (1 - (width - 0.5) / 0.25) / 1.3);
                confidence = Math.min(Math.max(0, confidence), 1);
            }

            // Find closest peak to avg freq in pure tone
            let firstBin = getNthPeakBin(magnitudeBuffer, 1, 0.2);
            let approxPeakBin = getClosestPeakBin(magnitudeBuffer, firstBin);

            pitch = getParabolicBinApproximation(magnitudeBuffer, approxPeakBin) * this.sampleRate / this.frameSize;
            confidence = 1 - (2 * Math.abs(width - minDeviation));

            // Report findings
            this.postProcess({
                spectrum: magnitudeBuffer,
                pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
            });

        }
        else
        {
            console.log("whistle")

            // Set min and max frequency boundaries
            // const minWhistleHz = 600;
            const minWhistleHz = 600;
            const maxWhistleHz = 2600;

            const minWhistleBin = minWhistleHz / this.sampleRate * this.frameSize;
            const maxWhistleBin = maxWhistleHz / this.sampleRate * this.frameSize;

            for (let i = 0; i < HPSsize; i++)
            {
                if (i < minWhistleBin || i > maxWhistleBin)
                {
                    magnitudeBuffer[i] = 0;
                }
            }

            // Find closest peak to avg freq in pure tone
            let avgXPos = getXPositionOfAvg(magnitudeBuffer);
            let approxPeakBin = getClosestPeakBin(magnitudeBuffer, avgXPos);

            pitch = getParabolicBinApproximation(magnitudeBuffer, approxPeakBin) * this.sampleRate / this.frameSize;
            confidence = 1 - (2 * Math.abs(width - minDeviation));

            // Report findings
            this.postProcess({
                spectrum: magnitudeBuffer,
                pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
            });
        }


    }

    pOlddddd()
    {

        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            // this.ffthelper.fftBuffer[i] = this.internalBuffer[j];
            this.audioBuffer[i] = this.internalBuffer[j];
        }

        normalize(this.audioBuffer);
        // Perform FFT
        let results = FFT.fft(this.audioBuffer, false);
        let magnitudes = results.magnitudes();
        normalize(magnitudes);

        // Average points
        let avg = new Float32Array(magnitudes.length);
        for (let i = 1; i < magnitudes.length; i++)
        {
            avg[i] = Math.sqrt( magnitudes[i] ** 2 + magnitudes[i - 1] ** 2);
        }

        // Center clip
        let centerClipVal = 0.5;
        for (let i = 0; i < avg.length; i++)
        {
            if (avg[i] < centerClipVal)
            {
                avg[i] = 0;
            }
        }

        let pitch = 0, confidence = 0, type = "lol";

        let peaks = getPeaks(avg, avg.length, centerClipVal, true);
        if (peaks == [])
        {
            peaks = [0]
        }

        function standardDeviation(list)
        {
            if (list.length == 0)
                list = [0];
            let avg = list.reduce((s,v)=>s+=v) / list.length;
            return Math.sqrt(list.reduce((s,v)=>s += (v-avg) ** 2)) / list.length;
        }
        let s = standardDeviation(peaks);

        let whistleNoiseDev = 5;
        let avgPitchBin = 0;
        if (s > whistleNoiseDev)
        {
            // Handle a whistle with low/mid noise (i.e. get pitch from right)
            avgPitchBin = peaks[peaks.length - 1];

            // Probably 3 bars of solid pitch, consider all else noise
            let vals = [avg[avgPitchBin - 1], avg[avgPitchBin], avg[avgPitchBin + 1]];
            avg[avgPitchBin - 1] = 0; avg[avgPitchBin] = 0; avg[avgPitchBin + 1] = 0;
            // Add weight for whistle since we are pretty sure this is just noise
            let w = 0.01
            let sum = avg.reduce((s,v)=>s+=w * v);
            avg[avgPitchBin - 1] = vals[0]; avg[avgPitchBin] = vals[1]; avg[avgPitchBin + 1] = vals[2];

            confidence = 1 - Math.cbrt(sum / 10);
            confidence = Math.min(1, Math.max(0, confidence));
        }
        else
        {
            avgPitchBin = peaks[0];


            let numHarmonics = 7;

            // Remove harmonics
            // todo this is wrong because of avg
            let interpolatedAvgPitchBin = parabolicInterpolationX(avg, avgPitchBin);
            let f = interpolatedAvgPitchBin / this.frameSize * this.sampleRate;

            for (let h = 1; h <= numHarmonics; h++)
            {
                let newF = f * (1 + h);
                let newBin = Math.round(newF / this.sampleRate * this.frameSize);
                avg[newBin] = 0;
                avg[newBin + 1] = 0;
                avg[newBin - 1] = 0;
            }

            // Probably 3 bars of solid pitch, consider all else noise
            let vals = [avg[avgPitchBin - 1], avg[avgPitchBin], avg[avgPitchBin + 1]];
            avg[avgPitchBin - 1] = 0; avg[avgPitchBin] = 0; avg[avgPitchBin + 1] = 0;
            let sum = 0;
            for (let i = 2; i < avg.length; i++)
            {
                sum += Math.cbrt(avg[i] * avg[i - 1] * avg[i - 1]);
            }
            avg[avgPitchBin - 1] = vals[0]; avg[avgPitchBin] = vals[1]; avg[avgPitchBin + 1] = vals[2];

            confidence = 1 - Math.cbrt(sum / 10);
            confidence = Math.min(1, Math.max(0, confidence));
        }

        let minMagPeak = 0.5;
        function findClosestPeak(spectrum, bin)
        {
            for (let i = 0; i < spectrum.length; i++)
            {
                if (isPeak(spectrum, bin - i, minMagPeak, true))
                {
                    return bin - i;
                }
                else if (isPeak(spectrum, bin + i, minMagPeak, true))
                {
                    return bin + i;
                }
            }

            return bin;
        }

        // todo pitch is solid but inaccurate because of smoothing

        // Find pitch bin in averagges
        let interpolatedAvgPitchBin = parabolicInterpolationX(avg, avgPitchBin);

        let findFromMagnitudes = false;

        if (findFromMagnitudes)
        {
            // Zero out spectrum
            let copy = magnitudes.map(v=>v);
            for (let i = 0; i < copy.length; i++)
            {
                if (i < avgPitchBin - 2 || i > avgPitchBin + 2)
                {
                    copy[i] = 0;
                }
            }

            let realPitchBin = parabolicInterpolationX(copy, avgPitchBin);

            let interpolatedPitchBin = parabolicInterpolationX(magnitudes, realPitchBin);
            pitch = interpolatedPitchBin / (this.frameSize) * this.sampleRate;
        }
        else
        {
            // Do conversion to pitch

            // recall:
            // avg[i] = Math.sqrt( magnitudes[i] ** 2 + magnitudes[i - 1] ** 2 );
            // so
            // magnitudes[i] = Math.sqrt( avg[i] ** 2 - magnitudes[i - 1] ** 2 );

            let interpolatedAvgPitchBin = parabolicInterpolationX(avg, avgPitchBin);
            pitch = interpolatedAvgPitchBin / this.frameSize * this.sampleRate;
        }

        console.log(confidence)
        // this.port.postMessage({magnitudes: avg, pitch: pitch, type: type, confidence: confidence});
        normalize(avg);

        this.postProcess({
            spectrum: avg,
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
        });
    }


    processEXP()
    {
        // We have some good algorithms

        this.processACF3();

        return;

        // First do time domain O(n) analysis to determine which route to take

        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            this.audioBuffer[i] = this.internalBuffer[j];
        }

        normalize(this.audioBuffer);

        // Perform naive zero crossing
        let zeroCrossing = [];

        let start = 0, end = this.audioBuffer.length - 1;
        let positive = this.audioBuffer[0] >= 0;
        for (; start < this.audioBuffer.length; start++)
        {
            let v = this.audioBuffer[start];
            if (positive && v < 0)
                break;
            else if (!positive && v >= 0)
                break;
        }
        positive = this.audioBuffer[this.audioBuffer.length - 1] > 0;
        for (; end > -1; end--)
        {
            let v = this.audioBuffer[end];
            if (positive && v < 0)
                break;
            else if (!positive && v >= 0)
                break;
        }

        positive = this.audioBuffer[start] >= 0;
        for (let i = start; i <= end; i++)
        {
            let val = this.audioBuffer[i];
            if ((positive && val < 0) || (!positive && val >= 0))
            {
                positive = !positive;
                zeroCrossing.push(i);
            }
        }

        let diffs = []
        for (let i = 1; i < zeroCrossing.length; i++)
        {
            diffs.push(zeroCrossing[i] - zeroCrossing[i-1])
        }

        // Find harmonics
        let harmonics = [];
        let maxDiff = 30;
        for (let i = 0; i < diffs.length; i++)
        {
            let unique = true;
            for (let h = 0; h < harmonics.length; h++)
            {
                let existingHarmonic = harmonics[h];
                let thisHarmonic = diffs[i];

                if (Math.abs(thisHarmonic - existingHarmonic[0]) <= maxDiff)
                {
                    unique = false;
                    let n = existingHarmonic[1];
                    harmonics[h][0] = (existingHarmonic[0] * n + thisHarmonic) / (n + 1);
                    harmonics[h][1]++;
                }
            }

            if (unique == true)
            {
                harmonics.push([diffs[i], 1]);
            }
        }

        // for (let h = 0; h < harmonics.length; h++)
        // {

        // }
        let flatHarmonics = harmonics.map(v=>v[0]);
        let maxBin = Math.max(...flatHarmonics);
        let f = this.sampleRate / maxBin;

        const minFFTAnalysis = 600; // Hz
        if (f > minFFTAnalysis)
        {
            // this.processWhistle();
            this.processACF3();
            // this.processEXPWorking();
            // console.log(" > " + minFFTAnalysis);
        }
        else
        {
            // this.analyzeDFT();
            this.processACF3();
            // console.log(" < " + minFFTAnalysis);
        }

    }

    processACF3()
    {
        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            this.audioBuffer[i] = this.internalBuffer[j];
        }

        // normalize(this.audioBuffer);
        this.ACFbuffer = new Float32Array(this.frameSize);

        for (let i = 0; i < this.frameSize; i++)
        {
            for (let j = 0; j < this.frameSize - i; j++)
            {
                this.ACFbuffer[j] += this.audioBuffer[i] * this.audioBuffer[i + j];
            }
        }

        

        // Clear negatives
        for (let i = 0; i < this.frameSize; i++)
        {
            this.ACFbuffer[i] = this.ACFbuffer[i] > 0 ? this.ACFbuffer[i] : 0;
        }

        // Get rid of first band
        for (let i = 1; i < this.frameSize; i++)
        {
            if (this.ACFbuffer[i] < this.ACFbuffer[i-1])
            {
                this.ACFbuffer[i-1] = 0.0;
            }
            else
            {
                break;
            }
        }

        let maxNum = Math.max(...this.ACFbuffer);

        normalize(this.ACFbuffer);

        let peaks = getPeaks(this.ACFbuffer, this.frameSize, 0.99, true);
        let probablePeak = peaks[0];

        // Check for harmonic peak if low freq TODO
        
        let v = parabolicInterpolationX(this.ACFbuffer, probablePeak);

        // let v = getNthPeakBin(this.ACFbuffer, 1, 0.4);
      
        let pitch = this.sampleRate / v;

        let a = 100;
        let confidence = 2 * Math.atan(a * maxNum) / Math.PI;
        // console.log(confidence)

        this.postProcess({
            spectrum: this.ACFbuffer,
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
        });

    }

    processWhistle()
    {
        const baseFrequency = 600;
        const sampleInterval = 50; // Hz
        // const maxFrequency = 2500; // Hz
        const maxFrequency = 2500;
        const numFrequencies = Math.ceil((maxFrequency - baseFrequency) / sampleInterval);
        const sampleLength = this.frameSize;

        let results = [new Float32Array(numFrequencies), new Float32Array(numFrequencies)];
        for (let i = 0; i < numFrequencies; i++)
        {
            let f = baseFrequency + sampleInterval * i;
            // let resOffset = f / this.sampleRate * resolution;
            // let n = Math.floor(resolution / resOffset);
            let bin = f / this.sampleRate;
            let a = -2 * Math.PI * bin;
            
            for (let j = 0; j < sampleLength; j ++)
            {
                let v = Math.cos(a * j);
                let v2 = Math.sin(a * j);

                results[0][i] += v * this.audioBuffer[j];
                results[1][i] += v2 * this.audioBuffer[j];
            }
        }

        let mags = results[0].map((v,i)=>Math.sqrt(v ** 2 + results[1][i] ** 2))
        normalize(mags);

        // Average points
        function averageFunction2(spectrum)
        {
            let a = new Float32Array(spectrum.length);
            for (let i = 1; i < spectrum.length; i++)
            {
                a[i] = Math.sqrt( spectrum[i] ** 2 + spectrum[i - 1] ** 2);
            }
            return a;
        }
        function findClosestPeak2(spectrum, bin)
        {
            let minMagPeak = 0.3;
            for (let i = 0; i < spectrum.length; i++)
            {
                if (isPeak(spectrum, bin - i, minMagPeak, true))
                {
                    return bin - i;
                }
                else if (isPeak(spectrum, bin + i, minMagPeak, true))
                {
                    return bin + i;
                }
            }

            return bin;
        }
        
        let avg = averageFunction2(mags);
        normalize(avg)

        let avgMaxBin = getPeaks(avg, avg.length, 0.3, true)[0];
        let maxBin = findClosestPeak2(mags, avgMaxBin);

        let pitch = maxBin;
        pitch = baseFrequency + parabolicInterpolationX(mags, maxBin) * sampleInterval;

        let confidence = 0;
        let mean = avg.reduce((s,v)=>s+=v) / avg.length;
        let sd = Math.sqrt(avg.reduce((s,v)=>s+=(v-mean) ** 2) / avg.length);
        let sum = 0;
        let minVal = 0.2;
        for (let i = 2; i < avg.length - 2; i++)
        {
            let many = avg[i] > minVal && avg[i - 1] > minVal && avg[i + 1] > minVal
                && avg[i - 2] > minVal && avg[i + 2] > minVal;
            if (i != avgMaxBin && many)
            {
                sum ++;
            }
        }
        sum /= numFrequencies;
        confidence = 1 - Math.atan(sum * 5) / Math.PI * 2;

        this.postProcess({
            spectrum: avg,
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
        });
    }

    analyzeDFT()
    {
        
        const baseFrequency = 75;
        const sampleInterval = 15; // Hz
        // const maxFrequency = 2500; // Hz
        const maxFrequency = 900;
        const numFrequencies = Math.ceil((maxFrequency - baseFrequency) / sampleInterval);
        const sampleLength = this.frameSize;

        let results = [new Float32Array(numFrequencies), new Float32Array(numFrequencies)];
        for (let i = 0; i < numFrequencies; i++)
        {
            let f = baseFrequency + sampleInterval * i;
            // let resOffset = f / this.sampleRate * resolution;
            // let n = Math.floor(resolution / resOffset);
            let bin = f / this.sampleRate;
            let a = -2 * Math.PI * bin;
            
            for (let j = 0; j < sampleLength; j ++)
            {
                let v = Math.cos(a * j);
                let v2 = Math.sin(a * j);

                results[0][i] += v * this.audioBuffer[j];
                results[1][i] += v2 * this.audioBuffer[j];
            }
        }

        let mags = results[0].map((v,i)=>Math.sqrt(v ** 2 + results[1][i] ** 2))
        normalize(mags);

        // Now we have low spectrum. Lets see whats up with HPS
        const numHarmonics = 4;

        
        for (let h = 1; h <= numHarmonics; h++)
        {
            let copy = mags.slice(0);
            for (let i = 0; i < numFrequencies; i++)
            {
                let f = baseFrequency + i * sampleInterval;

                let j = f * (1 + h) / this.sampleRate;
                if (j < numFrequencies)
                {
                    let v = parabolicInterpolationY(copy, j);
                    mags[i] *= v;

                }
            }
            // mags[i] /= ((i + 1) / numFrequencies);
            // mags[i] = 0.5 * mags[i] + 0.5 * mags[i] * (i + 1) / 10
        }
        normalize(mags);

        

        // Average points
        function averageFunction2(spectrum)
        {
            let a = new Float32Array(spectrum.length);
            for (let i = 1; i < spectrum.length; i++)
            {
                a[i] = Math.sqrt( spectrum[i] ** 2 + spectrum[i - 1] ** 2);
            }
            return a;
        }
        function findClosestPeak2(spectrum, bin)
        {
            let minMagPeak = 0.3;
            for (let i = 0; i < spectrum.length; i++)
            {
                if (isPeak(spectrum, bin - i, minMagPeak, true))
                {
                    return bin - i;
                }
                else if (isPeak(spectrum, bin + i, minMagPeak, true))
                {
                    return bin + i;
                }
            }

            return bin;
        }
        
        let avg = averageFunction2(mags);
        normalize(avg)

        let avgMaxBin = getPeaks(avg, avg.length, 0.3, true)[0];
        let maxBin = findClosestPeak2(mags, avgMaxBin);

        let pitch = maxBin;
        pitch = baseFrequency + parabolicInterpolationX(mags, maxBin) * sampleInterval;

        let confidence = 0;
        let mean = avg.reduce((s,v)=>s+=v) / avg.length;
        let sd = Math.sqrt(avg.reduce((s,v)=>s+=(v-mean) ** 2) / avg.length);
        let sum = 0;
        let minVal = 0.2;
        for (let i = 2; i < avg.length - 2; i++)
        {
            let many = avg[i] > minVal && avg[i - 1] > minVal && avg[i + 1] > minVal
                && avg[i - 2] > minVal && avg[i + 2] > minVal;
            if (i != avgMaxBin && many)
            {
                sum ++;
            }
        }
        sum /= numFrequencies;
        confidence = 1 - Math.atan(sum * 5) / Math.PI * 2;

        this.postProcess({
            spectrum: avg,
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
        });

        // this.port.postMessage({magnitudes: avg, pitch: pitch, type: "", confidence: confidence});

    }

    processEXPWorking()
    {
        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            // this.ffthelper.fftBuffer[i] = this.internalBuffer[j];
            this.audioBuffer[i] = this.internalBuffer[j] * this.ffthelper.hannwindow(i, this.frameSize);
        }

        normalize(this.audioBuffer);
        let results = FFT.fft(this.audioBuffer, false);
        let magnitudes = results.magnitudes();


        normalize(magnitudes);

        let avg = new Float32Array(magnitudes.length);

        for (let i = 1; i < magnitudes.length - 1; i++)
        {
            avg[i] = magnitudes[i - 1] * magnitudes[i] * magnitudes[i + 1];
        }

        let oldAvg = [...avg]
        for (let i = 1; i < oldAvg.length - 1; i++)
        {
            avg[i] = oldAvg[i];
            if (avg[i] < 0.05)
            {
                avg[i] = 0
            }
            // avg[i] = Math.cbrt(oldAvg[i - 1] * oldAvg[i] * oldAvg[i + 1]);
        }



        let pitch = 0;
        let confidence = 0;

        let sum = avg.reduce((s,v)=>s+=v);
        let max = Math.max(...avg);
        let mean = sum / avg.length;
        let sd = Math.sqrt(avg.reduce((s,v)=>s+=(v - mean) ** 2) / avg.length);
        confidence = sum * (1 - max) * sd;

        // let peak = getClosestPeakBin(avg, 0);
        let peak = 0;
        let peaks = [];
        for (let i = 1; i < avg.length - 1; i++)
        {
            if (avg[i] >= avg[i - 1] && avg[i] >= avg[i + 1] && avg[i] > 0.05)
            {
                peaks.push(i)
            }
        };

        
        let maxDiff = 0;
        for (let i = 1; i < peaks.length; i++)
        {
            let d = peaks[i] - peaks[i-1]
            if (d > maxDiff)
            {
                maxDiff = d;
            }
        };

        peak = peaks[0];
        if (maxDiff > 20)
        {
            console.log(peak, peaks[peaks.length - 1])
            peak = peaks[peaks.length - 1];
        }



        let sum2 = 0;
        let numPeaks = 0;
        for (let i = 0; i < avg.length; i++)
        {
            if (peak - i < 0)
            {
                break;
            }
            else
            {
                let v = avg[peak - i];
                if (v < 0.05)
                {
                    break;
                }
                else
                {
                    sum2 += v * i;
                }
            }
        }
        for (let i = 0; i < avg.length; i++)
        {
            if (peak + i >= avg.length)
            {
                break;
            }
            else
            {
                let v = avg[peak + i];
                if (v < 0.05)
                {
                    break;
                }
                else
                {
                    sum2 += v * i;
                }
            }
        }
        for (let i = 0; i < avg.length; i++)
        {
            if (avg[i] >= 0.05)
            {
                numPeaks++;
            }
        }

        let boundedSum = Math.min(1, Math.max(0, 1 - sum2));
        if (numPeaks == 2)
            numPeaks = 1;
        let boundedPeaks = Math.max(0, 1 / numPeaks);
        confidence = 0.7 * boundedSum + 0.3 * boundedPeaks;
        // console.log(confidence);

        pitch = parabolicInterpolationX(avg, peak) * this.sampleRate / this.frameSize;

        this.postProcess({
            spectrum: avg,
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
        });
    }


    processEXPThisOneWorks()
    {
        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            // this.ffthelper.fftBuffer[i] = this.internalBuffer[j];
            this.audioBuffer[i] = this.internalBuffer[j] * this.ffthelper.hannwindow(i, this.frameSize);
        }

        normalize(this.audioBuffer);
        let results = FFT.fft(this.audioBuffer, false);
        let magnitudes = results.magnitudes();


        normalize(magnitudes);

        let avg = new Float32Array(magnitudes.length);

        for (let i = 1; i < magnitudes.length - 1; i++)
        {
            avg[i] = magnitudes[i - 1] * magnitudes[i] * magnitudes[i + 1];
        }

        let oldAvg = [...avg]
        for (let i = 1; i < oldAvg.length - 1; i++)
        {
            avg[i] = oldAvg[i];
            if (avg[i] < 0.05)
            {
                avg[i] = 0
            }
            // avg[i] = Math.cbrt(oldAvg[i - 1] * oldAvg[i] * oldAvg[i + 1]);
        }



        let pitch = 0;
        let confidence = 0;

        let sum = avg.reduce((s,v)=>s+=v);
        let max = Math.max(...avg);
        let mean = sum / avg.length;
        let sd = Math.sqrt(avg.reduce((s,v)=>s+=(v - mean) ** 2) / avg.length);
        confidence = sum * (1 - max) * sd;

        // let peak = getClosestPeakBin(avg, 0);
        let peak = 0;
        let peaks = [];
        for (let i = 1; i < avg.length - 1; i++)
        {
            if (avg[i] >= avg[i - 1] && avg[i] >= avg[i + 1] && avg[i] > 0.05)
            {
                peaks.push(i)
            }
        };

        
        let maxDiff = 0;
        for (let i = 1; i < peaks.length; i++)
        {
            let d = peaks[i] - peaks[i-1]
            if (d > maxDiff)
            {
                maxDiff = d;
            }
        };

        peak = peaks[0];
        if (maxDiff > 20)
        {
            console.log(peak, peaks[peaks.length - 1])
            peak = peaks[peaks.length - 1];
        }



        let sum2 = 0;
        let numPeaks = 0;
        for (let i = 0; i < avg.length; i++)
        {
            if (peak - i < 0)
            {
                break;
            }
            else
            {
                let v = avg[peak - i];
                if (v < 0.05)
                {
                    break;
                }
                else
                {
                    sum2 += v * i;
                }
            }
        }
        for (let i = 0; i < avg.length; i++)
        {
            if (peak + i >= avg.length)
            {
                break;
            }
            else
            {
                let v = avg[peak + i];
                if (v < 0.05)
                {
                    break;
                }
                else
                {
                    sum2 += v * i;
                }
            }
        }
        for (let i = 0; i < avg.length; i++)
        {
            if (avg[i] >= 0.05)
            {
                numPeaks++;
            }
        }

        let boundedSum = Math.min(1, Math.max(0, 1 - sum2));
        if (numPeaks == 2)
            numPeaks = 1;
        let boundedPeaks = Math.max(0, 1 / numPeaks);
        confidence = 0.7 * boundedSum + 0.3 * boundedPeaks;
        // console.log(confidence);

        pitch = parabolicInterpolationX(avg, peak) * this.sampleRate / this.frameSize;

        this.postProcess({
            spectrum: avg,
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
        });
    }

    kinaOKEXP()
    {
        for (let i = 0; i < this.frameSize; i++)
        {
            let j = (this.internalBufferSize + this.internalBufferOffset + i - this.frameSize) % this.internalBufferSize;

            // this.ffthelper.fftBuffer[i] = this.internalBuffer[j];
            this.audioBuffer[i] = this.internalBuffer[j];
        }

        var sumOfSquares = 0;
        for (var i = 0; i < this.frameSize; i++) {
            var val = this.audioBuffer[i];
            sumOfSquares += val * val;
        }
        var rootMeanSquare = Math.sqrt(sumOfSquares / this.frameSize);

        normalize(this.audioBuffer);
        // Perform FFT
        let results = FFT.fft(this.audioBuffer, false);
        let magnitudes = results.magnitudes();
        normalize(magnitudes);

        // Average points
        function averageFunction(spectrum)
        {
            let a = new Float32Array(spectrum.length);
            for (let i = 1; i < spectrum.length; i++)
            {
                a[i] = Math.sqrt( spectrum[i] ** 2 + spectrum[i - 1] ** 2);
            }
            return a;
        }

        let avg = averageFunction(magnitudes);

        // Center clip
        let centerClipVal = 0.5;
        function centerClipFunction(spectrum, val)
        {
            for (let i = 0; i < spectrum.length; i++)
            {
                if (spectrum[i] < val)
                {
                    spectrum[i] = 0;
                }
            }
        }

        centerClipFunction(avg, centerClipVal);

        let pitch = 0, confidence = 0, type = "lol";

        let peaks = getPeaks(avg, avg.length, centerClipVal, true);
        if (peaks == [])
        {
            peaks = [0]
        }

        function standardDeviation(list)
        {
            if (list.length == 0)
                list = [0];
            let avg = list.reduce((s,v)=>s+=v) / list.length;
            return Math.sqrt(list.reduce((s,v)=>s += (v-avg) ** 2)) / list.length;
        }
        let s = standardDeviation(peaks);


        function confidenceFunction(spectrum, bin, weight)
        {
            weight ||= 1.0;
            // Probably 3 bars of solid pitch, consider all else noise
            let vals = [spectrum[bin - 1], spectrum[bin], spectrum[bin + 1]];
            spectrum[bin - 1] = 0; spectrum[bin] = 0; spectrum[bin + 1] = 0;
            let sum = 0;
            for (let i = 2; i < spectrum.length; i++)
            {
                sum += Math.cbrt(spectrum[i] + spectrum[i - 1] + spectrum[i - 2]) * weight;
            }
            spectrum[bin - 1] = vals[0]; spectrum[bin] = vals[1]; spectrum[bin + 1] = vals[2];

            let c = 1 - Math.cbrt(sum / 10);
            // c = Math.min(1, Math.max(0, c));

            return c;
        }

        let minMagPeak = 0.5;
        function findClosestPeak(spectrum, bin)
        {
            for (let i = 0; i < spectrum.length; i++)
            {
                if (isPeak(spectrum, bin - i, minMagPeak, true))
                {
                    return bin - i;
                }
                else if (isPeak(spectrum, bin + i, minMagPeak, true))
                {
                    return bin + i;
                }
            }

            return bin;
        }

        let whistleNoiseDev = 5;
        let avgPitchBin = 0;
        if (s > whistleNoiseDev)
        {
            // Handle a whistle with low/mid noise (i.e. get pitch from right)
            avgPitchBin = peaks[peaks.length - 1];

            confidence = confidenceFunction(avg, avgPitchBin, 0.005);
        }
        else
        {
            avgPitchBin = peaks[0];


            let numHarmonics = 2;

            // Remove harmonics
            // todo this is wrong because of avg
            // let interpolatedAvgPitchBin = parabolicInterpolationX(avg, avgPitchBin);
            // let estimatedPitchBin = findClosestPeak(magnitudes, Math.round(avgPitchBin));
            // let f = estimatedPitchBin / this.processSize * this.sampleRate;

            // for (let h = 1; h <= numHarmonics; h++)
            // {
            //     let newF = f * (1 + h);
            //     let newBin = Math.round(newF / this.sampleRate * this.processSize);
            //     magnitudes[newBin] = 0;
            //     magnitudes[newBin + 1] = 0;
            //     magnitudes[newBin - 1] = 0;
            // }

            // let f = avgPitchBin / this.processSize * this.sampleRate;

            // for (let h = 1; h <= numHarmonics; h++)
            // {
            //     let newF = f * (1 + h);
            //     // let newBin = Math.floor(newF / this.sampleRate * this.processSize);
            //     let newBin = avgPitchBin * (1 + h) - 1;
            //     // avg[newBin] = 0;
            //     // avg[newBin + 1] = 0;
            // }

            normalize(avg);

            // // Recalculate avergae
            avg = averageFunction(magnitudes);
            centerClipFunction(avg, centerClipVal / 1.5);

            let p = getPeaks(avg, avg.length, 0.1, true);

            // harmonic diff of about first bin?
            function findClosestPeak(spectrum, bin, leftOnly)
            {
                leftOnly ||= false;
                for (let i = 0; i < spectrum.length; i++)
                {
                    if (isPeak(spectrum, bin - i, minMagPeak, false))
                    {
                        return bin - i;
                    }
                    else if (!leftOnly && isPeak(spectrum, bin + i, minMagPeak, true))
                    {
                        return bin + i;
                    }
                }

                return bin;
            }

            let p2 = []
            for (let h = 1; h <= numHarmonics; h++)
            {
                let b = avgPitchBin * (1 + h);
                b = findClosestPeak(avg, b, false);

                if (!p2.includes(b) && b != avgPitchBin)
                    p2.push(b)
            }
            // console.log(p)
            // console.log(p2)

            for (let i = 0; i < p2.length; i++)
            {
                // console.log(avgPitchBin, p2[0])
                avg[p2[i]] = 0;
                avg[p2[i+1]] = 0;
            }

            avgPitchBin = getPeaks(avg, avg.length, centerClipVal, true)[0];
            confidence = confidenceFunction(avg, avgPitchBin) * 3;
            // confidence = Math.min(1, Math.max(0, ));

            // console.log(confidence)
        }

        let rmsConfidence = 20 * rootMeanSquare;
        // rmsConfidence = Math.min(1, Math.max(0, Math.sqrt(rmsConfidence)));
        let totalConfidence = 0.3 * confidence + 0.7 * rmsConfidence;
        // console.log(totalConfidence, rmsConfidence, confidence);


        confidence = Math.min(1, Math.max(0, rmsConfidence * (confidence + 1) / 2));
        // console.log(confidence);
        // todo pitch is solid but inaccurate because of smoothing

        // Find pitch bin in averagges
        let interpolatedAvgPitchBin = parabolicInterpolationX(avg, avgPitchBin);

        let findFromMagnitudes = false;

        if (findFromMagnitudes)
        {
            // Zero out spectrum
            let copy = magnitudes.map(v=>v);
            for (let i = 0; i < copy.length; i++)
            {
                if (i < avgPitchBin - 2 || i > avgPitchBin + 2)
                {
                    copy[i] = 0;
                }
            }

            let realPitchBin = parabolicInterpolationX(copy, avgPitchBin);

            let interpolatedPitchBin = parabolicInterpolationX(magnitudes, realPitchBin);
            pitch = interpolatedPitchBin / (this.frameSize) * this.sampleRate;
        }
        else
        {
            // Do conversion to pitch

            // recall:
            // avg[i] = Math.sqrt( magnitudes[i] ** 2 + magnitudes[i - 1] ** 2 );
            // so
            // magnitudes[i] = Math.sqrt( avg[i] ** 2 - magnitudes[i - 1] ** 2 );

            let interpolatedAvgPitchBin = parabolicInterpolationX(avg, avgPitchBin);
            pitch = interpolatedAvgPitchBin / this.frameSize * this.sampleRate;
        }

        normalize(avg);

        // console.log(confidence)

        // this.port.postMessage({magnitudes: avg, pitch: pitch, type: type, confidence: confidence});
        this.postProcess({
            spectrum: magnitudes,
            pitchInfo: {pitch: Math.round(pitch), confidence:confidence}
        });
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
        // console.log(this.HPSmagnitudeBuffer[0])

        // Normalize first half
        let max = Math.max(...this.HPScorrelationBuffer);
        for (let w = 0; w < HPSsize; w++)
        {
            this.HPScorrelationBuffer[w] /= max;
            this.HPScorrelationBuffer[w + HPSsize] = 0;
        }

        // Get a polynomic interpolated value of peak bin
        // let peakbin = getMaxParabolicApproximatePeakBin(this.HPScorrelationBuffer);
        // let peakbin = getClosestPeakBin(this.HPScorrelationBuffer, HPSsize - 1);

        // We wil lfilter out low harmics with a gate
        const filterGate = 0.3;
        for (let w = 0; w < HPSsize; w++)
        {
            if (this.HPScorrelationBuffer[w] < filterGate)
            {
                this.HPScorrelationBuffer[w] = 0;
            }
        }

        // Then we will check if harmonics below are bigger and if so rule self out
        for (let w = 0; w < HPSsize; w++)
        {
            let j = HPSsize - 1 - w;
            let below = j / 2;
            if (below > 0 && this.HPScorrelationBuffer[below] > this.HPScorrelationBuffer[j])
            {
                this.HPScorrelationBuffer[j] = 0;
            }
        }

        let peakbin = getParabolicBinApproximation(this.HPScorrelationBuffer, getClosestPeakBin(this.HPScorrelationBuffer, HPSsize - 2));
        // let peakbin = getMaxParabolicApproximatePeakBin(this.HPScorrelationBuffer);
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

            this.ACFbuffer[i] = this.internalBuffer[j]// * this.ffthelper.hannwindow(i, this.frameSize);
            this.ACFpeaksBuffer[i] = 0;
        }

        function calculateAutocorrelation() {
            console.log(this)

          }

        function findPitchBin() {

        }

        const n = this.ACFbuffer.length;

        for (let lag = 0; lag < n; lag++) {
            for (let i = 0; i < n - lag; i++) {
            this.ACFpeaksBuffer[lag] += this.ACFbuffer[i] * this.ACFbuffer[i + lag];
            }
        }

        const s = 25;
        let peakIndex = s;
        let peakValue = this.ACFpeaksBuffer[s];

        // Find the highest peak in the autocorrelation array
        for (let i = s + 1; i < n; i++) {
            if (this.ACFpeaksBuffer[i] > peakValue) {
            peakValue = this.ACFpeaksBuffer[i];
            peakIndex = i;
            }
        }



        let pitch = this.sampleRate / getParabolicBinApproximation(this.ACFpeaksBuffer, peakIndex);
        // Easy function:
        /*for (let lag = 0; lag < this.frameSize; lag++)
        {
            for (let i = 0; i < this.frameSize; i++)
            {
                // MOD?
                let n = (this.frameSize + i - lag);
                if (n < this.frameSize && n >= 0)
                {
                    this.ACFpeaksBuffer[this.frameSize - 1 - lag] += this.ACFbuffer[i] * this.ACFbuffer[n];
                }
            }
        }

        // Remove noise
        for (let i = 0; i < this.frameSize; i++)
        {
            if (this.ACFpeaksBuffer[i] < this.ACFthreshold)
            {
                // this.ACFpeaksBuffer[i] = 0;
            }
        }*/

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

        /*// Now calculate avg distance between peaks

        // Pitch is the sample rate divided by the period (in bins)
        let firstpeakbin = getNthParabolicApproximatePeakBin(this.ACFpeaksBuffer, 1);
        let pitch = this.sampleRate / (firstpeakbin + 1) ;
        */
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
            spectrum: this.ACFpeaksBuffer,
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



        let smoothedPitch = Math.round(report.pitchInfo.pitch);
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