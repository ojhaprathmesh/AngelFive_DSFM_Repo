# Start All Services Script for AngelFive DSFM Project
# This script starts frontend, backend, and ml-service concurrently

param(
    [switch]$Production,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"
$Blue = "Blue"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-Port {
    param(
        [int]$Port,
        [string]$ServiceName
    )
    
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection
    }
    catch {
        return $false
    }
}

function Wait-ForService {
    param(
        [int]$Port,
        [string]$ServiceName,
        [int]$TimeoutSeconds = 60
    )
    
    Write-ColorOutput "⏳ Waiting for $ServiceName to start on port $Port..." $Yellow
    
    $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
    
    while ((Get-Date) -lt $timeout) {
        if (Test-Port -Port $Port -ServiceName $ServiceName) {
            Write-ColorOutput "✅ $ServiceName is ready on port $Port" $Green
            return $true
        }
        Start-Sleep -Seconds 2
    }
    
    Write-ColorOutput "❌ Timeout waiting for $ServiceName on port $Port" $Red
    return $false
}

# Main execution
try {
    Write-ColorOutput "🚀 Starting AngelFive DSFM Services..." $Cyan
    Write-ColorOutput "================================================" $Cyan
    
    # Change to project root directory
    $projectRoot = Split-Path -Parent $PSScriptRoot
    Set-Location $projectRoot
    
    Write-ColorOutput "📁 Project root: $projectRoot" $Blue
    
    # Check if pnpm is installed
    try {
        $pnpmVersion = pnpm --version
        Write-ColorOutput "📦 Using pnpm version: $pnpmVersion" $Blue
    }
    catch {
        Write-ColorOutput "❌ pnpm is not installed. Please install pnpm first." $Red
        Write-ColorOutput "   Run: npm install -g pnpm" $Yellow
        exit 1
    }
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules") -or -not (Test-Path "backend/node_modules") -or -not (Test-Path "frontend/node_modules")) {
        Write-ColorOutput "📦 Installing dependencies..." $Yellow
        pnpm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install dependencies"
        }
    }
    
    # Check Python for ML service
    try {
        $pythonVersion = python --version
        Write-ColorOutput "🐍 Using Python: $pythonVersion" $Blue
    }
    catch {
        Write-ColorOutput "❌ Python is not installed or not in PATH" $Red
        Write-ColorOutput "   Please install Python 3.8+ and add it to PATH" $Yellow
        exit 1
    }
    
    # Install Python dependencies for ML service
    if (-not (Test-Path "ml-service/venv")) {
        Write-ColorOutput "🐍 Setting up Python virtual environment..." $Yellow
        Set-Location "ml-service"
        python -m venv venv
        & "venv/Scripts/Activate.ps1"
        pip install -r requirements.txt
        deactivate
        Set-Location $projectRoot
    }
    
    # Determine script type
    $scriptType = if ($Production) { "start" } else { "dev" }
    Write-ColorOutput "🔧 Running in $($scriptType.ToUpper()) mode" $Blue
    
    # Start services using pnpm
    Write-ColorOutput "🚀 Starting all services..." $Green
    
    if ($Production) {
        # Build first in production mode
        Write-ColorOutput "🔨 Building services..." $Yellow
        pnpm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }
        
        # Start production services
        Start-Process -FilePath "pnpm" -ArgumentList "run", "start" -NoNewWindow
    }
    else {
        # Start development services
        Start-Process -FilePath "pnpm" -ArgumentList "run", "dev" -NoNewWindow
    }
    
    # Wait for services to be ready
    Write-ColorOutput "⏳ Waiting for services to start..." $Yellow
    Start-Sleep -Seconds 5
    
    # Check service health
    $backendReady = Wait-ForService -Port 5000 -ServiceName "Backend API" -TimeoutSeconds 30
    $mlServiceReady = Wait-ForService -Port 8000 -ServiceName "ML Service" -TimeoutSeconds 30
    $frontendReady = Wait-ForService -Port 3000 -ServiceName "Frontend" -TimeoutSeconds 45
    
    Write-ColorOutput "================================================" $Cyan
    Write-ColorOutput "🎉 Service Status Summary:" $Cyan
    Write-ColorOutput "================================================" $Cyan
    
    if ($backendReady) {
        Write-ColorOutput "✅ Backend API:     http://localhost:5000" $Green
        Write-ColorOutput "   Health Check:    http://localhost:5000/api/health" $Blue
    } else {
        Write-ColorOutput "❌ Backend API:     Failed to start" $Red
    }
    
    if ($mlServiceReady) {
        Write-ColorOutput "✅ ML Service:      http://localhost:8000" $Green
        Write-ColorOutput "   Health Check:    http://localhost:8000/health" $Blue
    } else {
        Write-ColorOutput "❌ ML Service:      Failed to start" $Red
    }
    
    if ($frontendReady) {
        Write-ColorOutput "✅ Frontend App:    http://localhost:3000" $Green
        Write-ColorOutput "   🌐 Open in browser: http://localhost:3000" $Cyan
    } else {
        Write-ColorOutput "❌ Frontend App:    Failed to start" $Red
    }
    
    Write-ColorOutput "================================================" $Cyan
    
    if ($backendReady -and $mlServiceReady -and $frontendReady) {
        Write-ColorOutput "🎉 All services are running successfully!" $Green
        Write-ColorOutput "🌐 Web App URL: http://localhost:3000" $Cyan
        Write-ColorOutput "📊 API Documentation: http://localhost:5000/api/health" $Blue
        Write-ColorOutput "🧠 ML Service: http://localhost:8000/health" $Blue
        
        # Open browser automatically
        Write-ColorOutput "🌐 Opening web browser..." $Yellow
        Start-Process "http://localhost:3000"
        
        Write-ColorOutput "💡 Press Ctrl+C to stop all services" $Yellow
    } else {
        Write-ColorOutput "⚠️  Some services failed to start. Check the logs above." $Yellow
        exit 1
    }
    
}
catch {
    Write-ColorOutput "❌ Error starting services: $($_.Exception.Message)" $Red
    Write-ColorOutput "💡 Try running the setup script first: pnpm run setup" $Yellow
    exit 1
}