# Quick Start Guide - Frontend & Backend Separation

## Directory Structure

```
ShipStrike-3D/
├── frontend/                    # Frontend (Vite + Three.js)
│   ├── src/                     # Source code
│   ├── public/                  # Static assets
│   ├── package.json
│   ├── vite.config.js
│   └── .env.local              # Server URL config
│
├── server/                      # Backend (Express + Socket.io)
│   ├── gameServer.js           # Main server
│   ├── package.json
│   └── systems/                # Game logic
│
└── package.json                 # Root workspace
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
# This installs for root, frontend, and server (via workspaces)
```

### 2. Run Development Mode

**Option A: Run Both Together**

```bash
npm run dev:both
# Frontend runs on http://localhost:5173
# Server runs on http://localhost:3000
```

**Option B: Run Individually**

```bash
# Terminal 1 - Frontend
npm run dev:frontend

# Terminal 2 - Server
npm run dev:server
```

## Configuration

### Frontend Server Connection

Edit `frontend/.env.local` to change the server URL:

```
VITE_SERVER_URL=http://localhost:3000
```

The frontend automatically connects using this URL when you call:

```javascript
networkManager.connect(); // Uses VITE_SERVER_URL
```

## What Changed

| Before                               | After                                    |
| ------------------------------------ | ---------------------------------------- |
| Server served frontend from `/dist`  | Frontend & server completely independent |
| Package.json mixed frontend & server | Separate package.json files              |
| Single Vite dev server               | Two independent dev servers              |
| Coupled deployment                   | Independent deployment                   |

## Common Commands

```bash
# Development
npm run dev:both              # Run everything
npm run dev:frontend          # Just frontend
npm run dev:server           # Just server

# Building
npm run build:frontend       # Build frontend to dist/
npm run build:server         # (No build needed for Node.js server)

# Production
cd frontend && npm run build  # Creates dist/ folder
# Deploy frontend/dist/ to static hosting + update VITE_SERVER_URL to prod server
```

## Next Steps

1. Verify frontend/server connection by checking browser console
2. Update `frontend/.env.local` with your production server URL
3. Deploy frontend to Vercel/Netlify
4. Deploy server to Railway/Heroku/AWS
