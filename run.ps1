# RepoInsight - Single Command Startup
# This activates the venv and starts all services

Write-Host "🚀 RepoInsight Launcher" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Check if venv exists
if (-not (Test-Path "venv")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "   Please run: .\setup_venv.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Activate venv
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Check if model exists
Write-Host "📥 Checking for LLM model..." -ForegroundColor Yellow
if (-not (Test-Path "models\Llama-3.2-1B-Instruct-Q4_K_M.gguf")) {
    Write-Host "⚠️  Model not found. Downloading..." -ForegroundColor Yellow
    python download_model.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Model download failed!" -ForegroundColor Red
        Write-Host "   Please check your internet connection and try again." -ForegroundColor Yellow
        exit 1
    }
}
Write-Host "✅ Model ready" -ForegroundColor Green

# Check if Redis is running
Write-Host ""
Write-Host "🔍 Checking Redis..." -ForegroundColor Yellow
$redisRunning = Get-Process redis-server -ErrorAction SilentlyContinue
if (-not $redisRunning) {
    Write-Host "⚠️  Redis not running. Attempting to start..." -ForegroundColor Yellow
    Start-Process redis-server -WindowStyle Normal
    Start-Sleep -Seconds 2
}
Write-Host "✅ Redis ready" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Starting all services..." -ForegroundColor Cyan
Write-Host ""

# Start backend
Write-Host "📡 Starting Backend API..." -ForegroundColor Yellow
$projectPath = $PWD.Path
$backendCmd = "Write-Host '🔧 Backend API' -ForegroundColor Cyan; cd `"$projectPath`"; .\venv\Scripts\Activate.ps1; cd backend; uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal

Start-Sleep -Seconds 3

# Start worker
Write-Host "⚙️  Starting Worker..." -ForegroundColor Yellow
$workerCmd = "Write-Host '⚙️  Celery Worker' -ForegroundColor Cyan; cd `"$projectPath`"; .\venv\Scripts\Activate.ps1; cd backend; celery -A app.worker worker --loglevel=info -P solo"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $workerCmd -WindowStyle Normal

Start-Sleep -Seconds 2

# Start frontend
Write-Host "🎨 Starting Frontend..." -ForegroundColor Yellow
$frontendPath = Join-Path $projectPath "frontend"
$frontendCmd = "Write-Host '🎨 Next.js Frontend' -ForegroundColor Cyan; cd `"$frontendPath`"; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal

Write-Host ""
Write-Host "✨ All services started!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "📋 Each service is running in its own terminal window." -ForegroundColor Gray
Write-Host "   Close those windows to stop the services." -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit this launcher..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
