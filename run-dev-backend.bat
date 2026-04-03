@echo off
REM ShipStrike-3D - Run Backend Only
REM This script starts only the backend on port 3000

echo ================================
echo  ShipStrike-3D Backend Dev
echo ================================
echo.
echo Starting Backend on http://localhost:3000
echo.

REM Install dependencies if needed
if not exist server\node_modules (
  echo Installing server dependencies...
  cd server
  call npm install
  cd ..
)

echo.
echo ================================
echo Starting Backend...
echo ================================
echo.

cd server
call npm run dev

pause
