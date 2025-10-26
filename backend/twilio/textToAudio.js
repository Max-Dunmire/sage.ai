/**
 * Simple Fish Audio Text-to-Speech for Twilio
 * No external dependencies - uses only Node.js built-ins
 */

const https = require('https');

/**
 * Convert text to speech audio using Fish Audio API
 * Returns audio buffer in WAV format (Twilio compatible)
 * 
 * @param {string} text - The text to convert to speech
 * @param {string} apiKey - Your Fish Audio API key
 * @returns {Promise<Buffer>} Audio data as Buffer (WAV format)
 */
function textToAudio(text, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: text,
      format: 'wav'
    });

    const options = {
      hostname: 'api.fish.audio',
      path: '/v1/tts',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`Fish Audio API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

module.exports = textToAudio;

// Example usage:
// const textToAudio = require('./textToAudio');
// const audioBuffer = await textToAudio('Hello World', 'your-api-key');
// res.set('Content-Type', 'audio/wav');
// res.send(audioBuffer);
