const fs = require("fs");
const path = require("path");
var http = require("http");
const fetch = require("node-fetch");
const FormData = require("form-data");
const textToAudio = require("./textToAudio")
var HttpDispatcher = require("httpdispatcher");
var WebSocketServer = require("websocket").server;
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const WaveFile = require("wavefile").WaveFile;
const MuLaw = require("alawmulaw").MuLaw;

const dg = createClient(process.env.DEEPGRAM_API_KEY);
const HTTP_SERVER_PORT = 8081;

var dispatcher = new HttpDispatcher();
var wsserver = http.createServer(handleRequest);

// Global state for tracking the current call transcript
var currentTranscript = [];
var isCallActive = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var mediaws = new WebSocketServer({
  httpServer: wsserver,
  autoAcceptConnections: true,
});

function log(message, ...args) {
  console.log(new Date(), message, ...args);
}

function handleRequest(request, response) {
  try {
    dispatcher.dispatch(request, response);
  } catch (err) {
    console.error(err);
  }
}

dispatcher.onPost("/twiml", function (req, res) {
  var filePath = path.join(__dirname, "twiml.xml");
  var stat = fs.statSync(filePath);

  res.writeHead(200, {
    "Content-Type": "text/xml",
    "Content-Length": stat.size,
  });

  var readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

// API endpoint to get the current live transcript
dispatcher.onGet("/api/transcript", function (req, res) {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  res.end(JSON.stringify({
    success: true,
    isCallActive: isCallActive,
    transcript: currentTranscript,
  }));
});

// API endpoint to reset the transcript (for starting a new demo)
dispatcher.onPost("/api/transcript/reset", function (req, res) {
  currentTranscript = [];
  isCallActive = false;

  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  res.end(JSON.stringify({
    success: true,
    message: "Transcript reset",
  }));
});

// API endpoint for demo - get conversation
dispatcher.onPost("/api/conversation", async function (req, res) {
  try {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const { userMessage, persona } = data;

        log(`Demo conversation - Persona: ${persona}, User: ${userMessage}`);

        // Call the backend turn endpoint
        const { reply } = await sendTurn({ text: userMessage });

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });

        res.end(JSON.stringify({
          success: true,
          message: reply,
          persona: persona,
        }));
      } catch (err) {
        log("Error processing conversation:", err);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: err.message,
        }));
      }
    });
  } catch (err) {
    log("Error handling conversation request:", err);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      success: false,
      error: err.message,
    }));
  }
});

// API endpoint for demo - get example scenario response
dispatcher.onPost("/api/demo-scenario", async function (req, res) {
  try {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const { scenario, persona } = data;

        log(`Demo scenario - Persona: ${persona}, Scenario: ${scenario}`);

        // For demo purposes, return example responses
        const scenarioResponses = {
          spam: {
            userMessage: "Unknown Number is calling...",
            sageMessage: "Sage.ai has detected a spam caller and blocked the call automatically.",
          },
          meeting: {
            userMessage: "John from Acme Corp is calling to schedule a meeting.",
            sageMessage: "I've checked your calendar and scheduled the meeting for Tuesday at 2 PM. I'll send a confirmation email.",
          },
          priority: {
            userMessage: "Sarah Johnson is calling.",
            sageMessage: "Sarah Johnson is in your priority contacts. Connecting you immediately.",
          },
        };

        const response = scenarioResponses[scenario] || scenarioResponses.spam;

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });

        res.end(JSON.stringify({
          success: true,
          ...response,
          persona: persona,
        }));
      } catch (err) {
        log("Error processing demo scenario:", err);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: err.message,
        }));
      }
    });
  } catch (err) {
    log("Error handling demo scenario request:", err);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      success: false,
      error: err.message,
    }));
  }
});

// CORS preflight
dispatcher.onOptions(/.*/, function (req, res) {
  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end();
});

mediaws.on("connect", function (connection) {
  new MediaStream(connection);
});

