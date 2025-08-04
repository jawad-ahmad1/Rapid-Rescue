# Start Backend Development Server Script
# This script will:
# 1. Activate the virtual environment
# 2. Start the backend development server

# Check if the virtual environment exists
if (!(Test-Path venv)) {
    Write-Host "Virtual environment not found. Running setup script first..." -ForegroundColor Yellow
    & .\setup-backend-env.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Setup failed. Please check the logs and try again." -ForegroundColor Red
        exit 1
    }
} else {
    # Activate the virtual environment
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    try {
        & .\venv\Scripts\Activate.ps1
        Write-Host "Virtual environment activated." -ForegroundColor Green
    } catch {
        Write-Host "Failed to activate virtual environment: $_" -ForegroundColor Red
        exit 1
    }
}

# Check if manage.py exists
if (!(Test-Path manage.py)) {
    Write-Host "manage.py not found. Make sure you're in the correct directory." -ForegroundColor Red
    exit 1
}

# Apply migrations
Write-Host "Applying database migrations..." -ForegroundColor Cyan
try {
    python manage.py migrate
} catch {
    Write-Host "Failed to apply migrations: $_" -ForegroundColor Red
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}

# Start the development server
Write-Host "Starting backend development server..." -ForegroundColor Cyan
try {
    python manage.py runserver
} catch {
    Write-Host "Failed to start development server: $_" -ForegroundColor Red
    exit 1
} 