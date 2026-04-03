@echo off
REM ShipStrike-3D - Run Frontend Only
REM This script starts only the frontend on port 5173

echo ================================
echo  ShipStrike-3D Frontend Dev
echo ================================
echo.
echo Starting Frontend on http://localhost:5173
echo.

REM Install dependencies if needed
if not exist frontend\node_modules (
  echo Installing frontend dependencies...
  cd frontend
  call npm install
  cd ..
)

echo.
echo ================================
echo Starting Frontend...
echo ================================
echo.

cd frontend
call npm run dev

pause
