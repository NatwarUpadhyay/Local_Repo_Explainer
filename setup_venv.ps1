# Setup Virtual Environment for RepoInsight
# Run this ONCE to set up the project

Write-Host "🚀 RepoInsight Setup Script" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "📌 Checking Python installation..." -ForegroundColor Yellow
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "❌ Python not found! Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

$pythonVersion = python --version
Write-Host "✅ Found: $pythonVersion" -ForegroundColor Green

# Check Node.js
Write-Host "📌 Checking Node.js installation..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "✅ Found Node.js: $nodeVersion" -ForegroundColor Green

# Check Redis
Write-Host "📌 Checking Redis installation..." -ForegroundColor Yellow
$redisCmd = Get-Command redis-server -ErrorAction SilentlyContinue
if (-not $redisCmd) {
    Write-Host "⚠️  Redis not found. Please install Redis or use Docker." -ForegroundColor Yellow
    Write-Host "   Download from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor Yellow
} else {
    Write-Host "✅ Found Redis" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow

# Create venv
if (Test-Path "venv") {
    Write-Host "⚠️  Virtual environment already exists. Removing old one..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force venv
}

python -m venv venv
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create virtual environment!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Virtual environment created" -ForegroundColor Green

# Activate venv
Write-Host ""
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host ""
Write-Host "📦 Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install backend dependencies
Write-Host ""
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
pip install -r backend\requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green

# Install worker dependencies
Write-Host ""
Write-Host "📦 Installing worker dependencies..." -ForegroundColor Yellow
pip install -r worker\requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install worker dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Worker dependencies installed" -ForegroundColor Green

# Install CLI dependencies
if (Test-Path "cli\requirements.txt") {
    Write-Host ""
    Write-Host "📦 Installing CLI dependencies..." -ForegroundColor Yellow
    pip install -r cli\requirements.txt
    Write-Host "✅ CLI dependencies installed" -ForegroundColor Green
}

# Install llama-cpp-python (for local LLM)
Write-Host ""
Write-Host "📦 Installing llama-cpp-python..." -ForegroundColor Yellow
pip install llama-cpp-python
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: llama-cpp-python installation had issues. Will try again during runtime." -ForegroundColor Yellow
} else {
    Write-Host "✅ llama-cpp-python installed" -ForegroundColor Green
}

# Install frontend dependencies
Write-Host ""
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green

# Download model
Write-Host ""
Write-Host "📥 Checking for LLM model..." -ForegroundColor Yellow
if (Test-Path "models\Llama-3.2-1B-Instruct-Q4_K_M.gguf") {
    Write-Host "✅ Model already exists, skipping download" -ForegroundColor Green
} else {
    Write-Host "📥 Downloading LLM model (this may take a few minutes)..." -ForegroundColor Yellow
    python download_model.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Model download failed. You can download it manually later." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Model downloaded successfully" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✨ Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Close this terminal" -ForegroundColor White
Write-Host "  2. Run: .\run.ps1" -ForegroundColor White
Write-Host "     (This starts all services)" -ForegroundColor Gray
Write-Host ""
Write-Host "Or in VS Code:" -ForegroundColor Cyan
Write-Host "  Press Ctrl+Shift+B and select 'Start All Services (venv)'" -ForegroundColor White
Write-Host ""
