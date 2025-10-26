# Audio Quality Issues - Debugging Guide

## The Problem

Audio is poor quality despite proper mu-law encoding and resampling. Looking at your logs:

```
Received WAV buffer, size: 327724 bytes
WAV Info: 44100Hz, 1 channels, 16 bits/sample
Resampling from 44100Hz to 8000Hz
Encoding test - first byte: 95 decodes to PCM16: -264
```

## Potential Root Causes

### 1. **Overly Aggressive Downsampling** ⚠️ LIKELY
- Fish Audio outputs 44.1kHz
- We're downsampling **5.5x** to 8kHz
- Linear interpolation might not be sufficient for this aggressive rate change
- **Solution**: Use better resampling algorithm (sinc interpolation)

### 2. **Silent or Near-Silent Audio**
- The decoded test value `-264` is very small
- If source audio is quiet, aggressive downsampling makes it quieter
- **Solution**: Check if source WAV is actually loud enough

### 3. **Fish Audio Quality Settings**
- Fish Audio might have quality/bitrate settings we're not using
- Default settings might be optimized for playback, not telephony
- **Solution**: Check Fish Audio API parameters

### 4. **Mu-law Encoding Precision Loss**
- Mu-law compresses 16-bit to 8-bit (2:1 compression)
- This inherently loses precision
- With quiet audio (-264 PCM16), we lose even more precision
- **Solution**: Amplify audio before mu-law encoding

## Immediate Test

Replace the current `resamplePCM16` with a **higher-quality resampling** that handles 44.1kHz→8kHz better:

Instead of simple linear interpolation, we should use **downsampling with anti-aliasing** or at minimum **sinc-based interpolation**.

## The Real Issue: Resampling Quality

44.1kHz → 8kHz is a **very aggressive downsampling ratio** (5.5x).

**Current method (linear interpolation):**
```
For every output sample, we interpolate between 2 input samples
This loses a LOT of information
Audio becomes dull/muted
```

**Better method (sinc interpolation / FIR filter):**
```
Consider multiple input samples
Apply proper anti-aliasing filter
Preserves more audio information
Much better quality
```

## Quick Fix: Test Different Approach

Try requesting **8kHz directly** from Fish Audio if possible:

```javascript
// In textToAudio.js, modify the POST data:
const postData = JSON.stringify({
  text: text,
  format: 'wav',
  sampleRate: 8000  // ADD THIS IF FISH AUDIO SUPPORTS IT
});
```

If Fish Audio supports this, we can skip resampling entirely and get much better quality.

## Alternative Fix: Better Resampling

Implement **higher-quality downsampling**:

```javascript
function resamplePCM16Better(pcm16Data, inputSampleRate, outputSampleRate) {
  // For 44.1kHz → 8kHz, we need proper anti-aliasing filter
  // This is complex, so consider using a library or simpler approach:

  // Option 1: Use a simple decimation filter
  // Option 2: Use librosa-like resampling
  // Option 3: Request lower sample rate from source (BEST)
}
```

## Audio Amplitude Issue

The test shows `-264` which is only **0.8% of PCM16 full scale** (32,768):

- Normal speech is usually -10,000 to +10,000 (30% of full scale)
- `-264` is **extremely quiet**
- After mu-law encoding (which has logarithmic scaling), this might be audible
- But after aggressive downsampling, it becomes even quieter

**This suggests either:**
1. Source audio from Fish is too quiet
2. Resampling is eating the volume
3. There's a bug in the pipeline

## Next Steps

1. **Test with Fish Audio 8kHz output** (if supported)
2. **Add audio amplification** before mu-law encoding
3. **Use better resampling algorithm**
4. **Verify source WAV has actual audio** (not silence)

## Code to Add Audio Amplification

```javascript
function amplifyAudio(pcm16Data, gainFactor = 4) {
  let pcmArray = pcm16Data;
  if (Buffer.isBuffer(pcm16Data)) {
    pcmArray = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);
  }

  const output = new Int16Array(pcmArray.length);
  for (let i = 0; i < pcmArray.length; i++) {
    // Amplify and clamp to prevent overflow
    output[i] = Math.max(-32768, Math.min(32767, pcmArray[i] * gainFactor));
  }

  return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
}
```

Then use it in the pipeline:
```javascript
const resampled = resamplePCM16(pcm16Data, 44100, 8000);
const amplified = amplifyAudio(resampled, 4);  // 4x amplification
return encodePCM16ToMuLaw(amplified);
```

## Summary

The poor audio quality is almost certainly due to:
1. **Aggressive 44.1kHz → 8kHz downsampling** with simple linear interpolation
2. **Source audio being very quiet** (-264 PCM16 is tiny)
3. **Combined effect**: downsampling a quiet source = inaudible output

**Best solution**: Request 8kHz directly from Fish Audio if possible, or use better resampling with audio amplification.
