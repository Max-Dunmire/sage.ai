// main.js
// Your app loop: message-in → scheduler → message-out

import readline from 'readline';
import { makeSession, handleTurn } from './runCalendar.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function receiveFromCall() {
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      resolve(answer);
    });
  });
}

function sendToCall(text) {
  // TODO: implement in your telephony layer
  console.log(text);
}

async function main() {
  // Obtain 1/2/3 from your upstream logic
  // e.g., selected = getQueueRoute(); // returns 1, 2, or 3
  const selected = 1; // Doctor by default for now

  const session = makeSession(selected);

  // Example: first message could arrive from your IVR before loop starts
  // const firstMsg = getInitialPrompt();
  // if (firstMsg) sendToCall(await handleTurn(session, firstMsg));

  const byeSet = new Set(['bye', 'goodbye', 'quit', 'exit', 'hang up', 'end call']);
  
  while (true) {
    const msg = await receiveFromCall();
    if (!msg) break;
    
    const reply = await handleTurn(session, msg);
    sendToCall(reply);
    
    if (byeSet.has(msg.trim().toLowerCase())) {
      break;
    }
  }
  
  rl.close();
}

main().catch(console.error);