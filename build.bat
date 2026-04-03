@echo off
REM ShipStrike-3D - Build Frontend and Backend
REM This script builds the frontend and prepares backend for production

echo ================================
echo  ShipStrike-3D Build
echo ================================
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

echo.
echo ================================
echo Building Frontend...
echo ================================
echo.

cd frontend
call npm run build
cd ..

echo.
echo ================================
echo Build Complete!
echo ================================
echo.
echo Frontend built to: frontend\dist\
echo.
echo Next steps:
echo 1. Deploy frontend\dist\ to Vercel, Netlify, or your hosting
echo 2. Update frontend\.env.local with production server URL
echo 3. Deploy server\ to Railway, Heroku, or your Node.js hosting
echo.

pause
