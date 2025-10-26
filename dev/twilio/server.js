const fs = require("fs");
const path = require("path");
var http = require("http");
const fetch = require("node-fetch");
const FormData = require("form-data");
const textToAudio = require("./textToAudio.js");
const { streamWavViaFfmpeg } = require('./ffmpegMuLawStreamer');
var HttpDispatcher = require("httpdispatcher");
var WebSocketServer = require("websocket").server;
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

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
    this.isThrottled = false;
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

          async function speak(ws, streamSid, fishWavBuffer) {
            try {
              await streamWavViaFfmpeg(ws, streamSid, fishWavBuffer, {
                ffmpegPath: 'ffmpeg',     // or an absolute path if needed
                useMarks: false,          // flip to true if you want flow-control marks
                markEveryFrames: 50,      // ~1s between marks
              });
            } catch (err) {
              console.error('TTS stream error:', err);
            }
          }

          console.log(`SECRETARY: ${reply}`);

          await speak(this.connection, this.streamSid, wavBuffer);

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

wsserver.listen(HTTP_SERVER_PORT, function () { console.log("Server listening on: http://localhost:%s", HTTP_SERVER_PORT); });