async function sendTurn({text}) {
  const r = await fetch("http://127.0.0.1:5001/turn", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": process.env.INTERNAL_SECRET
    },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

class MediaStream {
  constructor(connection) {
    this.connection = connection;
    connection.on("message", this.processMessage.bind(this));
    connection.on("close", this.close.bind(this));

    this.dgConn = null;
    this.streamSid = null;
    this.hasSeenMedia = false;
    this.throttled = false;
  }

  async openDeepgram() {
    this.dgConn = dg.listen.live({
      model: "nova-3",
      punctuate: true,
      interim_results: true,
      encoding: "mulaw",
      sample_rate: 8000,
      channels: 1,
    });
    
    this.dgConn.on(LiveTranscriptionEvents.Transcript, async (evt) => {
      if (this.isThrottled) return;
      try {
        const alt = evt?.channel?.alternatives?.[0];
        if (!alt) return;
        const text = alt.transcript || "";
        if (!text) return;
        const isFinal = evt?.is_final;
        if (isFinal) {
	  this.isThrottled = true;
          console.log(`USER: ${text}`)

          // Add user message to transcript
          currentTranscript.push({
            role: "user",
            message: text,
            timestamp: new Date().toISOString(),
          });

          const { reply } = await sendTurn({text});

          const wavBuffer = await textToAudio(reply, process.env.FISH_API_KEY);
          log(`Received WAV buffer, size: ${wavBuffer.length} bytes`);

          // Use optimized library-based conversion (wavefile + alawmulaw)
          const muLawAudio = wavToMuLawOptimized(wavBuffer);
          const durationSeconds = muLawAudio.length / 8000;

          // ===== COMPREHENSIVE AUDIO DIAGNOSTICS =====

          // 1. Extract original PCM16 from WAV
          const pcm16Data = wavToPCM16(wavBuffer);
          const pcm16Array = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);

          // 2. Calculate audio statistics BEFORE resampling
          let minBefore = pcm16Array[0], maxBefore = pcm16Array[0];
          let sumBefore = 0, sumSquaresBefore = 0;
          for (let i = 0; i < pcm16Array.length; i++) {
            const val = pcm16Array[i];
            minBefore = Math.min(minBefore, val);
            maxBefore = Math.max(maxBefore, val);
            sumBefore += val;
            sumSquaresBefore += val * val;
          }
          const meanBefore = sumBefore / pcm16Array.length;
          const rmsBefore = Math.sqrt(sumSquaresBefore / pcm16Array.length);

          log(`=== AUDIO STATS BEFORE RESAMPLING (44.1kHz) ===`);
          log(`  Samples: ${pcm16Array.length}, Peak: ${maxBefore}, Min: ${minBefore}, RMS: ${rmsBefore.toFixed(0)}, Mean: ${meanBefore.toFixed(0)}`);
          log(`  First 8 samples: [${Array.from(pcm16Array.slice(0, 8)).join(', ')}]`);

          // 3. Resample and check statistics AFTER resampling
          const resampled = resamplePCM16(pcm16Data, 44100, 8000);
          const resampledArray = new Int16Array(resampled.buffer, resampled.byteOffset, resampled.length / 2);

          let minAfter = resampledArray[0], maxAfter = resampledArray[0];
          let sumAfter = 0, sumSquaresAfter = 0;
          for (let i = 0; i < resampledArray.length; i++) {
            const val = resampledArray[i];
            minAfter = Math.min(minAfter, val);
            maxAfter = Math.max(maxAfter, val);
            sumAfter += val;
            sumSquaresAfter += val * val;
          }
          const meanAfter = sumAfter / resampledArray.length;
          const rmsAfter = Math.sqrt(sumSquaresAfter / resampledArray.length);

          log(`=== AUDIO STATS AFTER RESAMPLING (8kHz) ===`);
          log(`  Samples: ${resampledArray.length}, Peak: ${maxAfter}, Min: ${minAfter}, RMS: ${rmsAfter.toFixed(0)}, Mean: ${meanAfter.toFixed(0)}`);
          log(`  Volume loss from resampling: ${(((rmsBefore - rmsAfter) / rmsBefore) * 100).toFixed(1)}%`);
          log(`  First 8 samples: [${Array.from(resampledArray.slice(0, 8)).join(', ')}]`);

          // 4. Check statistics AFTER amplification
          // Reduced gain from 4.0 to 2.0 to prevent hard-clipping at INT16 boundaries
          // This eliminates "catches" and click artifacts in audio playback
          const amplified = amplifyAudio(resampled, 2.0);
          const amplifiedArray = new Int16Array(amplified.buffer, amplified.byteOffset, amplified.length / 2);

          let minAmp = amplifiedArray[0], maxAmp = amplifiedArray[0];
          let sumAmp = 0, sumSquaresAmp = 0;
          for (let i = 0; i < amplifiedArray.length; i++) {
            const val = amplifiedArray[i];
            minAmp = Math.min(minAmp, val);
            maxAmp = Math.max(maxAmp, val);
            sumAmp += val;
            sumSquaresAmp += val * val;
          }
          const rmsAmp = Math.sqrt(sumSquaresAmp / amplifiedArray.length);

          log(`=== AUDIO STATS AFTER AMPLIFICATION (2x) ===`);
          log(`  Peak: ${maxAmp}, Min: ${minAmp}, RMS: ${rmsAmp.toFixed(0)}, Clipping: ${maxAmp > 32767 ? 'YES - DATA LOSS!' : 'No'}`);
          log(`  First 8 samples: [${Array.from(amplifiedArray.slice(0, 8)).join(', ')}]`);

          // 5. Test mu-law encoding/decoding roundtrip
          // Test on the RESAMPLED (unclipped) audio to get accurate encoding fidelity
          const testMulaw = muLawAudio[Math.floor(muLawAudio.length / 2)]; // Middle sample
          const testDecoded = decodeMuLawToPCM16(Buffer.from([testMulaw]))[0];
          // Use resampled value (before amplification) as the true original
          const testOriginal = resampledArray[Math.floor(resampledArray.length / 2)];
          const absOriginal = Math.abs(testOriginal);
          const absDecoded = Math.abs(testDecoded);
          const encodingError = absOriginal > 0 ? ((Math.abs(absOriginal - absDecoded) / absOriginal) * 100).toFixed(1) : "N/A";

          log(`=== MU-LAW ENCODING TEST ===`);
          log(`  Middle sample - Original: ${testOriginal}, Encoded then Decoded: ${testDecoded}, Error: ${encodingError}%`);

          // 6. Check for clipping in mu-law output
          let clippingCount = 0;
          let minMulaw = muLawAudio[0], maxMulaw = muLawAudio[0];
          for (let i = 0; i < muLawAudio.length; i++) {
            minMulaw = Math.min(minMulaw, muLawAudio[i]);
            maxMulaw = Math.max(maxMulaw, muLawAudio[i]);
            // Check for potential extreme values
            if (muLawAudio[i] === 0 || muLawAudio[i] === 255) clippingCount++;
          }

          log(`=== MU-LAW OUTPUT ANALYSIS ===`);
          log(`  Byte range: ${minMulaw} to ${maxMulaw}, Extreme values: ${clippingCount}`);
          log(`  First 16 mu-law bytes: [${Array.from(muLawAudio.slice(0, 16)).join(', ')}]`);

          // Pad audio to multiple of 160 (Twilio chunk size)
          const chunkSize = 160; // 20ms at 8kHz
          const padded = Buffer.alloc(Math.ceil(muLawAudio.length / chunkSize) * chunkSize);
          muLawAudio.copy(padded);

          log(`Padded audio from ${muLawAudio.length} to ${padded.length} bytes (${Math.ceil(muLawAudio.length / chunkSize)} chunks)`);

          let chunksSent = 0;
          for (let i = 0; i < padded.length; i += chunkSize) {
            const chunk = padded.slice(i, i + chunkSize);
            chunksSent++;
            this.connection.send(JSON.stringify({
              event: "media",
              streamSid: this.streamSid,
              media: { payload: chunk.toString('base64') }
            }));
            await new Promise(r => setTimeout(r, 20)); // Respect timing
          }
          log(`Sent ${chunksSent} audio chunks (total ${padded.length} bytes) to Twilio`);

          console.log(`SECRETARY: ${reply}`);

          // Add AI response to transcript
          currentTranscript.push({
            role: "secretary",
            message: reply,
            timestamp: new Date().toISOString(),
          });

          await sleep(5000);
	  this.isThrottled = false;
        }
      } catch (err) {
        console.log(`wtf broken ${err}`)
      }
    });

    this.dgConn.on(LiveTranscriptionEvents.Error, (e) => {
      console.error("Deepgram error:", e);
    });

    this.dgConn.on(LiveTranscriptionEvents.Close, () => {
      console.log("Deepgram closed");
      this.dgConn = null;
    });

    await new Promise((resolve) =>
      this.dgConn.on(LiveTranscriptionEvents.Open, resolve)
    );
    console.log("Deepgram live connected");
  }

  async processMessage(message) {
    if (message.type !== "utf8") return;
    const data = JSON.parse(message.utf8Data);

    if (data.event === "connected") {
      log("From Twilio: connected", data);
      return;
    }

    if (data.event === "start") {
      this.streamSid = data?.start?.streamSid;
      log("From Twilio: start", this.streamSid);
      if (!this.dgConn) {
        try { await this.openDeepgram(); } catch (e) { console.error(e); }
      }
      return;
    }

    if (data.event === "media") {
      if (!this.hasSeenMedia) {
        this.hasSeenMedia = true;
        log("From Twilio: first media frame");
      }
      if (this.dgConn) {
        const bytes = Buffer.from(data.media.payload, "base64");
        this.dgConn.send(bytes);
      }
      return;
    }

    if (data.event === "mark") {
      log("From Twilio: mark", data);
      return;
    }
    
    if (data.event === "stop" || data.event === "close" || data.event === "closed") {
      log("From Twilio: stream ended", data);
      return;
    }
  }

  async close() {
    try {
      if (this.dgConn) {
        this.dgConn.finish();
        this.dgConn = null;
      }
    } catch (e) {
    }

    // Reset the Python backend session when the call ends
    try {
      await fetch("http://127.0.0.1:5001/session/reset", {
        method: "POST",
        headers: {
          "x-internal-secret": process.env.INTERNAL_SECRET
        },
        body: JSON.stringify({ stream_sid: this.streamSid })
      });
    } catch (err) {
      log("Warning: Failed to reset session on close", err.message);
    }

    log("Server: Closed");
  }
}


