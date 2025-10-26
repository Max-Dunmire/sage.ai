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
const { google } = require("googleapis");

let auth;
let calendar;

try {
  const serviceAccountPath = './service_keys.json';
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  calendar = google.calendar({ version: 'v3', auth });
  console.log('Google Calendar API initialized with service account');
} catch (error) {
  console.warn('Google Calendar API not initialized:', error.message);
  console.warn('Calendar features will be disabled. Add service-account-key.json to enable.');
}

// Calendar ID from environment or use primary
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
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

        // Call the backend turn endpoint
        const { reply } = await sendTurn({ text: userMessage, stream_sid: this.streamSid });

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

dispatcher.onGet("/api/calendar/events", async function (req, res) {
  try {
    if (!calendar) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      return res.end(JSON.stringify({
        success: false,
        error: 'Calendar service not initialized. Check service account configuration.'
      }));
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const timeMin = url.searchParams.get('timeMin');
    const timeMax = url.searchParams.get('timeMax');
    const maxResults = url.searchParams.get('maxResults') || '10';

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: parseInt(maxResults),
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      success: true,
      events: response.data.items || [],
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch calendar events'
    }));
  }
});
dispatcher.onPost("/api/calendar/events", async function (req, res) {
  try {
    if (!calendar) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      return res.end(JSON.stringify({
        success: false,
        error: 'Calendar service not initialized. Check service account configuration.'
      }));
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const { event } = data;

        if (!event || !event.summary || !event.start) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          return res.end(JSON.stringify({ error: 'Event summary and start time required' }));
        }

        const response = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: event,
        });

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          event: response.data,
        }));
      } catch (error) {
        console.error('Error creating calendar event:', error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message || 'Failed to create calendar event'
        }));
      }
    });
  } catch (error) {
    console.error('Error handling create event request:', error);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
});

// Update a calendar event
dispatcher.onPut("/api/calendar/events/:eventId", async function (req, res) {
  try {
    if (!calendar) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      return res.end(JSON.stringify({
        success: false,
        error: 'Calendar service not initialized. Check service account configuration.'
      }));
    }

    const eventId = req.params.eventId;
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const { event } = data;

        const response = await calendar.events.update({
          calendarId: CALENDAR_ID,
          eventId: eventId,
          requestBody: event,
        });

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          event: response.data,
        }));
      } catch (error) {
        console.error('Error updating calendar event:', error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message || 'Failed to update calendar event'
        }));
      }
    });
  } catch (error) {
    console.error('Error handling update event request:', error);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
});

// Delete a calendar event
dispatcher.onDelete("/api/calendar/events/:eventId", async function (req, res) {
  try {
    if (!calendar) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      return res.end(JSON.stringify({
        success: false,
        error: 'Calendar service not initialized. Check service account configuration.'
      }));
    }

    const eventId = req.params.eventId;

    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      success: true,
      message: 'Event deleted successfully',
    }));
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      success: false,
      error: error.message || 'Failed to delete calendar event'
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

async function sendTurn({text, streamSid}) {
  const r = await fetch("http://127.0.0.1:5001/turn", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": process.env.INTERNAL_SECRET
    },
    body: JSON.stringify({ text, streamSid})
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
    this.isThrottled = false;
  }

  async openDeepgram() {
// API endpoint for demo - get example scenario response
    this.buffer = [];
    this.speaking = false;

    this.dgConn = dg.listen.live({
      model: "nova-3",
      punctuate: true,
      interim_results: true,
      encoding: "mulaw",
      sample_rate: 8000,
      channels: 1,
      endpointing: 400,
      utterance_end_ms: 400,
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
      console.log(`USER: ${assembled}`)

      currentTranscript.push({
        role: "user",
        message: assembled,
        timestamp: new Date().toISOString(),
      });

      const { reply } = await sendTurn({text: assembled, stream_sid: this.streamSid});

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

wsserver.listen(HTTP_SERVER_PORT, function () { console.log("Server listening on: http://localhost:%s", HTTP_SERVER_PORT); });
