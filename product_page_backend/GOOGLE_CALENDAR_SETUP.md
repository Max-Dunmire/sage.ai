# Google Calendar Integration Setup

This guide will help you set up Google Calendar integration using a service account to access a Google Calendar without OAuth redirects.

## Prerequisites

- A Google Cloud Platform account
- Access to a Google Calendar you want to sync

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Give your project a name (e.g., "Sage.ai Calendar")
4. Click "Create"

## Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on it and click **Enable**

## Step 3: Create a Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the details:
   - **Service account name**: `sage-calendar-service`
   - **Service account ID**: (auto-generated)
   - **Description**: "Service account for Sage.ai calendar access"
4. Click **Create and Continue**
5. Skip the optional steps and click **Done**

## Step 4: Create and Download Service Account Key

1. In **Credentials**, find your newly created service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** format
6. Click **Create**
7. The JSON key file will download automatically

## Step 5: Set Up the Service Account Key

1. Rename the downloaded JSON file to `service-account-key.json`
2. Place it in your `product_page_backend` directory:
   ```
   product_page_backend/
   ├── service-account-key.json  ← Place here
   ├── server.js
   ├── .env
   └── ...
   ```
3. **IMPORTANT**: Add `service-account-key.json` to `.gitignore` to keep it secure

## Step 6: Share Your Google Calendar with the Service Account

This is the crucial step to allow the service account to access your calendar:

1. Open the downloaded `service-account-key.json` file
2. Find the `client_email` field (looks like `sage-calendar-service@project-id.iam.gserviceaccount.com`)
3. Copy this email address
4. Go to [Google Calendar](https://calendar.google.com/)
5. Find the calendar you want to sync in the left sidebar
6. Click the three dots next to it > **Settings and sharing**
7. Scroll down to **Share with specific people**
8. Click **Add people**
9. Paste the service account email
10. Set permissions to **Make changes to events** (or **See all event details** for read-only)
11. Click **Send**

## Step 7: Get Your Calendar ID

1. In Google Calendar settings (same page as above)
2. Scroll down to **Integrate calendar**
3. Copy the **Calendar ID** (looks like `your-email@gmail.com` or `abc123@group.calendar.google.com`)
4. Update your `.env` file:
   ```env
   GOOGLE_CALENDAR_ID=your-calendar-id@gmail.com
   ```

## Step 8: Configure Environment Variables

Update your `product_page_backend/.env` file:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/sage_ai

# Google Calendar API Configuration
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json
GOOGLE_CALENDAR_ID=your-calendar-id@gmail.com
```

## Step 9: Test the Integration

1. Start the backend server:
   ```bash
   cd product_page_backend
   npm run dev
   ```

2. You should see:
   ```
   Google Calendar API initialized with service account
   ```

3. Test the API:
   ```bash
   curl http://localhost:3001/api/calendar/events
   ```

4. Start the frontend and navigate to the demo page to see your calendar!

## API Endpoints

Once configured, you can use these endpoints:

- `GET /api/calendar/events` - List calendar events
- `POST /api/calendar/events` - Create a new event
- `PUT /api/calendar/events/:eventId` - Update an event
- `DELETE /api/calendar/events/:eventId` - Delete an event

## Example: Creating an Event via API

```bash
curl -X POST http://localhost:3001/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "summary": "Meeting with Client",
      "description": "Discuss project requirements",
      "start": {
        "dateTime": "2025-10-27T10:00:00-07:00",
        "timeZone": "America/Los_Angeles"
      },
      "end": {
        "dateTime": "2025-10-27T11:00:00-07:00",
        "timeZone": "America/Los_Angeles"
      }
    }
  }'
```

## Troubleshooting

### "Calendar service not initialized"
- Check that `service-account-key.json` exists in the correct location
- Verify the JSON file is valid
- Check file permissions

### "403 Forbidden" or "Calendar not found"
- Make sure you shared the calendar with the service account email
- Verify the `GOOGLE_CALENDAR_ID` is correct
- Check that the service account has the correct permissions

### Events not showing
- Verify the calendar is shared with the service account
- Check the time range in your query
- Ensure events exist in the specified time range

## Security Notes

- **Never commit** `service-account-key.json` to version control
- Add it to `.gitignore` immediately
- Keep the service account key secure
- Limit service account permissions to only what's needed
- Rotate keys periodically for security