const MULAW_DECODE_TABLE = (() => {
  const table = new Int16Array(256);
  for (let i = 0; i < 256; i++) {
    let u = ~i & 0xff;
    let t = ((u & 0x0f) << 3) + 0x84;
    t <<= (u & 0x70) >> 4;
    t -= 0x84;
    table[i] = (u & 0x80) ? (0x84 - t) : (t - 0x84);
  }
  return table;
})();

// Mu-law encoding table for converting PCM16 to Mu-law
const MULAW_ENCODE_TABLE = (() => {
  const MULAW_MAX = 32635;
  const MULAW_MIN = -32768;
  const table = new Uint8Array(65536);

  for (let i = 0; i < 256; i++) {
    const pcm = MULAW_DECODE_TABLE[i];
    table[(pcm & 0xFFFF)] = i;
  }

  return table;
})();

function decodeMuLawToPCM16(muLawBuf) {
  const out = new Int16Array(muLawBuf.length);
  for (let i = 0; i < muLawBuf.length; i++) {
    out[i] = MULAW_DECODE_TABLE[muLawBuf[i]];
  }
  return out;
}

/**
 * Encode PCM16 audio to Mu-law format for Twilio
 * Standard G.711 μ-law encoding (ITU-T G.711)
 * @param {Int16Array|Buffer} pcm16Data - PCM16 audio data (8kHz, mono)
 * @returns {Buffer} Mu-law encoded data
 */
