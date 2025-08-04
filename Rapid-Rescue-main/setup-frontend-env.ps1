# Setup Frontend Environment Script
# This script will:
# 1. Create a virtual environment if it doesn't exist
# 2. Activate the virtual environment
# 3. Install all required packages for the frontend
# 4. Save a list of installed packages for future reference

# Define the log file
$logFile = "frontend-setup.log"

# Start logging
"Starting frontend environment setup at $(Get-Date)" | Out-File -FilePath $logFile

# Create .venv directory if it doesn't exist
if (!(Test-Path .venv)) {
    "Creating virtual environment..." | Tee-Object -FilePath $logFile -Append
    python -m venv .venv
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
    & .\.venv\Scripts\Activate.ps1
    "Virtual environment activated." | Tee-Object -FilePath $logFile -Append
} catch {
    "Failed to activate virtual environment: $_" | Tee-Object -FilePath $logFile -Append
    exit 1
}

# Install required packages
"Installing required packages..." | Tee-Object -FilePath $logFile -Append

# Create requirements.txt for frontend dependencies if it doesn't exist
if (!(Test-Path frontend-requirements.txt)) {
    @"
react@18.2.0
react-dom@18.2.0
react-router-dom@6.15.0
react-icons@4.10.1
react-bootstrap@2.8.0
bootstrap@5.3.1
axios@1.4.0
chart.js@4.3.3
react-chartjs-2@5.2.0
@react-google-maps/api@2.19.0
@fortawesome/fontawesome-free@6.4.2
"@ | Out-File -FilePath frontend-requirements.txt
    "Created frontend-requirements.txt" | Tee-Object -FilePath $logFile -Append
}

# Install npm packages using npm
"Installing npm packages..." | Tee-Object -FilePath $logFile -Append
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        "Failed to install packages with npm. Trying with specific dependencies..." | Tee-Object -FilePath $logFile -Append
        # Read each line from the requirements file and install individually
        foreach($line in Get-Content frontend-requirements.txt) {
            if ($line.Trim() -ne "") {
                "Installing $line..." | Tee-Object -FilePath $logFile -Append
                npm install $line --save
            }
        }
    }
    "NPM packages installed successfully." | Tee-Object -FilePath $logFile -Append
} catch {
    "Failed to install npm packages: $_" | Tee-Object -FilePath $logFile -Append
    exit 1
}

# Save the list of installed packages for future reference
"Saving installed packages list..." | Tee-Object -FilePath $logFile -Append
npm list --depth=0 > frontend-installed-packages.txt
"Package list saved to frontend-installed-packages.txt" | Tee-Object -FilePath $logFile -Append

# Setup complete
"Frontend environment setup completed successfully at $(Get-Date)" | Tee-Object -FilePath $logFile -Append
Write-Host "Frontend environment setup completed successfully." -ForegroundColor Green
Write-Host "You can now run 'npm run dev' to start the development server." -ForegroundColor Cyan 