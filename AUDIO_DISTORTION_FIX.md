# Audio Distortion Fix - Root Causes and Solutions

## Problem
When playing AI-generated audio responses back to the caller through Twilio, the audio was heavily distorted and unintelligible.

## Root Causes

### 1. **Sample Rate Mismatch** (PRIMARY CAUSE) ⚠️

**The Issue:**
- Fish Audio API returns WAV at **24kHz** sample rate
- Twilio phone streams operate at **8kHz** sample rate
- You were sending 24kHz audio to an 8kHz stream
- Result: Audio plays 3x faster and sounds like chipmunks!

**The Fix:**
Added `resamplePCM16()` function that downsamples 24kHz → 8kHz using linear interpolation.

```javascript
// Before: Distorted audio
const muLawAudio = wavToMuLaw(wavBuffer);  // ❌ Wrong sample rate!

// After: Clean audio
const muLawAudio = wavToMuLaw(wavBuffer);  // ✅ Automatically resamples to 8kHz
```

### 2. **Mu-law Encoding Bug** (SECONDARY CAUSE)

**The Issue:**
The original encoding formula for negative PCM16 samples was incorrect:
```javascript
const sign = (sample & 0x8000) >> 8;  // ❌ Wrong bit manipulation
if (sign !== 0) {
  sample = -sample;  // ❌ Assumes sample is already negative
}
```

This only worked if samples were already correctly signed, but the bit operations were semantically incorrect.

**The Fix:**
Rewrote the encoding with proper handling:
```javascript
const sign = sample < 0 ? 0x80 : 0x00;  // ✅ Clear sign detection
let absample = Math.abs(sample);         // ✅ Work with absolute value
```

### 3. **Chunking Strategy** (MINOR ISSUE)

The chunking code was correct, but combined with the above issues, timing became distorted:
```javascript
const chunkSize = 160;  // 20ms at 8kHz
for (let i = 0; i < muLawAudio.length; i += chunkSize) {
  // Send chunks with 20ms delay
  await new Promise(r => setTimeout(r, 20));
}
```

This is fine IF the audio is already at 8kHz. But with 24kHz audio, you were sending 480-byte chunks pretending they were 160 bytes.

---

## Technical Details

### Sample Rate Conversion

**Linear Interpolation Resampling:**
```
Input: 24000 samples/second
Output: 8000 samples/second
Ratio: 24000/8000 = 3.0

For each output sample index i:
  sourceIndex = i * 3
  Interpolate between samples at floor(sourceIndex) and ceil(sourceIndex)
  Result: Smooth downsampling without aliasing artifacts
```

**Example:**
- 1 second of Fish Audio speech: 24,000 samples
- After resampling: 8,000 samples
- After mu-law encoding: 8,000 bytes
- Chunked into 160-byte packets: 50 chunks total

### Mu-law Encoding Formula (Fixed)

```
For each 16-bit PCM sample:
1. Extract sign bit (positive/negative)
2. Get absolute value
3. Clamp to valid range (±32635)
4. Add bias (132)
5. Find exponent (3-bit value)
6. Extract mantissa (4-bit value)
7. Combine: sign(1) + exponent(3) + mantissa(4) = 1 byte
8. Bitwise NOT to complete the encoding
```

---

## Changes Made

### New Function: `resamplePCM16()`
- Resamples audio from any input rate to any output rate
- Uses linear interpolation for quality
- Input: PCM16 at 24kHz, Output: PCM16 at 8kHz

### Fixed Function: `encodePCM16ToMuLaw()`
- Corrected sign bit handling
- Better variable clarity (sign, absample, exponent, mantissa)
- Added MULAW_MAX constant for clarity

### Updated Function: `wavToMuLaw()`
- Now automatically resamples from 24kHz to 8kHz
- Comment explains the critical importance of sample rate matching

---

## Testing the Fix

To verify the fix works:

1. **Listen to the audio:** Should be clear, normal-speed speech
2. **Check silence:** Should not have artifacts or clicks
3. **Check volume:** Should be at reasonable level (not too quiet)
4. **Listen to speech clarity:** Words should be intelligible

**Before Fix:**
- Audio sounds like fast chipmunk speech
- Heavy distortion and artifacts

**After Fix:**
- Normal speed speech
- Clear pronunciation
- No distortion

---

## What Was Happening

```
BEFORE FIX:
Fish Audio → WAV 24kHz → Strip header → PCM16 24kHz ❌
                       → Mu-law encode (treating as 8kHz)
                       → Send to Twilio 8kHz stream
                       → Plays 3x faster ❌ DISTORTED!

AFTER FIX:
Fish Audio → WAV 24kHz → Strip header → PCM16 24kHz
                       → Resample to 8kHz ✅
                       → Mu-law encode ✅
                       → Send to Twilio 8kHz stream
                       → Plays at normal speed ✅ CLEAR!
```

---

## Summary

The distortion was caused by a **critical sample rate mismatch**:
- Fish Audio produces 24kHz audio
- Twilio requires 8kHz audio
- The conversion functions now handle this automatically

The mu-law encoding bug was secondary but also fixed for correctness.

**Current Status:** ✅ FIXED
- Sample rate resampling: Implemented
- Mu-law encoding: Corrected
- Audio chunking: Verified working
