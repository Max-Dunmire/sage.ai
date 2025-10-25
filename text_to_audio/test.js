/**
 * Test script for Fish Audio Text-to-Speech
 * Run this to test converting text to audio
 */

const textToAudio = require('./textToAudio-no-deps');
const fs = require('fs');

// YOUR CONFIGURATION
const API_KEY = '368e6453a47b437aaab60fb35d13b3e5';  // Put your API key here
const TEXT = 'Hello! This is a test of Fish Audio text to speech.';  // Change this text

async function test() {
  console.log('🎤 Testing Fish Audio Text-to-Speech...\n');
  console.log(`Text: "${TEXT}"`);
  console.log('Converting to audio...\n');

  try {
    // Convert text to audio
    const audioBuffer = await textToAudio(TEXT, API_KEY);
    
    console.log(`✅ Success! Generated ${audioBuffer.length} bytes of audio`);
    
    // Save to file so you can listen to it
    const filename = 'test-output.wav';
    fs.writeFileSync(filename, audioBuffer);
    
    console.log(`💾 Audio saved to: ${filename}`);
    console.log('\nYou can now:');
    console.log('1. Play the file to hear the audio');
    console.log('2. Use this audioBuffer with Twilio');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure:');
    console.log('1. Your API key is correct');
    console.log('2. You have internet connection');
    console.log('3. Your Fish Audio account has credits');
  }
}

// Run the test
test();
