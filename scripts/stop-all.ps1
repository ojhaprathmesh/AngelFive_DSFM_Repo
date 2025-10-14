# Stop All Services Script for AngelFive DSFM Project
# This script gracefully stops all running services

param(
    [switch]$Force,
    [switch]$Verbose
)

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

function Stop-ProcessByPort {
    param(
        [int]$Port,
        [string]$ServiceName
    )
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty OwningProcess | 
                    Sort-Object -Unique
        
        if ($processes) {
            foreach ($processId in $processes) {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    Write-ColorOutput "🛑 Stopping $ServiceName (PID: $processId, Port: $Port)" $Yellow
                    
                    if ($Force) {
                        Stop-Process -Id $processId -Force
                    } else {
                        Stop-Process -Id $processId
                    }
                    
                    Write-ColorOutput "✅ Stopped $ServiceName" $Green
                    return $true
                }
            }
        } else {
            Write-ColorOutput "ℹ️  No process found running on port $Port for $ServiceName" $Blue
            return $false
        }
    }
    catch {
        Write-ColorOutput "⚠️  Error stopping $ServiceName on port $Port`: $($_.Exception.Message)" $Yellow
        return $false
    }
}

function Stop-ProcessByName {
    param(
        [string]$ProcessName,
        [string]$ServiceName
    )
    
    try {
        $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
        
        if ($processes) {
            foreach ($process in $processes) {
                Write-ColorOutput "🛑 Stopping $ServiceName (PID: $($process.Id))" $Yellow
                
                if ($Force) {
                    Stop-Process -Id $process.Id -Force
                } else {
                    Stop-Process -Id $process.Id
                }
                
                Write-ColorOutput "✅ Stopped $ServiceName" $Green
            }
            return $true
        } else {
            Write-ColorOutput "ℹ️  No $ProcessName processes found for $ServiceName" $Blue
            return $false
        }
    }
    catch {
        Write-ColorOutput "⚠️  Error stopping $ServiceName`: $($_.Exception.Message)" $Yellow
        return $false
    }
}

try {
    Write-ColorOutput "🛑 Stopping AngelFive DSFM Services..." $Cyan
    Write-ColorOutput "================================================" $Cyan
    
    $stoppedServices = 0
    
    # Stop services by port
    $services = @(
        @{ Port = 3000; Name = "Frontend (React)" },
        @{ Port = 5000; Name = "Backend (Express)" },
        @{ Port = 8000; Name = "ML Service (Flask)" }
    )
    
    foreach ($service in $services) {
        if (Stop-ProcessByPort -Port $service.Port -ServiceName $service.Name) {
            $stoppedServices++
        }
    }
    
    # Stop common development processes
    $processNames = @(
        @{ Name = "node"; Service = "Node.js processes" },
        @{ Name = "python"; Service = "Python processes" },
        @{ Name = "flask"; Service = "Flask processes" }
    )
    
    foreach ($proc in $processNames) {
        if (Stop-ProcessByName -ProcessName $proc.Name -ServiceName $proc.Service) {
            $stoppedServices++
        }
    }
    
    # Stop pnpm/npm processes that might be running
    $packageManagers = @("pnpm", "npm", "yarn")
    foreach ($pm in $packageManagers) {
        Stop-ProcessByName -ProcessName $pm -ServiceName "$pm processes" | Out-Null
    }
    
    Write-ColorOutput "================================================" $Cyan
    
    if ($stoppedServices -gt 0) {
        Write-ColorOutput "✅ Successfully stopped $stoppedServices service(s)" $Green
    } else {
        Write-ColorOutput "ℹ️  No running services found to stop" $Blue
    }
    
    # Wait a moment for processes to fully terminate
    Start-Sleep -Seconds 2
    
    # Verify ports are free
    Write-ColorOutput "🔍 Verifying ports are free..." $Yellow
    
    $portsToCheck = @(3000, 5000, 8000)
    $allPortsFree = $true
    
    foreach ($port in $portsToCheck) {
        try {
            $connection = Test-NetConnection -ComputerName "localhost" -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
            if ($connection) {
                Write-ColorOutput "⚠️  Port $port is still in use" $Yellow
                $allPortsFree = $false
            } else {
                Write-ColorOutput "✅ Port $port is free" $Green
            }
        }
        catch {
            Write-ColorOutput "✅ Port $port is free" $Green
        }
    }
    
    Write-ColorOutput "================================================" $Cyan
    
    if ($allPortsFree) {
        Write-ColorOutput "🎉 All services stopped successfully!" $Green
        Write-ColorOutput "💡 You can now start services again with: pnpm run dev" $Blue
    } else {
        Write-ColorOutput "⚠️  Some ports may still be in use. You might need to:" $Yellow
        Write-ColorOutput "   - Wait a few more seconds for processes to fully terminate" $Blue
        Write-ColorOutput "   - Use the -Force parameter: .\scripts\stop-all.ps1 -Force" $Blue
        Write-ColorOutput "   - Restart your terminal or system if issues persist" $Blue
    }
    
}
catch {
    Write-ColorOutput "❌ Error stopping services: $($_.Exception.Message)" $Red
    Write-ColorOutput "💡 Try using the -Force parameter for forceful shutdown" $Yellow
    exit 1
}