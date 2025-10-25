# Fish Audio Text-to-Speech for Twilio

Simple JavaScript function to convert text to audio using Fish Audio API. Perfect for Twilio integration.

## Files

- `textToAudio-no-deps.js` - Main function (no dependencies needed!)
- `test.js` - Test script to try it out
- `package.json` - Project info
- `.gitignore` - Keeps secrets out of git
- `.env.example` - Template for your API key

## Quick Start

### 1. Get Your API Key
Get your Fish Audio API key from https://fish.audio

### 2. Create `.env` file
```bash
cp .env.example .env
```

Edit `.env` and add your key:
```
FISH_AUDIO_API_KEY=your_actual_api_key_here
```

### 3. Test It
```bash
node test.js
```

This will create `test-output.wav` that you can play!

## Usage in Your Code

```javascript
const textToAudio = require('./textToAudio-no-deps');

// Convert text to audio
const audioBuffer = await textToAudio('Hello World!', process.env.FISH_AUDIO_API_KEY);

// Use with Express/Twilio
res.set('Content-Type', 'audio/wav');
res.send(audioBuffer);
```

## For Twilio

The audio comes out as WAV format which works perfectly with Twilio - no MP3 conversion needed!

```javascript
// In your Twilio webhook
app.post('/voice', async (req, res) => {
  const audioBuffer = await textToAudio('Welcome to our service!', process.env.FISH_AUDIO_API_KEY);
  
  res.set('Content-Type', 'audio/wav');
  res.send(audioBuffer);
});
```

## No Dependencies!

This uses only Node.js built-in modules (`https` and `fs`). No npm packages required.

## Push to Git

```bash
git init
git add .
git commit -m "Initial commit"
git push
```

Your `.env` file with your API key won't be pushed (it's in `.gitignore`).

## License

MIT
