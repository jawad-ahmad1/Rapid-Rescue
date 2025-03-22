@echo off
echo Starting Rapid Rescue development server...
echo.
cd /d "%~dp0"
echo Current directory: %CD%
echo.
echo Running npm install to ensure all dependencies are installed...
call npm install
echo.
echo Starting development server...
call npm run dev
echo.
if %ERRORLEVEL% NEQ 0 (
  echo Failed to start development server.
  echo Please make sure you have Node.js installed and try again.
  echo.
  echo If the problem persists, please contact the development team.
  pause
) else (
  echo Development server is running.
  echo Press Ctrl+C to stop the server.
) 