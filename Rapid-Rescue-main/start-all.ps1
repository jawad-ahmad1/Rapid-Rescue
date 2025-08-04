# Start All Servers Script
# This script will:
# 1. Start the backend server in a new window
# 2. Start the frontend server in this window

# Set working directory correctly
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

Write-Host "Starting All Servers for Rapid Rescue Application..." -ForegroundColor Magenta
Write-Host "Current working directory: $PWD" -ForegroundColor Cyan

# Check if the backend directory exists
if (!(Test-Path .\backend)) {
    Write-Host "Backend directory not found. Make sure you're in the correct directory." -ForegroundColor Red
    exit 1
}

# Start backend server in a new window
Write-Host "Starting backend server in a new window..." -ForegroundColor Cyan
try {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\backend'; & .\start-backend.ps1"
    Write-Host "Backend server starting in a new window." -ForegroundColor Green
} catch {
    Write-Host "Failed to start backend server: $_" -ForegroundColor Red
    exit 1
}

# Wait a moment for the backend to start
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start frontend server in the current window
Write-Host "Starting frontend server in the current window..." -ForegroundColor Cyan
try {
    & .\start-frontend.ps1
} catch {
    Write-Host "Failed to start frontend server: $_" -ForegroundColor Red
    exit 1
} 