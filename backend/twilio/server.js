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
    
    this.partialText = "";
    this.finalSegments = [];
    this.lastFinalSeen = "";
    this.isThrottled = false;
    this.flushing = false;
    this.lastFlushedText = "";
  }

  async openDeepgram() {
    this.buffer = [];
    this.speaking = false;

    this.dgConn = dg.listen.live({
      model: "nova-3",
      punctuate: true,
      interim_results: true,
      encoding: "mulaw",
      sample_rate: 8000,
      channels: 1,
      endpointing: 1200,
      utterance_end_ms: 1200,
      vad_events: true,
      utterances: true
    });

    this.dgConn.on(LiveTranscriptionEvents.SpeechStarted, () => {
      this.speaking = true;
    });
    
    this.dgConn.on(LiveTranscriptionEvents.Transcript, async (evt) => {
      const alt = evt?.channel?.alternatives?.[0];
      const text = alt?.transcript?.trim() || "";
      if (!text) return;
      if (evt.is_final === true) {
        if (text !== this.lastFinalSeen) {
          this.finalSegments.push(text);
          this.lastFinalSeen = text;
        }
        this.partialText = "";
      } else {
        this.partialText = text;
      }
    });

    this.dgConn.on(LiveTranscriptionEvents.UtteranceEnd, async () => {
      await this._maybeFlush("utteranceEnd");
    });

    this.dgConn.on(LiveTranscriptionEvents.Error, (e) => {
      console.error("Deepgram error:", e);
    });

    this.dgConn.on(LiveTranscriptionEvents.Close, () => {
      console.log("Deepgram closed");
      this.dgConn = null;
    });

    await new Promise((resolve) => this.dgConn.on(LiveTranscriptionEvents.Open, resolve));
    console.log("Deepgram live connected");
  }

  async _maybeFlush(reason) {
    if (this.flushing || this.isThrottled) return;
    this.flushing = true;

    const assembled = (this.finalSegments.length
      ? this.finalSegments.join(" ")
      : this.partialText).replace(/\s+/g, " ").trim();

    this.finalSegments = [];
    this.partialText = "";
    this.lastFinalSeen = "";

    if (!assembled) { this.flushing = false; return; }

    if (assembled === this.lastFlushedText) {
      this.flushing = false; 
      return;
    }
    this.lastFlushedText = assembled;

    try {
      this.isThrottled = true;
      console.log(`USER: ${text}`)

      currentTranscript.push({
        role: "user",
        message: text,
        timestamp: new Date().toISOString(),
      });

      const { reply } = await sendTurn({text});

      const wavBuffer = await textToAudio(reply, process.env.FISH_API_KEY);
      log(`Received WAV buffer, size: ${wavBuffer.length} bytes`);

      const muLawAudio = wavToMuLawOptimized(wavBuffer);
      const durationSeconds = muLawAudio.length / 8000;

      const pcm16Data = wavToPCM16(wavBuffer);
      const pcm16Array = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);

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

      const testMulaw = muLawAudio[Math.floor(muLawAudio.length / 2)]; // Middle sample
      const testDecoded = decodeMuLawToPCM16(Buffer.from([testMulaw]))[0];
      const testOriginal = resampledArray[Math.floor(resampledArray.length / 2)];
      const absOriginal = Math.abs(testOriginal);
      const absDecoded = Math.abs(testDecoded);
      const encodingError = absOriginal > 0 ? ((Math.abs(absOriginal - absDecoded) / absOriginal) * 100).toFixed(1) : "N/A";

      log(`=== MU-LAW ENCODING TEST ===`);
      log(`  Middle sample - Original: ${testOriginal}, Encoded then Decoded: ${testDecoded}, Error: ${encodingError}%`);

      let clippingCount = 0;
      let minMulaw = muLawAudio[0], maxMulaw = muLawAudio[0];
      for (let i = 0; i < muLawAudio.length; i++) {
        minMulaw = Math.min(minMulaw, muLawAudio[i]);
        maxMulaw = Math.max(maxMulaw, muLawAudio[i]);
        if (muLawAudio[i] === 0 || muLawAudio[i] === 255) clippingCount++;
      }

      log(`=== MU-LAW OUTPUT ANALYSIS ===`);
      log(`  Byte range: ${minMulaw} to ${maxMulaw}, Extreme values: ${clippingCount}`);
      log(`  First 16 mu-law bytes: [${Array.from(muLawAudio.slice(0, 16)).join(', ')}]`);

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
          await new Promise(r => setTimeout(r, 20));
        }
        log(`Sent ${chunksSent} audio chunks (total ${padded.length} bytes) to Twilio`);

        console.log(`SECRETARY: ${reply}`);

        currentTranscript.push({
          role: "secretary",
          message: reply,
          timestamp: new Date().toISOString(),
        });
    } catch (e) {
      console.error("sendTurn failed:", e);
    } finally {
      setTimeout(() => { this.isThrottled = false; }, 400);
      this.flushing = false;
    }
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

    const sign = pcm < 0 ? 0x80 : 0x00;

    if (pcm < 0) {
      pcm = -pcm;
    }

    if (pcm > MULAW_MAX) {
      pcm = MULAW_MAX;
    }

    pcm = pcm + MULAW_THRESHOLD;

    let exponent = 7;
    for (let mask = 0x4000; mask > 0; mask >>= 1) {
      if (pcm >= (mask << 1)) {
        break;
      }
      exponent--;
    }

    const mantissa = (pcm >> (exponent + 3)) & 0x0F;

    muLaw[i] = ~(sign | (exponent << 4) | mantissa) & 0xFF;
  }

  return muLaw;
}

