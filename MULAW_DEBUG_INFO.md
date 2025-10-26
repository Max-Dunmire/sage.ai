# Mu-law Encoding Debug Information

## Standard Mu-law (G.711 μ-law) Algorithm

The correct algorithm for encoding PCM16 to mu-law is:

```
For each 16-bit PCM sample:

1. Get the sign bit
   sign = (sample >> 15) & 1

2. Get absolute value
   sample = abs(sample)

3. Bias (add offset)
   sample = sample + 132

4. Find the segment (exponent)
   Segment 0: 0 to 95
   Segment 1: 96 to 223
   Segment 2: 224 to 479
   ...
   Segment 7: 3840 to 4095 (or higher values get clamped)

5. Combine: [sign(1 bit)][segment(3 bits)][mantissa(4 bits)]

6. Bitwise NOT to complete the encoding
```

## Potential Issues in Current Implementation

### Issue 1: Floating Point in Audio Data
The resamplePCM16 function uses `Math.round()` which is correct, but we should ensure values stay within int16 bounds.

### Issue 2: Sample Order
Make sure the audio samples are in the correct byte order (little-endian for both PCM16 reading and mu-law writing).

### Issue 3: Audio Format
Fish Audio might be returning mono or stereo. We assume mono (1 channel), but if it's stereo, we'd need to handle that.

### Issue 4: Complete Silence Check
If the audio buffer is all zeros, the encoding will work but won't be audible. This would indicate the WAV parsing is wrong.

## Testing Strategy

1. **Log the WAV header info** ✅ DONE - parseWavHeader() now logs sample rate
2. **Check encoding is reversible** - Encode then decode should be close to original
3. **Verify PCM16 byte order** - Check if reading as little-endian matches the format
4. **Test with known audio** - Generate a simple tone, encode, decode, verify

## Known Working Mu-law Reference Implementation

Here's a reference mu-law encoder that's known to work:

```javascript
function encodemulaw(pcm16) {
  const MULAW_MAX = 32635;
  const MULAW_MIN = -32768;

  let sample = pcm16;

  // Get sign
  const sign = (sample >> 8) & 0x80;
  if (sign !== 0) {
    sample = -sample;
  }

  // Compress using mu-law formula
  sample = sample + 132; // bias
  if (sample > MULAW_MAX) {
    sample = MULAW_MAX;
  }

  // Compute exponent
  let exponent = 7;
  for (let expMask = 0x4000; expMask > 0; expMask >>= 1) {
    if (sample < (0x1 << (13 + exponent))) {
      break;
    }
    exponent--;
  }

  // Extract mantissa
  const mantissa = (sample >> (exponent + 3)) & 0x0f;

  // Combine and invert
  return ~(sign | (exponent << 4) | mantissa);
}
```

The key difference might be in how the sign bit is extracted and used.

## Things to Check

When you make a call and get distorted audio, look for these log outputs:
1. "WAV Info: XXXHz, X channels, X bits/sample"
2. "Resampling from XXXHz to 8000Hz" (or no resampling if already 8kHz)
3. Check if audio is getting truncated or extended incorrectly

## Possible Root Causes

1. **WAV not parsed correctly** - We might be reading wrong sample rate from header
2. **Mu-law encoding is off** - Algorithm might have edge case bug
3. **Resampling is wrong** - Linear interpolation might not be precise enough
4. **WebSocket send is wrong** - Maybe base64 encoding or chunking is corrupt
5. **Twilio stream closed** - Audio might be sent after stream ends (though error would show)

## Next Steps

Run a test call and:
1. Check the console logs for WAV info
2. Verify sample rate is being detected correctly
3. If resampling is happening, it's not 8kHz from Fish
4. If no resampling, Fish is already 8kHz (good!)
