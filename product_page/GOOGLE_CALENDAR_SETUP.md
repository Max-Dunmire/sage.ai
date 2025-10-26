# Google Calendar Integration Setup

This guide will help you set up the live Google Calendar integration on the Sage.ai demo page.

## Prerequisites

- A Google Cloud Platform account
- A Google Calendar with events to display

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Sage AI Calendar")
5. Click "Create"

### 2. Enable the Google Calendar API

1. In the Google Cloud Console, make sure your new project is selected
2. Navigate to "APIs & Services" > "Library"
3. Search for "Google Calendar API"
4. Click on "Google Calendar API"
5. Click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted to configure the consent screen:
   - Click "Configure Consent Screen"
   - Choose "External" user type
   - Fill in the required fields:
     - App name: "Sage AI"
     - User support email: your email
     - Developer contact information: your email
   - Click "Save and Continue"
   - Skip adding scopes for now (click "Save and Continue")
   - Add test users if needed (click "Save and Continue")
   - Click "Back to Dashboard"
4. Go back to "Credentials" and click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Give it a name (e.g., "Sage AI Web Client")
7. Under "Authorized redirect URIs", add:
   - `http://localhost:8080/demo` (for development)
   - Your production domain + `/demo` (e.g., `https://yourdomain.com/demo`)
8. Click "Create"
9. Copy the "Client ID" that appears

### 4. Create an API Key (Optional)

While not strictly necessary for OAuth 2.0, having an API key can be useful:

1. In "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API key"
3. Copy the API key
4. Click "Restrict Key" and limit it to "Google Calendar API"

### 5. Configure Environment Variables

1. Open `/Users/davidveksler/Desktop/sage.ai/product_page/.env`
2. Replace the placeholder values:

```bash
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
VITE_GOOGLE_CALENDAR_API_KEY=your_actual_api_key_here
```

### 6. Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:8080/demo`

3. Scroll down to the "Calendar Integration" section

4. Click "Connect Google Calendar"

5. Sign in with your Google account

6. Grant permissions to access your calendar

7. You should see your calendar events displayed!

## Features

The calendar integration includes:

- **Interactive Calendar View**: Navigate through months with previous/next buttons
- **Event Highlighting**: Days with events show a small dot indicator
- **Date Selection**: Click any day to view events scheduled for that date
- **Event Details**: See event time, location, and video call links
- **Responsive Design**: Works beautifully on mobile and desktop
- **Theme Integration**: Matches the Sage green color scheme
- **Real-time Data**: Fetches live data from your Google Calendar

## Styling

The calendar component uses:
- Tailwind CSS utility classes
- Your existing sage green theme colors
- Shadcn-ui Card components for consistency
- Custom gradients (`bg-gradient-sage`, `bg-gradient-card`)
- Smooth animations (`animate-fade-in`, hover effects)

## Security Notes

- The OAuth 2.0 flow keeps your calendar data secure
- Access tokens are stored in localStorage
- Only read-only calendar permissions are requested
- Users can revoke access at any time in their Google Account settings

## Troubleshooting

### "Failed to fetch calendar events"
- Check that the Google Calendar API is enabled in your Google Cloud Console
- Verify your Client ID is correct in the `.env` file
- Make sure the redirect URI in Google Cloud Console matches your current URL

### "Unauthorized" or "Invalid credentials"
- Ensure you've added your development URL to the authorized redirect URIs
- Clear localStorage and try authenticating again
- Check that your Google Cloud project is in production mode (not testing mode) if deploying to production

### Calendar not showing events
- Make sure the Google account you're testing with actually has calendar events
- Check browser console for any error messages
- Verify network requests are succeeding in the Network tab

## Customization

You can customize the calendar by modifying `/Users/davidveksler/Desktop/sage.ai/product_page/src/components/GoogleCalendar.tsx`:

- Change the number of events displayed: Update the `maxResults` prop
- Modify the date range: Adjust the `timeMin` and `timeMax` in the `fetchEvents` function
- Change colors: Update Tailwind classes to use different theme colors
- Add more event details: Extend the event card display section

## Production Deployment

Before deploying to production:

1. Update the OAuth consent screen to production mode
2. Add your production domain to authorized redirect URIs
3. Update the `.env` file on your production server
4. Consider implementing token refresh logic for long-lived sessions
5. Add error tracking and analytics

## Support

For issues related to:
- Google Calendar API: Check [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- OAuth 2.0: See [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- Sage.ai integration: Contact your development team