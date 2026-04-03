@echo off
REM ShipStrike-3D - Run Both Frontend and Backend
REM This script starts both the frontend (port 5173) and backend (port 3000)

echo ================================
echo  ShipStrike-3D Dev Server
echo ================================
echo.
echo Starting Frontend (port 5173) and Backend (port 3000)...
echo.

REM Install dependencies if needed
if not exist node_modules (
  echo Installing root dependencies...
  call npm install
)

if not exist frontend\node_modules (
  echo Installing frontend dependencies...
  cd frontend
  call npm install
  cd ..
)

if not exist server\node_modules (
  echo Installing server dependencies...
  cd server
  call npm install
  cd ..
)

echo.
echo ================================
echo Starting services...
echo ================================
echo.

REM Run both services with concurrently
call npm run dev:both

pause
