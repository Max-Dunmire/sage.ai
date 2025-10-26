# Audio Conversion Guide: Mu-law ↔ WAV ↔ PCM16

## Overview

Your Twilio system needs to convert audio between three formats:

```
Twilio (Mu-law) ← → WAV (Fish Audio) ← → PCM16 (raw audio)
```

This guide explains the conversion pipeline and how to use each function.

---

## Audio Format Specifications

### Mu-law (μ-law)
- **Used by**: Twilio phone streams
- **Sample format**: Single byte per sample (0-255)
- **Data rate**: 8kHz × 1 byte = 64 kbps
- **Packet size**: Twilio sends ~20ms packets = 160 bytes
- **Characteristics**: Logarithmic compression (good for speech)

### PCM16 (Pulse Code Modulation)
- **Used by**: Raw audio processing
- **Sample format**: 16-bit signed integer (-32768 to 32767)
- **Data rate**: 8kHz × 2 bytes = 128 kbps
- **Characteristics**: Linear encoding, exactly 2× larger than Mu-law

### WAV (Waveform Audio File Format)
- **Used by**: Fish Audio API output
- **Format**: PCM16 audio with 44-byte header
- **Structure**:
  - Bytes 0-43: Header (format info)
  - Bytes 44+: Raw PCM16 audio data

---

## Conversion Functions

### 1. **decodeMuLawToPCM16(muLawBuf)** ✅ (Already Exists)

**Purpose**: Convert incoming Twilio audio to raw audio

```javascript
const muLawAudio = Buffer.from([0xFF, 0xFE, 0xFD, ...]);  // From Twilio
const pcm16Audio = decodeMuLawToPCM16(muLawAudio);
// Output: Int16Array with decoded samples
```

**Input**: Mu-law bytes (from Twilio WebSocket)
**Output**: Int16Array of PCM16 samples

---

### 2. **encodePCM16ToMuLaw(pcm16Data)** ✨ (New Function)

**Purpose**: Convert processed audio back to Twilio format

```javascript
const pcm16Audio = new Int16Array([1000, 2000, 3000, ...]);
const muLawAudio = encodePCM16ToMuLaw(pcm16Audio);
// Output: Buffer of Mu-law bytes ready for Twilio
```

**Input**: Int16Array or Buffer of PCM16 samples
**Output**: Buffer of Mu-law bytes (ready for Twilio WebSocket)

**How it works**:
- Takes each 16-bit PCM sample
- Applies mu-law compression formula
- Outputs single byte per sample
- ~50% compression ratio

---

### 3. **wavToPCM16(wavBuffer)** ✨ (New Function)

**Purpose**: Extract audio data from WAV file

```javascript
const wavFile = Buffer.from([...]);  // From Fish Audio
const pcm16Audio = wavToPCM16(wavFile);
// Output: Buffer with raw PCM16 data (no header)
```

**Input**: Complete WAV file buffer
**Output**: Buffer containing only PCM16 audio data

**How it works**:
- WAV format has 44-byte header (format info)
- Audio data starts at byte 44
- Simply slices off the header

---

### 4. **wavToMuLaw(wavBuffer)** ✨ (New Function - Convenience)

**Purpose**: Convert Fish Audio output directly to Twilio format

```javascript
const fishAudioWAV = await textToAudio('Hello World', apiKey);
const muLawAudio = wavToMuLaw(fishAudioWAV);
// Ready to send to Twilio!
```

**Input**: Complete WAV file buffer
**Output**: Buffer of Mu-law bytes

**How it works**:
- `wavToPCM16()` → extracts PCM16
- `encodePCM16ToMuLaw()` → converts to Mu-law
- Returns result ready for Twilio

---

## Complete Workflow Example

### Scenario: Play AI response to caller

```javascript
const textToAudio = require('./textToAudio');

// 1. Get AI response from Claude
const aiResponse = "Your appointment is scheduled for tomorrow at 2 PM";

// 2. Convert text to speech (WAV format)
const wavBuffer = await textToAudio(aiResponse, FISH_AUDIO_API_KEY);

// 3. Convert WAV to Mu-law (Twilio format)
const muLawAudio = wavToMuLaw(wavBuffer);

// 4. Send to Twilio in chunks (~20ms packets)
const chunkSize = 160; // 20ms at 8kHz
for (let i = 0; i < muLawAudio.length; i += chunkSize) {
  const chunk = muLawAudio.slice(i, i + chunkSize);

  // Send through Twilio WebSocket
  connection.send(JSON.stringify({
    event: "media",
    streamSid: this.streamSid,
    media: {
      payload: chunk.toString('base64')  // Twilio expects base64
    }
  }));

  // Optional: Add delay between packets to avoid flooding
  await new Promise(r => setTimeout(r, 20));
}
```

---

## Audio Format Conversions Map

```
From Twilio (Incoming):
  Mu-law (160 bytes)
       ↓ decodeMuLawToPCM16()
  PCM16 (320 bytes)
       ↓ (process/analyze)
  PCM16 (320 bytes)

To Twilio (Outgoing):
  From Fish Audio (WAV file)
       ↓ wavToMuLaw()
  Mu-law (160 bytes)
       ↓ (split into 160-byte chunks)
  Twilio WebSocket packets
```

---

## Why Mu-law?

Mu-law encoding was chosen by Twilio for phone systems because:

1. **Compression**: 50% smaller than PCM16 (8-bit vs 16-bit)
2. **Logarithmic**: Better at preserving speech quality at low volumes
3. **Legacy**: Telephony standard (G.711 μ-law)
4. **Low bandwidth**: Critical for real-time phone calls

---

## Data Size Examples

For 1 second of audio at 8kHz:

| Format | Data Size |
|--------|-----------|
| Mu-law | 8 KB |
| PCM16 | 16 KB |
| WAV (PCM16) | 16.044 KB (44-byte header) |

---

## Implementation Checklist

- [x] `decodeMuLawToPCM16()` - Decode incoming Twilio audio
- [x] `encodePCM16ToMuLaw()` - Encode outgoing Twilio audio ✨ NEW
- [x] `wavToPCM16()` - Extract audio from WAV ✨ NEW
- [x] `wavToMuLaw()` - One-step WAV to Twilio ✨ NEW
- [ ] Integrate into MediaStream class to play responses
- [ ] Handle chunking (160-byte packets for 20ms intervals)
- [ ] Add base64 encoding for Twilio WebSocket

---

## Common Pitfalls

❌ **Don't** send entire audio buffer at once
- Twilio expects 20ms chunks (~160 bytes)
- Sending all at once will overwhelm the stream

❌ **Don't** forget to base64 encode for WebSocket
- Twilio WebSocket requires: `media.payload` in base64

❌ **Don't** mix sample rates
- Fish Audio: typically 24kHz output
- Twilio: expects 8kHz
- Need to resample if sample rates don't match!

✅ **Do** use `wavToMuLaw()` for simplicity
- Handles WAV header extraction and encoding in one call

✅ **Do** add delays between chunks
- Respect the audio timeline (20ms per packet)

✅ **Do** handle errors in audio conversion
- Network errors from Fish Audio
- Invalid WAV data
- Encoding/decoding failures