function encodePCM16ToMuLaw(pcm16Data) {
  // Convert Buffer to Int16Array if needed
  let pcmArray = pcm16Data;
  if (Buffer.isBuffer(pcm16Data)) {
    pcmArray = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);
  }

  const muLaw = Buffer.alloc(pcmArray.length);
  const MULAW_MAX = 32635;
  const MULAW_THRESHOLD = 132;

  for (let i = 0; i < pcmArray.length; i++) {
    let pcm = pcmArray[i];

    // Get the sign of the sample
    const sign = pcm < 0 ? 0x80 : 0x00;

    // Get absolute value and work with positive numbers
    if (pcm < 0) {
      pcm = -pcm;
    }

    // Clamp to valid range
    if (pcm > MULAW_MAX) {
      pcm = MULAW_MAX;
    }

    // Apply bias
    pcm = pcm + MULAW_THRESHOLD;

    // Compute the exponent (segment)
    // Find which segment this sample falls into
    let exponent = 7;
    for (let mask = 0x4000; mask > 0; mask >>= 1) {
      if (pcm >= (mask << 1)) {
        break;
      }
      exponent--;
    }

    // Extract the mantissa (lower 4 bits of the sample after shift)
    const mantissa = (pcm >> (exponent + 3)) & 0x0F;

    // Combine all parts: sign(1) + exponent(3) + mantissa(4)
    // Then bitwise NOT for the final mu-law encoding
    muLaw[i] = ~(sign | (exponent << 4) | mantissa) & 0xFF;
  }

  return muLaw;
}

