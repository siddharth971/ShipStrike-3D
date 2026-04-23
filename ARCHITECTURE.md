# ShipStrike-3D Architecture

## Project Structure

This project is now fully separated into **Frontend** and **Backend** with independent codebases and deplo
ShipStrike-3D/
├── frontend/ # React/Vite Frontend
│ ├── src/ # Frontend source code
│ ├── public/ # Static assets
│ ├── package.json # Frontend dependencies
│ ├── vite.config.js # Vite configuration
│ └── .env.local # Frontend environment variables
│
├── server/ # Express + Socket.io Backend
│ ├── gameServer.js # Main server file
│ ├── package.json # Server dependencies
│ ├── database.js # Database layer
│ └── systems/ # Game logic modules
│
├── package.json # Root workspace configuration
└── README.md # This file

````

## Development

### Running Both Services Together

```bash
npm install              # Install dependencies for all packages
npm run dev:both        # Runs frontend (port 5173) + server (port 3000)
````

### Running Services Separately

**Frontend Only:**

```bash
cd frontend
npm install
npm run dev              # Runs on http://localhost:5173
```

**Server Only:**

```bash
cd server
npm install
npm run dev              # Runs on http://localhost:3000
```

## Communication Between Frontend and Backend

### Frontend → Server

- **WebSocket (Socket.io)**: Real-time game updates, player movements, combat
- **REST API**: Could be added for non-real-time endpoints
- **Connection URL**: Configured in `frontend/.env.local`
  ```
  VITE_SERVER_URL=http://localhost:3000
  ```

### Server Config

- CORS enabled for frontend (currently allows `*`, should be restricted in production)
- Socket.io transports: `websocket` + `polling`
- Server listens on port `3000` by default

## Environment Variables

### Frontend (`frontend/.env.local`)

```
VITE_SERVER_URL=http://localhost:3000    # Server URL for WebSocket connection
VITE_DEBUG=true                          # Debug mode
```

### Server (`server/.env` if needed)

- Uses `dotenv` for configuration
- Example: `PORT=3000`

## Building for Production

### Frontend Build

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Deployment

- **Frontend**: Deploy `frontend/dist/` to static hosting (Vercel, Netlify, etc.)
- **Server**: Deploy `server/` to Node.js hosting (Heroku, AWS, Railway, etc.)
- **Update `VITE_SERVER_URL`**: Point to production server URL

## Key Changes from Old Structure

✅ **Before**: Frontend and server were bundled together  
✅ **After**: Completely independent with separate:

- node_modules
- package.json files
- Development servers
- Build outputs
- Environment configuration

This allows:

- Independent scaling
- Separate deployments
- Clear separation of concerns
- Easier testing
- Better performance optimization

test
