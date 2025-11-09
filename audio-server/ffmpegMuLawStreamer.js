// ffmpegMuLawStreamer.js
const { spawn } = require('child_process');

/**
 * Convert a WAV buffer to G.711 μ-law 8k and stream it to Twilio at phone pace.
 *
 * @param {WebSocket} ws - Your already-open Twilio BidiStream websocket.
 * @param {string} streamSid - The streamSid Twilio gave you in the "start" event.
 * @param {Buffer} wavBuffer - PCM WAV from your TTS (Fish Audio).
 * @param {object} [opts]
 * @param {string} [opts.ffmpegPath='ffmpeg'] - Path to ffmpeg binary.
 * @param {boolean} [opts.useMarks=false] - If true, send marks periodically for flow control.
 * @param {number} [opts.markEveryFrames=50] - How many 20ms frames between marks (~1s at 50).
 * @returns {Promise<void>}
 */
async function streamWavViaFfmpeg(ws, streamSid, wavBuffer, opts = {}) {
  const {
    ffmpegPath = 'ffmpeg',
    useMarks = false,
    markEveryFrames = 50,
  } = opts;

  // Build ffmpeg args:
  // -i pipe:0                     → read WAV from stdin
  // -ac 1 -ar 8000                → mono 8kHz
  // -af "<filters>"               → HP/LP + soxr + loudnorm
  // -f mulaw -acodec pcm_mulaw    → raw μ-law bytes to stdout
  const filter =
    'highpass=f=100,lowpass=f=3400,aresample=resampler=soxr:osf=s16,loudnorm=I=-20:LRA=7:TP=-3';

  const args = [
    '-hide_banner', '-loglevel', 'error',
    '-i', 'pipe:0',
    '-ac', '1',
    '-ar', '8000',
    '-af', filter,
    '-f', 'mulaw',
    '-acodec', 'pcm_mulaw',
    'pipe:1',
  ];

  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'inherit'] });

  // Feed the WAV buffer into ffmpeg
  ff.stdin.write(wavBuffer);
  ff.stdin.end();

  // We’ll read stdout as a continuous mulaw byte stream,
  // chunk it into 160-byte frames, base64, and pace-send at 20ms/frame.
  const FRAME_BYTES = 160; // 20ms @ 8kHz μ-law
  let carry = Buffer.alloc(0);
  let frameCount = 0;

  // Optional: small lead-in silence to avoid first-phoneme cut-in (100ms = 5 frames)
  await sendSilence(ws, streamSid, 5);

  const sendFrame = (raw160) => {
    const payload = raw160.toString('base64');
    ws.sendUTF(JSON.stringify({
      event: 'media',
      streamSid,
      media: { payload, track: 'outbound' },
    }));
  };

  // Pace helper (20 ms)
  const sleep20 = () => new Promise(r => setTimeout(r, 20));

  // If you enable marks, you can send one every N frames and wait
  // for the echo to throttle (optional; simple pacing usually suffices).
  const sendMark = (name) => {
    ws.sendUTF(JSON.stringify({
      event: 'mark',
      streamSid,
      mark: { name }
    }));
  };

  // Collect stdout in small paced frames
  const reader = new Promise((resolve, reject) => {
        ff.stdout.on('data', async (chunk) => {
        carry = Buffer.concat([carry, chunk]);

        // Emit as many 160-byte frames as we can, pacing each
        while (carry.length >= FRAME_BYTES) {
            const frame = carry.subarray(0, FRAME_BYTES);
            carry = carry.subarray(FRAME_BYTES);

            sendFrame(frame);
            frameCount++;

            if (useMarks && frameCount % markEveryFrames === 0) {
            sendMark(`out-${frameCount}`);
            // You *can* wait for the mark echo event from Twilio here before continuing
            // for stricter backpressure; many apps just keep the simple 20ms pacing.
            }

            // Pace at 20ms/frame
            // (If your event loop is busy, consider precise timers or a queue + setInterval)
            // eslint-disable-next-line no-await-in-loop
            await sleep20();
        }
        });

        ff.stdout.once('end', resolve);
        ff.once('error', reject);
        ff.once('close', (code) => {
        if (code !== 0) {
            reject(new Error(`ffmpeg exited with code ${code}`));
        } else {
            resolve();
        }
        });
    });

    await reader;

    // Drain any leftover bytes, padding the final short frame with μ-law silence
    while (carry.length > 0) {
    let frame = carry.subarray(0, FRAME_BYTES);
    carry = carry.subarray(Math.min(FRAME_BYTES, carry.length));

    if (frame.length < FRAME_BYTES) {
        // final partial frame → pad with μ-law silence (0xFF)
        const pad = Buffer.alloc(FRAME_BYTES - frame.length, 0xFF);
        frame = Buffer.concat([frame, pad]);
    }

    sendFrame(frame);
    // eslint-disable-next-line no-await-in-loop
    await sleep20();
}

}

/** Send N frames of μ-law silence (0xFF) at 20ms pace. */
async function sendSilence(ws, streamSid, frames = 5) {
  const FRAME_BYTES = 160;
  const silenceFrame = Buffer.alloc(FRAME_BYTES, 0xFF);
  for (let i = 0; i < frames; i++) {
    ws.sendUTF(JSON.stringify({
      event: 'media',
      streamSid,
      media: { payload: silenceFrame.toString('base64'), track: 'outbound' },
    }));
    // 20ms per frame
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 20));
  }
}

module.exports = { streamWavViaFfmpeg };
