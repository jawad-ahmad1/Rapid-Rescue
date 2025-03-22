@echo off
echo Starting Rapid Rescue development server...
echo.

rem Change to the script's directory
cd /d "%~dp0"
echo Current directory: %CD%
echo.

rem Run the development server
echo Starting development server...
npm run dev

rem If npm run dev fails, show instructions
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Failed to start the development server.
  echo.
  echo Please try running these commands manually:
  echo cd %CD%
  echo npm install
  echo npm run dev
  echo.
  echo If the problem persists, please contact the development team.
  pause
) 