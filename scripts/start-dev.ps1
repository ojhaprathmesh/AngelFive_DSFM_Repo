# Development Start Script for AngelFive DSFM Project
# This script starts all services in development mode with hot reloading

param(
    [switch]$Verbose,
    [switch]$SkipInstall
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

try {
    Write-ColorOutput "🚀 Starting AngelFive DSFM in Development Mode..." $Cyan
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
    
    # Install dependencies if not skipped
    if (-not $SkipInstall) {
        Write-ColorOutput "📦 Installing/updating dependencies..." $Yellow
        pnpm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install dependencies"
        }
    }
    
    # Setup Python environment for ML service
    Write-ColorOutput "🐍 Setting up ML service environment..." $Yellow
    Set-Location "ml-service"
    
    if (-not (Test-Path "venv")) {
        Write-ColorOutput "🐍 Creating Python virtual environment..." $Yellow
        python -m venv venv
    }
    
    # Activate virtual environment and install dependencies
    & "venv/Scripts/Activate.ps1"
    pip install -r requirements.txt --quiet
    deactivate
    
    Set-Location $projectRoot
    
    # Create .env files if they don't exist
    Write-ColorOutput "⚙️  Setting up environment files..." $Yellow
    
    $envFiles = @(
        @{ Path = ".env"; Example = ".env.example" },
        @{ Path = "backend/.env"; Example = "backend/.env.example" },
        @{ Path = "ml-service/.env"; Example = "ml-service/.env.example" }
    )
    
    foreach ($envFile in $envFiles) {
        if (-not (Test-Path $envFile.Path) -and (Test-Path $envFile.Example)) {
            Copy-Item $envFile.Example $envFile.Path
            Write-ColorOutput "📝 Created $($envFile.Path) from example" $Blue
        }
    }
    
    Write-ColorOutput "🚀 Starting development servers..." $Green
    Write-ColorOutput "================================================" $Cyan
    Write-ColorOutput "🔧 Backend:     http://localhost:5000 (with hot reload)" $Blue
    Write-ColorOutput "🧠 ML Service:  http://localhost:8000 (with auto-restart)" $Blue
    Write-ColorOutput "🌐 Frontend:    http://localhost:3000 (with hot reload)" $Blue
    Write-ColorOutput "================================================" $Cyan
    Write-ColorOutput "💡 All services will auto-reload on file changes" $Yellow
    Write-ColorOutput "💡 Press Ctrl+C to stop all services" $Yellow
    Write-ColorOutput "================================================" $Cyan
    
    # Start development services
    pnpm run dev
    
}
catch {
    Write-ColorOutput "❌ Error starting development services: $($_.Exception.Message)" $Red
    Write-ColorOutput "💡 Try running: pnpm run setup" $Yellow
    exit 1
}