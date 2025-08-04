# Setup Backend Environment Script
# This script will:
# 1. Create a virtual environment if it doesn't exist
# 2. Activate the virtual environment
# 3. Install all required packages for the backend
# 4. Save a list of installed packages for future reference

# Define the log file
$logFile = "backend-setup.log"

# Start logging
"Starting backend environment setup at $(Get-Date)" | Out-File -FilePath $logFile

# Create venv directory if it doesn't exist
if (!(Test-Path venv)) {
    "Creating virtual environment..." | Tee-Object -FilePath $logFile -Append
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        "Failed to create virtual environment. See $logFile for details." | Tee-Object -FilePath $logFile -Append
        exit 1
    }
    "Virtual environment created successfully." | Tee-Object -FilePath $logFile -Append
} else {
    "Virtual environment already exists." | Tee-Object -FilePath $logFile -Append
}

# Activate the virtual environment
"Activating virtual environment..." | Tee-Object -FilePath $logFile -Append
try {
    & .\venv\Scripts\Activate.ps1
    "Virtual environment activated." | Tee-Object -FilePath $logFile -Append
} catch {
    "Failed to activate virtual environment: $_" | Tee-Object -FilePath $logFile -Append
    exit 1
}

# Install required packages from requirements.txt
"Installing required packages from requirements.txt..." | Tee-Object -FilePath $logFile -Append
if (Test-Path requirements.txt) {
    try {
        pip install -r requirements.txt
        if ($LASTEXITCODE -ne 0) {
            "Failed to install packages from requirements.txt. See $logFile for details." | Tee-Object -FilePath $logFile -Append
            exit 1
        }
        "Packages installed successfully." | Tee-Object -FilePath $logFile -Append
    } catch {
        "Error installing packages: $_" | Tee-Object -FilePath $logFile -Append
        exit 1
    }
} else {
    "requirements.txt not found. Creating a default one..." | Tee-Object -FilePath $logFile -Append
    
    @"
Django==5.1.4
djangorestframework==3.15.0
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.2.0
PyJWT==2.8.0
pydantic==2.4.2
python-dotenv==1.0.0
whitenoise==6.4.0
gunicorn==21.2.0
"@ | Out-File -FilePath requirements.txt
    
    "Created default requirements.txt. Installing packages..." | Tee-Object -FilePath $logFile -Append
    
    try {
        pip install -r requirements.txt
        if ($LASTEXITCODE -ne 0) {
            "Failed to install packages from requirements.txt. See $logFile for details." | Tee-Object -FilePath $logFile -Append
            exit 1
        }
        "Packages installed successfully." | Tee-Object -FilePath $logFile -Append
    } catch {
        "Error installing packages: $_" | Tee-Object -FilePath $logFile -Append
        exit 1
    }
}

# Save the list of installed packages for future reference
"Saving installed packages list..." | Tee-Object -FilePath $logFile -Append
pip freeze > backend-installed-packages.txt
"Package list saved to backend-installed-packages.txt" | Tee-Object -FilePath $logFile -Append

# Apply migrations if manage.py exists
if (Test-Path manage.py) {
    "Applying database migrations..." | Tee-Object -FilePath $logFile -Append
    try {
        python manage.py migrate
        if ($LASTEXITCODE -ne 0) {
            "Failed to apply migrations. See $logFile for details." | Tee-Object -FilePath $logFile -Append
            exit 1
        }
        "Migrations applied successfully." | Tee-Object -FilePath $logFile -Append
    } catch {
        "Error applying migrations: $_" | Tee-Object -FilePath $logFile -Append
        exit 1
    }
} else {
    "manage.py not found. Skipping migrations." | Tee-Object -FilePath $logFile -Append
}

# Setup complete
"Backend environment setup completed successfully at $(Get-Date)" | Tee-Object -FilePath $logFile -Append
Write-Host "Backend environment setup completed successfully." -ForegroundColor Green
Write-Host "You can now run 'python manage.py runserver' to start the development server." -ForegroundColor Cyan 