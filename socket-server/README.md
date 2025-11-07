# QuizWeb Socket.io Server

Standalone Socket.io server for QuizWeb real-time features. This server handles WebSocket connections for quiz sessions, participant joins, and real-time updates.

## Why a Separate Server?

Vercel (where the Next.js app is deployed) uses serverless functions that don't support persistent WebSocket connections. This standalone server can be deployed to platforms that support persistent connections (Railway, Render, DigitalOcean, etc.).

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (optional for local dev):
```bash
# .env file
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,https://pubquiz-iota.vercel.app
```

3. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:3001` with Socket.io at `/api/socket`.

### Production Deployment

#### Option 1: Railway (Recommended - Easy & Free Tier Available)

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repo or deploy from this directory
4. Add environment variables:
   - `ALLOWED_ORIGINS`: Your Vercel app URL (e.g., `https://pubquiz-iota.vercel.app`)
   - `PORT`: Railway sets this automatically
5. Deploy!

After deployment, Railway will give you a URL like `https://your-app.railway.app`. Use this as your `NEXT_PUBLIC_SOCKET_URL` in Vercel.

#### Option 2: Render

1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your repo
4. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add environment variables:
   - `ALLOWED_ORIGINS`: Your Vercel app URL
6. Deploy!

#### Option 3: DigitalOcean App Platform

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Create a new App
3. Connect your repo
4. Configure as Node.js app
5. Add environment variables
6. Deploy!

## Environment Variables

- `PORT` (optional): Server port (default: 3001)
- `HOST` (optional): Server host (default: 0.0.0.0)
- `ALLOWED_ORIGINS` (required in production): Comma-separated list of allowed origins for CORS
  - Example: `https://pubquiz-iota.vercel.app,https://www.yourdomain.com`

## Health Check

The server exposes a health check endpoint at `/health`:

```bash
curl http://localhost:3001/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "connections": 5
}
```

## Connecting from Next.js App

In your Vercel project settings, add the environment variable:

```
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.railway.app
```

The Next.js app will automatically connect to this server instead of trying to use the local server.

## Socket Events

### Client → Server

- `join-session` - Join a quiz session room
- `leave-session` - Leave a quiz session room
- `participant-join` - Participant joins quiz
- `start-quiz` - Host starts the quiz
- `question-changed` - Host moves to next question
- `submit-answer` - Participant submits an answer
- `show-answers` - Host reveals correct answers

### Server → Client

- `participant-joined` - Broadcast when participant joins
- `quiz-started` - Broadcast when quiz starts
- `question-changed` - Broadcast when question changes
- `answer-received` - Send to host when answer submitted
- `show-answers` - Broadcast to show answers

## Monitoring

Check server logs for connection status and events. The server logs:
- Client connections/disconnections
- Session joins/leaves
- All socket events

## Troubleshooting

### Connection fails
- Check `ALLOWED_ORIGINS` includes your Next.js app URL
- Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly in Vercel
- Check server logs for errors

### CORS errors
- Ensure your production URL is in `ALLOWED_ORIGINS`
- Check that the URL matches exactly (including https://)

### High latency
- Consider deploying to a region closer to your users
- Railway and Render have multiple regions available