/**
 * Extract PCM16 audio from WAV buffer (removes WAV header)
 * @param {Buffer} wavBuffer - Complete WAV file buffer
 * @returns {Buffer} Raw PCM16 audio data
 */
function wavToPCM16(wavBuffer) {
  // WAV header is 44 bytes, audio data starts after that
  return wavBuffer.slice(44);
}

/**
 * Simple anti-aliasing low-pass filter for downsampling
 * @param {Int16Array} input - Input audio samples
 * @param {number} decimationFactor - How much to downsample (e.g., 5.5 for 44.1kHz to 8kHz)
 * @returns {Int16Array} Filtered audio
 */
function applyAntiAliasingFilter(input, decimationFactor) {
  const output = new Int16Array(input.length);
  const windowSize = Math.ceil(decimationFactor * 2);

  for (let i = 0; i < input.length; i++) {
    let sum = 0;
    let weight = 0;

    // Simple moving average filter (crude but effective)
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(input.length, i + Math.ceil(windowSize / 2));

    for (let j = start; j < end; j++) {
      sum += input[j];
      weight++;
    }

    output[i] = Math.round(sum / weight);
  }

  return output;
}

/**
 * Resample PCM16 audio from one sample rate to another
 * Uses low-pass filtering before downsampling to prevent aliasing
 * @param {Buffer|Int16Array} pcm16Data - Input PCM16 audio
 * @param {number} inputSampleRate - Input sample rate (e.g., 44100)
 * @param {number} outputSampleRate - Output sample rate (e.g., 8000)
 * @returns {Buffer} Resampled PCM16 audio
 */
function resamplePCM16(pcm16Data, inputSampleRate, outputSampleRate) {
  // Convert Buffer to Int16Array if needed
  let inputArray = pcm16Data;
  if (Buffer.isBuffer(pcm16Data)) {
    inputArray = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);
  }

  // Calculate resampling ratio
  const ratio = inputSampleRate / outputSampleRate;

  // Apply anti-aliasing filter if downsampling aggressively
  let filtered = inputArray;
  if (ratio > 2) {
    log(`Applying anti-aliasing filter for downsampling ratio ${ratio.toFixed(2)}`);
    filtered = applyAntiAliasingFilter(inputArray, ratio);
  }

  // Now do the resampling
  const outputLength = Math.floor(filtered.length / ratio);
  const output = new Int16Array(outputLength);

  // Resample using linear interpolation on filtered data
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, filtered.length - 1);
    const fraction = srcIndex - srcFloor;

    // Linear interpolation between two samples
    output[i] = Math.round(
      filtered[srcFloor] * (1 - fraction) + filtered[srcCeil] * fraction
    );
  }

  return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
}

/**
 * Parse WAV header to get audio format information
 * @param {Buffer} wavBuffer - Complete WAV file buffer
 * @returns {Object} Audio format info {sampleRate, channels, bitsPerSample, dataSize}
 */
function parseWavHeader(wavBuffer) {
  if (wavBuffer.length < 44) {
    throw new Error("WAV buffer too small, invalid WAV file");
  }

  // WAV header structure (simplified for standard PCM)
  const sampleRate = wavBuffer.readUInt32LE(24);   // Bytes 24-27
  const channels = wavBuffer.readUInt16LE(22);     // Bytes 22-23
  const bitsPerSample = wavBuffer.readUInt16LE(34); // Bytes 34-35
  const dataSize = wavBuffer.length - 44;          // Everything after header

  return {
    sampleRate,
    channels,
    bitsPerSample,
    dataSize,
    numSamples: Math.floor(dataSize / (bitsPerSample / 8) / channels)
  };
}

/**
 * Amplify PCM16 audio to increase volume
 * @param {Buffer|Int16Array} pcm16Data - Input PCM16 audio
 * @param {number} gainFactor - Amplification factor (1.0 = no change, 4.0 = 4x louder)
 * @returns {Buffer} Amplified PCM16 audio
 */
function amplifyAudio(pcm16Data, gainFactor = 4.0) {
  let pcmArray = pcm16Data;
  if (Buffer.isBuffer(pcm16Data)) {
    pcmArray = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);
  }

  const output = new Int16Array(pcmArray.length);
  for (let i = 0; i < pcmArray.length; i++) {
    // Amplify with clipping protection
    const amplified = pcmArray[i] * gainFactor;
    output[i] = Math.max(-32768, Math.min(32767, amplified));
  }

  return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
}

