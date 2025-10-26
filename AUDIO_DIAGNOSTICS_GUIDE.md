# Audio Diagnostics Guide

When you run a test call, you'll see comprehensive audio statistics. Here's what each metric means and what to look for:

## 1. AUDIO STATS BEFORE RESAMPLING (44.1kHz)

```
=== AUDIO STATS BEFORE RESAMPLING (44.1kHz) ===
  Samples: 163656, Peak: 12345, Min: -11234, RMS: 2500, Mean: 45
  First 8 samples: [123, 456, 789, -234, ...]
```

### What to Look For:

**Peak value:**
- Normal: ±5,000 to ±20,000 (15-60% of 32,767 max)
- Too quiet: < ±2,000 (needs stronger source)
- Too loud: > ±30,000 (clipping in source)

**RMS (loudness):**
- Normal speech: 2,000-5,000
- Too quiet: < 1,000
- Good level: 3,000-4,000

**First 8 samples:**
- Should show variation (not all zeros)
- Values should change gradually (no spikes)

---

## 2. AUDIO STATS AFTER RESAMPLING (8kHz)

```
=== AUDIO STATS AFTER RESAMPLING (8kHz) ===
  Samples: 29721, Peak: 11234, Min: -10567, RMS: 2300, Mean: 40
  Volume loss from resampling: 8.0%
  First 8 samples: [120, 450, 780, -230, ...]
```

### What to Look For:

**Volume loss:**
- Normal: 5-15% loss is acceptable
- Too much: > 25% loss means resampling algorithm is too aggressive
- Excellent: < 5% loss (excellent resampling)

**Peak and RMS comparison:**
- Should be close to before-resampling values
- If RMS dropped by >20%, resampling is eating quality

**Sample values:**
- Should be similar to before-resampling (within 5-10%)
- If drastically different, anti-aliasing filter might be over-filtering

---

## 3. AUDIO STATS AFTER AMPLIFICATION (4x)

```
=== AUDIO STATS AFTER AMPLIFICATION (4x) ===
  Peak: 45380, Min: -42268, RMS: 9200, Clipping: YES - DATA LOSS!
  First 8 samples: [480, 1800, 3120, -920, ...]
```

### What to Look For:

**Clipping: YES**
- ⚠️ PROBLEM: Amplification is too aggressive
- Audio is distorting at peaks
- Solution: Reduce gain from 4.0 to something like 2.0 or 2.5

**Clipping: No**
- ✅ GOOD: Amplification is safe
- Audio has headroom

**Peak value targets:**
- Ideal: ±15,000 to ±28,000 (45-85% of max)
- RMS: 6,000-10,000 for good telephony
- If RMS < 4,000: Still too quiet, might need more gain

---

## 4. MU-LAW ENCODING TEST

```
=== MU-LAW ENCODING TEST ===
  Middle sample - Original: 9200, Encoded then Decoded: 8950, Error: 2.7%
```

### What to Look For:

**Encoding error:**
- Normal: 1-5% error (mu-law inherently loses precision)
- Good: < 3% error
- Bad: > 10% error (encoding algorithm issue)

The error is EXPECTED because mu-law is 8-bit compression of 16-bit data (2:1 compression).

---

## 5. MU-LAW OUTPUT ANALYSIS

```
=== MU-LAW OUTPUT ANALYSIS ===
  Byte range: 34 to 227, Extreme values: 234
  First 16 mu-law bytes: [95, 102, 110, 98, ...]
```

### What to Look For:

**Byte range:**
- Poor: 50-200 (not using full range, audio too quiet)
- Good: 20-240 (using most of mu-law range)
- Excellent: 5-250+ (using full dynamic range)

**Extreme values (0 or 255):**
- Few (< 100): ✅ GOOD
- Many (> 1,000): ⚠️ Clipping or too much amplification
- Very many (> 10,000): 🔴 SERIOUS PROBLEM

**Byte values spread:**
- Should span most of 0-255 range
- If clustered around 100-150: Audio too quiet, needs amplification
- If clustered at 0 or 255: Audio too loud, causes clipping

---

## Diagnostic Flowchart

```
Is audio still choppy/distorted?
│
├─ "Clipping: YES" in AMPLIFICATION step?
│  └─ Reduce gain from 4.0 to 2.0
│
├─ "Volume loss" > 20% in RESAMPLING?
│  └─ Resampling algorithm needs improvement
│
├─ "Byte range" is 50-200 in MU-LAW?
│  └─ Audio too quiet, increase gain to 6.0 or 8.0
│
├─ "Encoding error" > 10%?
│  └─ Mu-law encoding algorithm has bug
│
└─ "Extreme values" > 10,000 in MU-LAW?
   └─ Amplification is too aggressive, reduce gain
```

---

## Expected Good Values

For quality telephony audio:

| Metric | Value | Status |
|--------|-------|--------|
| RMS Before | 2,500-4,000 | Good source |
| RMS After Resample | 2,300-3,800 | Good resampling |
| Volume Loss | 5-15% | Acceptable |
| RMS After Amplify (4x) | 8,000-12,000 | Good level |
| Clipping | No | ✅ Safe |
| Encoding Error | 1-5% | ✅ Normal |
| Mu-law Byte Range | 20-240 | ✅ Using range |
| Extreme Values | < 500 | ✅ Good |

---

## Troubleshooting Decision Tree

### If audio has "catches" or glitches:

1. Check **Extreme Values** count
   - High count → Clipping → Reduce gain

2. Check **Byte Range**
   - Too narrow → Audio too quiet → Increase gain
   - Using extreme 0/255 → Clipping → Reduce gain

3. Check **Volume Loss**
   - > 25% → Need better resampling algorithm

4. Check **Clipping**
   - YES → Definitely reduce gain
   - NO but Peak > 30,000 → Still might be clipping PCM16 values

### If audio is intelligible but muffled:

1. Check **RMS After Amplify**
   - < 6,000 → Increase gain to 6.0 or 8.0
   - > 12,000 but "Clipping: No" → Might be OK, but approaching limit

2. Check **Byte Range**
   - < 100 to 200 → Too quiet, increase gain

### If audio sounds distorted/crispy:

1. Check **Clipping**
   - YES → Definitely too much gain, reduce to 2.0

2. Check **Extreme Values**
   - > 5,000 → Severe clipping, reduce gain significantly

3. Check **Volume Loss**
   - > 20% → Anti-aliasing filter might be too aggressive

---

## Optimal Settings to Try

Based on diagnostics, try these gain values:

| Situation | Suggested Gain | Reason |
|-----------|---|---|
| Clipping occurring | 2.0 | Reduce to prevent distortion |
| Audio clear but quiet | 3.0 or 3.5 | Middle ground |
| Current (4.0) is clipping | 2.5 or 3.0 | Lower it down |
| Audio muffled/barely audible | 5.0 or 6.0 | Increase for volume |
| Very quiet source | 8.0 to 12.0 | Strong amplification |

The diagnostics will show you exactly which direction to adjust!