function wavToPCM16(wavBuffer) {
  return wavBuffer.slice(44);
}

function applyAntiAliasingFilter(input, decimationFactor) {
  const output = new Int16Array(input.length);
  const windowSize = Math.ceil(decimationFactor * 2);

  for (let i = 0; i < input.length; i++) {
    let sum = 0;
    let weight = 0;

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

function resamplePCM16(pcm16Data, inputSampleRate, outputSampleRate) {
  let inputArray = pcm16Data;
  if (Buffer.isBuffer(pcm16Data)) {
    inputArray = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);
  }

  const ratio = inputSampleRate / outputSampleRate;

  let filtered = inputArray;
  if (ratio > 2) {
    filtered = applyAntiAliasingFilter(inputArray, ratio);
  }

  const outputLength = Math.floor(filtered.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, filtered.length - 1);
    const fraction = srcIndex - srcFloor;

    output[i] = Math.round(
      filtered[srcFloor] * (1 - fraction) + filtered[srcCeil] * fraction
    );
  }

  return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
}

function parseWavHeader(wavBuffer) {
  if (wavBuffer.length < 44) {
    throw new Error("WAV buffer too small, invalid WAV file");
  }

  const sampleRate = wavBuffer.readUInt32LE(24);
  const channels = wavBuffer.readUInt16LE(22);
  const bitsPerSample = wavBuffer.readUInt16LE(34);
  const dataSize = wavBuffer.length - 44;

  return {
    sampleRate,
    channels,
    bitsPerSample,
    dataSize,
    numSamples: Math.floor(dataSize / (bitsPerSample / 8) / channels)
  };
}

function amplifyAudio(pcm16Data, gainFactor = 4.0) {
  let pcmArray = pcm16Data;
  if (Buffer.isBuffer(pcm16Data)) {
    pcmArray = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);
  }

  const output = new Int16Array(pcmArray.length);
  for (let i = 0; i < pcmArray.length; i++) {
    const amplified = pcmArray[i] * gainFactor;
    output[i] = Math.max(-32768, Math.min(32767, amplified));
  }

  return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
}

function wavToMuLawOptimized(wavBuffer) {
  try {
    const wav = new WaveFile(wavBuffer);

    const originalRate = wav.fmt.sampleRate;
    const originalChannels = wav.fmt.numChannels;

    if (originalRate !== 8000) {
      wav.toSampleRate(8000);
    }

    if (wav.fmt.formatCode !== 1) {
      wav.toRawFile();
    }

    const pcm16Buffer = Buffer.from(wav.data.samples.buffer, wav.data.samples.byteOffset, wav.data.samples.byteLength);
    const pcm16Array = new Int16Array(pcm16Buffer.buffer, pcm16Buffer.byteOffset, pcm16Buffer.length / 2);

    const gainFactor = 1.5;
    const amplified = new Int16Array(pcm16Array.length);
    let maxVal = 0;

    for (let i = 0; i < pcm16Array.length; i++) {
      const val = pcm16Array[i] * gainFactor;
      const clipped = Math.max(-32768, Math.min(32767, val));
      amplified[i] = clipped;
      maxVal = Math.max(maxVal, Math.abs(clipped));
    }

    const muLawBuffer = Buffer.alloc(amplified.length);
    for (let i = 0; i < amplified.length; i++) {
      muLawBuffer[i] = MuLaw.encode(amplified[i]);
    }

    return muLawBuffer;

  } catch (err) {
    log(`Error in wavToMuLawOptimized: ${err.message}, falling back to original implementation`);
    return wavToMuLaw(wavBuffer);
  }
}

function wavToMuLaw(wavBuffer) {
  const wavInfo = parseWavHeader(wavBuffer);
  log(`WAV Info: ${wavInfo.sampleRate}Hz, ${wavInfo.channels} channels, ${wavInfo.bitsPerSample} bits/sample`);

  const pcm16 = wavToPCM16(wavBuffer);

  let audioToEncode = pcm16;
  if (wavInfo.sampleRate !== 8000) {
    log(`Resampling from ${wavInfo.sampleRate}Hz to 8000Hz`);
    audioToEncode = resamplePCM16(pcm16, wavInfo.sampleRate, 8000);
  }
  const amplified = amplifyAudio(audioToEncode, 2.0);

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

