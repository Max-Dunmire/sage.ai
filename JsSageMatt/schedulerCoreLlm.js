// schedulerCoreLlm.js
// Function-style. Secretary tone. LLM computes availability. Text-in → text-out.

import dotenv from 'dotenv';
import fs from 'fs/promises';
import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import { DateTime } from 'luxon';

dotenv.config({ path: 'Data.env' });

const USER_TZ = 'America/Los_Angeles';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const MODEL = 'claude-3-5-haiku-20241022';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('Set ANTHROPIC_API_KEY in your environment.');
}
const client = new Anthropic({ apiKey });

// ----- Google Calendar auth (using existing tokens) -----
async function getCalendarService(credentialsJsonPath, tokenJsonPath) {
  const credentials = JSON.parse(await fs.readFile(credentialsJsonPath, 'utf8'));
  const token = JSON.parse(await fs.readFile(tokenJsonPath, 'utf8'));
  
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  
  oAuth2Client.setCredentials(token);
  
  return google.calendar({ version: 'v3', auth: oAuth2Client });
}

// ----- Calendar tools (titles redacted) -----
async function listEventsBetween(svc, timeMinIso, timeMaxIso, tzname) {
  const response = await svc.events.list({
    calendarId: 'primary',
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: tzname
  });
  
  const items = response.data.items || [];
  const out = [];
  
  for (const e of items) {
    let s = e.start.dateTime || e.start.date;
    let end = e.end.dateTime || e.end.date;
    
    if (s.length === 10) s += 'T00:00:00';
    if (end.length === 10) end += 'T00:00:00';
    
    out.push({ start: s, end });
  }
  
  return out;
}

async function createEvent(svc, tzname, title, startIso, endIso, description = null, location = null) {
  const body = {
    summary: title,
    description: description || '',
    location: location || '',
    start: { dateTime: startIso, timeZone: tzname },
    end: { dateTime: endIso, timeZone: tzname }
  };
  
  const response = await svc.events.insert({
    calendarId: 'primary',
    resource: body
  });
  
  return {
    id: response.data.id,
    htmlLink: response.data.htmlLink
  };
}

// =======================================================================
// Public API
// =======================================================================

export class SchedulerSession {
  constructor(persona) {
    this.persona = persona;
    this.tzname = persona.tz || USER_TZ;
    this.svc = null;
    this._firstReplyDone = false;
    this.messages = [];
    this.tools = [
      {
        name: 'calendar_events_between',
        description: 'Return redacted events within [time_min, time_max). Use to fetch a whole week.',
        input_schema: {
          type: 'object',
          properties: {
            time_min: { type: 'string' },
            time_max: { type: 'string' },
            timezone: { type: 'string' }
          },
          required: ['time_min', 'time_max']
        }
      },
      {
        name: 'calendar_create_event',
        description: 'Create an event only after explicit user confirmation.',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            start: { type: 'string' },
            end: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            timezone: { type: 'string' }
          },
          required: ['title', 'start', 'end']
        }
      }
    ];
    
    // Initialize calendar service asynchronously
    this._initPromise = this._init();
  }
  
  async _init() {
    this.svc = await getCalendarService(
      this.persona.credentialsPath,
      this.persona.tokenPath
    );
  }
  
  _systemPrompt() {
    const ws = this.persona.workStart || '08:00';
    const we = this.persona.workEnd || '17:00';
    const greet = this.persona.greeting;
    const now = DateTime.now().setZone(this.tzname).toISO();
    
    return `You are a warm, efficient human secretary for the ${this.persona.label} persona.
Speak naturally and briefly. Friendly, not chatty.

Use the brand greeting only on your first reply: "${greet}"
Timezone: ${this.tzname}. Current datetime: ${now}.
Privacy: Never reveal event titles or metadata. Only time ranges.

Scheduling:
- Parse constraints like "after 3 pm next week" and duration.
- Compute next-week bounds: Monday 00:00 to the following Monday 00:00 in ${this.tzname}.
- Call calendar_events_between once for that week.
- Merge overlaps. Treat all-day as busy.
- Offer up to 5 exact options within ${ws}-${we} unless the user says otherwise, format: "Tue Oct 28, 3:00–3:30 PM".
- If the user picks one, restate and ask:
  Do you want me to book "<Day of the Week>, <Month> <Day>, <Year>, <Start Time> - <End Time> (<Length in Minutes>)"?
  Reply yes or no.
- Only after "yes", call calendar_create_event.
Keep replies short and human. Avoid lists unless offering slots.
`;
  }
  
  async _execTool(block) {
    if (block.name === 'calendar_events_between') {
      const tmin = block.input.time_min;
      const tmax = block.input.time_max;
      const tzname = block.input.timezone || this.tzname;
      const events = await listEventsBetween(this.svc, tmin, tmax, tzname);
      return { events, time_min: tmin, time_max: tmax, timezone: tzname };
    }
    
    if (block.name === 'calendar_create_event') {
      const title = block.input.title || this.persona.defaultTitle || 'Appointment';
      const start = block.input.start;
      const end = block.input.end;
      const tzname = block.input.timezone || this.tzname;
      const desc = block.input.description;
      const loc = block.input.location;
      
      const nowTz = DateTime.now().setZone(tzname);
      const startDt = DateTime.fromISO(start, { zone: tzname });
      
      if (startDt <= nowTz) {
        return { created: false, reason: 'past' };
      }
      
      const ev = await createEvent(this.svc, tzname, title, start, end, desc, loc);
      return { created: true, htmlLink: ev.htmlLink };
    }
    
    return { error: 'unknown_tool' };
  }
  
  async handle(userText) {
    // Wait for initialization to complete
    await this._initPromise;
    
    if (!this._firstReplyDone) {
      userText = `${this.persona.greeting} ${userText}`;
    }
    
    this.messages.push({ role: 'user', content: userText });
    
    for (let i = 0; i < 16; i++) {
      const resp = await client.messages.create({
        model: MODEL,
        system: this._systemPrompt(),
        max_tokens: 900,
        tools: this.tools,
        messages: this.messages
      });
      
      this.messages.push({ role: 'assistant', content: resp.content });
      
      const toolResults = [];
      let hadTool = false;
      
      for (const block of resp.content) {
        if (block.type === 'tool_use') {
          hadTool = true;
          const result = await this._execTool(block);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result)
          });
        }
      }
      
      if (hadTool) {
        this.messages.push({ role: 'user', content: toolResults });
        continue;
      }
      
      const out = resp.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join(' ')
        .trim() || '';
      
      this._firstReplyDone = true;
      return out;
    }
    
    this._firstReplyDone = true;
    return "Sorry, I couldn't complete that just now. Please try again.";
  }
}