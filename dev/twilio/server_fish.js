const fs = require("fs");
const path = require("path");
var http = require("http");
const fetch = require("node-fetch");
const FormData = require("form-data");
var HttpDispatcher = require("httpdispatcher");
var WebSocketServer = require("websocket").server;

var dispatcher = new HttpDispatcher();
var wsserver = http.createServer(handleRequest);

const HTTP_SERVER_PORT = 8080;
const REPEAT_THRESHOLD = 50;

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
  log("POST TwiML");

  var filePath = path.join(__dirname + "/templates", "streams.xml");
  var stat = fs.statSync(filePath);

  res.writeHead(200, {
    "Content-Type": "text/xml",
    "Content-Length": stat.size,
  });

  var readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

mediaws.on("connect", function (connection) {
  log("From Twilio: Connection accepted");
  new MediaStream(connection);
});

class MediaStream {
  constructor(connection) {
    this.connection = connection;
    connection.on("message", this.processMessage.bind(this));
    connection.on("close", this.close.bind(this));

    this.muLawChunks = [];
    this.lastFlush = Date.now();
    this.flushMs = 1000;
    this.sampleRate = 8000;

    this.streamSid = null;
    this.hasSeenMedia = false;
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
      log("From Twilio: start streamSid=%s", this.streamSid);
      return;
    }
    if (data.event === "media") {
      if (!this.hasSeenMedia) {
        this.hasSeenMedia = true;
        log("From Twilio: first media frame");
      }
      const b = Buffer.from(data.media.payload, "base64");
      this.muLawChunks.push(b);

      const now = Date.now();
      if (now - this.lastFlush >= this.flushMs) {
        this.lastFlush = now;
        const batch = Buffer.concat(this.muLawChunks);
        this.muLawChunks = [];
        this.sendChunkToFish(batch).catch((e) => {
          console.error("ASR chunk error:", e);
        });
      }
      return;
    }
    if (data.event === "mark") {
      log("From Twilio: mark", data);
      return;
    }
    if (data.event === "stop" || data.event === "close" || data.event === "closed") {
      log("From Twilio: stop/close", data);

      if (this.muLawChunks.length) {
        const finalBatch = Buffer.concat(this.muLawChunks);
        this.muLawChunks = [];
        this.sendChunkToFish(finalBatch).catch((e) =>
          console.error("Final ASR chunk error:", e)
        );
      }
      this.close();
      return;
    }
  }

  async sendChunkToFish(muLawBuffer) {
    if (!muLawBuffer || muLawBuffer.length === 0) return;

    const pcm16 = decodeMuLawToPCM16(muLawBuffer);

    const wav = pcm16ToWav(
      Buffer.from(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength),
      this.sampleRate
    );

    const fd = new FormData();
    fd.append("language", "en");
    fd.append("ignore_timestamps", "true");
    fd.append("audio", wav, { filename: "chunk.wav", contentType: "audio/wav" });

    const r = await fetch("https://api.fish.audio/v1/asr", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FISH_API_KEY}`,
        ...fd.getHeaders(),
      },
      body: fd,
    });

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Fish STT ${r.status} (bytes=${muLawBuffer.length}): ${text}`);
    }
    const json = await r.json();
    const transcript = json.text || json.transcript || JSON.stringify(json);
    console.log(`${transcript}`);
  }

  close() {
    log("Server: Closed");
  }
}

/** --------- helpers (μ-law decode + WAV) --------- **/

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

function decodeMuLawToPCM16(muLawBuf) {
  const out = new Int16Array(muLawBuf.length);
  for (let i = 0; i < muLawBuf.length; i++) {
    out[i] = MULAW_DECODE_TABLE[muLawBuf[i]];
  }
  return out;
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
