// index.mjs
// npm i express twilio ws dotenv

import http from 'http';
import express from 'express';
import twilio from 'twilio';
import { WebSocketServer, WebSocket } from 'ws';

const { VoiceResponse } = twilio.twiml;
const DG_KEY = process.env.DEEPGRAM_API_KEY; // set this in your env

const app = express();
app.use(express.urlencoded({ extended: false }));

// 1) Twilio webhook returns bidirectional stream TwiML
app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();
  const streamUrl = process.env.STREAM_URL || 'wss://lucia-multiramous-cordelia.ngrok-free.dev/media-stream';
  twiml.connect().stream({ url: streamUrl });
  res.type('text/xml').send(twiml.toString());
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/media-stream' });

function log(...args) { console.log(new Date().toISOString(), ...args); }

// 2) For each Twilio WS connection, open a Deepgram WS and bridge audio
wss.on('connection', (twilioWS, req) => {
    log('Twilio connected from', req.socket.remoteAddress);
    let streamSid = null;

    let currentTurnText = '';          // collects interim text for the current user turn
    let lastEmittedPhrase = '';        // last phrase we printed/emitted (for dedupe)

    // --- Open Deepgram Flux WebSocket (client) ---
    const params = new URLSearchParams({
    model: 'flux-general-en',  // Flux model
    encoding: 'mulaw',         // we will send raw μ-law bytes
    sample_rate: '8000',       // Twilio sends 8kHz
    // Optional EOT tunables (tweak to taste):
    // eot_threshold: '0.6',
    // eot_timeout_ms: '1200',
    // eager_eot_threshold: '0.4',
  });

  const dgURL = `wss://api.deepgram.com/v2/listen?${params.toString()}`; // Flux v2 listen
  const dgWS = new WebSocket(dgURL, {
    headers: { Authorization: `Token ${DG_KEY}` }
  });

  dgWS.on('open', () => log('Deepgram WS: open'));
  dgWS.on('error', (e) => log('Deepgram WS: error', e.message));
  dgWS.on('close', (c, r) => log('Deepgram WS: close', c, r?.toString()));

  // Handle Deepgram messages (TurnInfo, Connected, errors)
  dgWS.on('message', (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch { return; }
    if (msg.type === 'Connected') {
      log('Deepgram WS: Connected', { request_id: msg.request_id });
    }

    if (msg.type === 'Error') {
      log('Deepgram Error:', msg.code, msg.description);
    }

    if (msg.type === 'TurnInfo') {
        // Many Flux responses place the running transcript in `transcript`.
        // Some payloads include fields like is_final / event. We rely on EndOfTurn.
        const text = (msg.transcript || '').trim();

        // Update our current buffer on any interim
        if (text) {
            currentTurnText = text;
        }

        // Emit EXACTLY ONCE per phrase when turn ends
        // Flux signals the end of a user utterance with event === 'EndOfTurn'
        if (msg.event === 'EndOfTurn') {
            const phrase = currentTurnText.trim();

            // Dedupe: only print if it's not empty and not the same as last emitted
            if (phrase && phrase !== lastEmittedPhrase) {
                console.log(`USER: ${phrase}`);
                lastEmittedPhrase = phrase;

                // TODO: Kick off your NLU/LLM + TTS pipeline here ONCE per phrase.
                // When TTS is ready, encode to μ-law 8k + base64 and send to Twilio:
                // sendMulawFramesToTwilio(twilioWS, streamSid, mulawBase64Frames);
            }

            // Reset buffer for the next turn
            currentTurnText = '';
        }
    }
  });
  // --- Twilio -> Deepgram: forward caller audio ---
  twilioWS.on('message', (raw) => {
    let data;
    try { data = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8')); }
    catch { return; }

    switch (data.event) {
      case 'start':
        streamSid = data.start?.streamSid;
        log('Twilio start', { callSid: data.start?.callSid, streamSid });
        break;

      case 'media': {
        // Twilio gives base64 μ-law @ 8kHz. Decode to bytes and send as BINARY frame to Deepgram.
        const mu = Buffer.from(data.media.payload, 'base64');
        if (dgWS.readyState === WebSocket.OPEN) {
          dgWS.send(mu, { binary: true });
        }
        break;
      }

      case 'stop':
        log('Twilio stop');
        // Politely close Deepgram stream
        if (dgWS.readyState === WebSocket.OPEN) {
          dgWS.send(JSON.stringify({ type: 'CloseStream' })); // optional per docs
          dgWS.close();
        }
        break;

      case 'connected':
      case 'mark':
      default:
        break;
    }
  });

  twilioWS.on('close', () => {
    log('Twilio WS closed');
    if (dgWS.readyState === WebSocket.OPEN) {
      dgWS.send(JSON.stringify({ type: 'CloseStream' }));
      dgWS.close();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => log(`HTTP+WS on :${PORT}`));