/**
 * Convert WAV audio to Mu-law format using wavefile library (BEST QUALITY)
 * This uses battle-tested libraries instead of custom implementation
 * @param {Buffer} wavBuffer - Complete WAV file buffer from Fish Audio
 * @returns {Buffer} Mu-law encoded audio at 8kHz
 */
function wavToMuLawOptimized(wavBuffer) {
  try {
    // Use wavefile library for parsing and resampling
    const wav = new WaveFile(wavBuffer);

    // Get original info
    const originalRate = wav.fmt.sampleRate;
    const originalChannels = wav.fmt.numChannels;
    log(`WAV Info: ${originalRate}Hz, ${originalChannels} channels, ${wav.fmt.bitsPerSample} bits/sample`);

    // Resample to 8kHz if needed (wavefile uses high-quality resampling)
    if (originalRate !== 8000) {
      log(`Resampling from ${originalRate}Hz to 8000Hz using wavefile library`);
      wav.toSampleRate(8000);
    }

    // Convert to PCM16 if not already (ensures we have raw audio data)
    if (wav.fmt.formatCode !== 1) { // 1 = PCM
      wav.toRawFile();
    }

    // Get PCM16 samples
    const pcm16Buffer = Buffer.from(wav.data.samples.buffer, wav.data.samples.byteOffset, wav.data.samples.byteLength);
    const pcm16Array = new Int16Array(pcm16Buffer.buffer, pcm16Buffer.byteOffset, pcm16Buffer.length / 2);

    // Amplify carefully - use 1.5x to be safe
    const gainFactor = 1.5;
    const amplified = new Int16Array(pcm16Array.length);
    let maxVal = 0;

    for (let i = 0; i < pcm16Array.length; i++) {
      const val = pcm16Array[i] * gainFactor;
      // Soft clipping instead of hard clipping
      const clipped = Math.max(-32768, Math.min(32767, val));
      amplified[i] = clipped;
      maxVal = Math.max(maxVal, Math.abs(clipped));
    }

    log(`Applied ${gainFactor}x audio amplification, max peak: ${maxVal}`);

    // Encode to mu-law using alawmulaw library
    const muLawBuffer = Buffer.alloc(amplified.length);
    for (let i = 0; i < amplified.length; i++) {
      muLawBuffer[i] = MuLaw.encode(amplified[i]);
    }

    log(`Encoded to mu-law, size: ${muLawBuffer.length} bytes, duration: ${(muLawBuffer.length / 8000).toFixed(2)}s`);
    return muLawBuffer;

  } catch (err) {
    log(`Error in wavToMuLawOptimized: ${err.message}, falling back to original implementation`);
    return wavToMuLaw(wavBuffer);
  }
}

/**
 * Convert WAV audio to Mu-law format (Twilio compatible)
 * @param {Buffer} wavBuffer - Complete WAV file buffer from Fish Audio
 * @returns {Buffer} Mu-law encoded audio at 8kHz
 */
function wavToMuLaw(wavBuffer) {
  // Parse WAV header to get actual sample rate
  const wavInfo = parseWavHeader(wavBuffer);
  log(`WAV Info: ${wavInfo.sampleRate}Hz, ${wavInfo.channels} channels, ${wavInfo.bitsPerSample} bits/sample`);

  const pcm16 = wavToPCM16(wavBuffer);

  // Only resample if input sample rate is not 8kHz
  let audioToEncode = pcm16;
  if (wavInfo.sampleRate !== 8000) {
    log(`Resampling from ${wavInfo.sampleRate}Hz to 8000Hz`);
    audioToEncode = resamplePCM16(pcm16, wavInfo.sampleRate, 8000);
  }

  // Amplify audio before mu-law encoding (aggressive downsampling loses volume)
  // Reduced gain from 4.0 to 2.0 to prevent hard-clipping at INT16 boundaries
  // Hard-clipping causes "catches" and click artifacts in audio playback
  const amplified = amplifyAudio(audioToEncode, 2.0);
  log(`Applied 2x audio amplification to compensate for resampling`);

  return encodePCM16ToMuLaw(amplified);
}

function pcm16ToWav(pcmBuf, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) >> 3;
  const blockAlign = (numChannels * bitsPerSample) >> 3;
  const dataSize = pcmBuf.length;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuf]);
}

wsserver.listen(HTTP_SERVER_PORT, function () { console.log("Server listening on: http://localhost:%s", HTTP_SERVER_PORT); });

