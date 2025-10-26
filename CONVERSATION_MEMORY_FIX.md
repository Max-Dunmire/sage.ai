# Conversation Memory Fix

## Problem
When you made multiple phone calls, the Claude AI was remembering previous conversations from earlier calls. This was happening because the Python backend was maintaining a single global `SESSION` object that persisted across all phone calls.

## Root Cause
In `/dev/twilio/scripts/sage.py`, there was a global SESSION created at startup:
```python
SESSION = SchedulerSession(persona=PERSONA)
```

This `SchedulerSession` maintains `self.messages = []` which stores the entire conversation history. Since this was a global object that never got reset, subsequent phone calls could see the previous conversation context.

## Solution
Implemented per-call session management:

### 1. Python Backend Changes (`sage.py`)
- Removed the global `SESSION` object
- Created `_active_sessions = {}` dictionary to store sessions per stream
- Each phone call gets a unique `stream_sid` that identifies that conversation
- When a `/turn` request comes in, it looks up or creates a session for that stream
- Added `/session/reset` endpoint to clear a session when a call ends

### 2. Twilio Server Changes (`server.js`)
- Updated the `close()` method to call the `/session/reset` endpoint on the Python backend
- When a Twilio connection closes (call ends), it resets the corresponding conversation session
- This ensures the next caller starts with a fresh, clean session

## How It Works

```
Call 1: Twilio → /turn (stream_sid=ABC123) → New session created → Conversation stored in _active_sessions[ABC123]
Call 1 ends: close() → /session/reset with stream_sid=ABC123 → Session deleted

Call 2: Twilio → /turn (stream_sid=XYZ789) → New session created → Conversation stored in _active_sessions[XYZ789]
Call 2 ends: close() → /session/reset with stream_sid=XYZ789 → Session deleted

Call 3: Twilio → /turn → No previous context!
```

## Testing
1. Make a phone call and have a conversation
2. Hang up
3. Call again immediately
4. The AI should NOT remember the previous conversation

## Benefits
- ✅ No conversation memory leakage between calls
- ✅ Conversation context maintained within a single call (natural conversation flow)
- ✅ Automatically cleans up old sessions when calls end
- ✅ Scalable: Can handle multiple concurrent calls without cross-contamination

## API Changes
The `/turn` endpoint now accepts an optional `stream_sid` field:
```json
{
  "text": "What time is my appointment?",
  "stream_sid": "ABC123"  // Optional: identifies which call this is for
}
```

If `stream_sid` is not provided, it defaults to "default" stream.
