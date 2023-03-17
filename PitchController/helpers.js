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