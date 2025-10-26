# Port Configuration Guide

This document outlines the port configuration for all services in the Sage.ai project.

## Service Ports

| Service | Port | Technology | Location | Purpose |
|---------|------|-----------|----------|---------|
| **Product Page (Frontend)** | 3000 | Vite/React | `/product_page/vite.config.ts` | Main web interface, runs in dev mode at `http://localhost:3000` |
| **Product Page Backend** | 3001 | Express.js | `/product_page_backend/.env` | REST API for user auth, MongoDB integration |
| **Python Backend** | 5001 | FastAPI | `/dev/twilio/scripts/sage.py` | AI conversation endpoint (`/turn`), handles Claude AI responses |
| **Twilio Server** | 8081 | Node.js + WebSocket | `/dev/twilio/server.js` | Twilio integration, WebSocket for phone calls, transcript API endpoints |

## Service Dependencies

```
Phone Call Flow:
Twilio (external) → Twilio Server (8081)
                    ↓ (WebSocket + HTTP)
              Deepgram API (external)
                    ↓ (Speech-to-Text)
              Twilio Server (8081)
                    ↓ (HTTP POST)
              Python Backend (5001) → Claude API
                    ↓ (Response)
              Twilio Server (8081) → Twilio (TTS + Audio)

Frontend Flow:
Browser → Product Page Frontend (3000)
                ↓
          Poll every 500ms
                ↓
          Twilio Server (8081) `/api/transcript`
                ↓ (JSON Response with live transcript)
          Display on Demo page
```

## Startup Instructions

Start all services in separate terminal windows:

```bash
# Terminal 1: Product Page Frontend (Vite)
cd /home/maxdu/Projects/sage_ai/product_page
npm run dev
# Runs on: http://localhost:3000

# Terminal 2: Product Page Backend (Express)
cd /home/maxdu/Projects/sage_ai/product_page_backend
npm start
# Runs on: http://localhost:3001

# Terminal 3: Python Backend (FastAPI)
cd /home/maxdu/Projects/sage_ai/dev/twilio
python scripts/sage.py
# Runs on: http://localhost:5001/turn

# Terminal 4: Twilio Server (Node.js)
cd /home/maxdu/Projects/sage_ai/dev/twilio
npm start
# Runs on: http://localhost:8081
```

## Environment Variables

### /dev/twilio/.env
```
DEEPGRAM_API_KEY=...
INTERNAL_SECRET=...
ANTHROPIC_API_KEY=...
PYTHON_BACKEND_PORT=5001
TWILIO_SERVER_PORT=8081
```

### /product_page_backend/.env
```
PORT=3001
MONGODB_URI=...
```

### /product_page/vite.config.ts
- Frontend port: 3000

## Important Notes

1. **Python Backend**: The FastAPI server in `sage.py` needs to be started separately with uvicorn or python directly. It listens on `http://127.0.0.1:5001`

2. **Twilio Server**: Calls `http://127.0.0.1:5001/turn` with internal secret header for security

3. **Demo Frontend**: Polls `http://localhost:8081/api/transcript` every 500ms to get live call transcripts

4. **Port Conflicts**: Each service has a unique port to avoid conflicts:
   - Frontend apps: 3000 (frontend), 3001 (backend)
   - Backends: 5001 (Python/AI), 8081 (Node/Twilio)

## Troubleshooting

If you see "Failed to connect to server" errors in the demo:
1. Make sure Twilio server is running on port 8081
2. Check that Python backend is running on port 5001
3. Verify no other services are using these ports: `lsof -i :8081` or `lsof -i :5001`

If Python backend 500 errors occur:
1. Ensure the INTERNAL_SECRET header is set correctly
2. Check that credentials files exist in `/dev/twilio/creds/`
3. Verify ANTHROPIC_API_KEY is valid in .env
