// runCalendar.js
// Persona factory + thin wrappers for your main loop

import { SchedulerSession } from './schedulerCoreLlm.js';

const PERSONAS = {
  '1': {
    label: 'Doctor',
    greeting: "Hello, this is Dr. Khan's office.",
    defaultTitle: "Doctor's Appointment",
    workStart: '08:00',
    workEnd: '17:00',
    credentialsPath: 'creds/doctor/credentials.json',
    tokenPath: 'creds/doctor/token.json',
    tz: 'America/Los_Angeles'
  },
  '2': {
    label: 'Hair Stylist',
    greeting: 'Hi, this is Golden Shears Salon.',
    defaultTitle: 'Haircut',
    workStart: '09:00',
    workEnd: '19:00',
    credentialsPath: 'creds/hair/credentials.json',
    tokenPath: 'creds/hair/token.json',
    tz: 'America/Los_Angeles'
  },
  '3': {
    label: 'Academic Counsellor',
    greeting: 'Hello, Academic Counseling Office speaking.',
    defaultTitle: 'Advising Session',
    workStart: '09:00',
    workEnd: '17:00',
    credentialsPath: 'creds/counsellor/credentials.json',
    tokenPath: 'creds/counsellor/token.json',
    tz: 'America/Los_Angeles'
  }
};

export function makeSession(choice) {
  const key = String(choice).trim();
  const persona = PERSONAS[key];
  if (!persona) {
    throw new Error('choice must be 1, 2, or 3');
  }
  return new SchedulerSession(persona);
}

export async function handleTurn(session, userText) {
  return await session.handle(userText);
}