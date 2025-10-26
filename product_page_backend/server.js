import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import userRoutes from './routes/user.js';
import { google } from 'googleapis';
import { readFileSync } from 'fs';

const app = express();

// Config
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const ORIGIN = process.env.CORS_ORIGIN || '*';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sage_ai';

// Middleware
app.use(cors({ origin: ORIGIN }));
app.use(express.json());

// Google Calendar API setup with Service Account
let auth;
let calendar;

try {
  // Load service account credentials
  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service-account-key.json';
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

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

// MongoDB Connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.get('/', (req, res) => {
    res.json({ ok: true, service: 'product_page_backend', message: 'Server is running' });
});

// User routes
app.use('/api/users', userRoutes);

// Google Calendar routes
// Get calendar events
app.get('/api/calendar/events', async (req, res) => {
    try {
        if (!calendar) {
            return res.status(503).json({
                success: false,
                error: 'Calendar service not initialized. Check service account configuration.'
            });
        }

        const { timeMin, timeMax, maxResults = 10 } = req.query;

        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            maxResults: parseInt(maxResults),
            singleEvents: true,
            orderBy: 'startTime',
        });

        res.json({
            success: true,
            events: response.data.items || [],
        });
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch calendar events'
        });
    }
});

// Create a new calendar event
app.post('/api/calendar/events', async (req, res) => {
    try {
        if (!calendar) {
            return res.status(503).json({
                success: false,
                error: 'Calendar service not initialized. Check service account configuration.'
            });
        }

        const { event } = req.body;

        if (!event || !event.summary || !event.start) {
            return res.status(400).json({ error: 'Event summary and start time required' });
        }

        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            requestBody: event,
        });

        res.json({
            success: true,
            event: response.data,
        });
    } catch (error) {
        console.error('Error creating calendar event:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create calendar event'
        });
    }
});

// Update a calendar event
app.put('/api/calendar/events/:eventId', async (req, res) => {
    try {
        if (!calendar) {
            return res.status(503).json({
                success: false,
                error: 'Calendar service not initialized. Check service account configuration.'
            });
        }

        const { eventId } = req.params;
        const { event } = req.body;

        const response = await calendar.events.update({
            calendarId: CALENDAR_ID,
            eventId: eventId,
            requestBody: event,
        });

        res.json({
            success: true,
            event: response.data,
        });
    } catch (error) {
        console.error('Error updating calendar event:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update calendar event'
        });
    }
});

// Delete a calendar event
app.delete('/api/calendar/events/:eventId', async (req, res) => {
    try {
        if (!calendar) {
            return res.status(503).json({
                success: false,
                error: 'Calendar service not initialized. Check service account configuration.'
            });
        }

        const { eventId } = req.params;

        await calendar.events.delete({
            calendarId: CALENDAR_ID,
            eventId: eventId,
        });

        res.json({
            success: true,
            message: 'Event deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete calendar event'
        });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start
app.listen(PORT, () => {
    console.log(`product_page_backend listening on port ${PORT}`);
});