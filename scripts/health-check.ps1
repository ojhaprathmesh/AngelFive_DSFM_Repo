# Health Check Script for AngelFive DSFM Project
# This script checks the health of all running services

param(
    [switch]$Detailed,
    [switch]$Json,
    [int]$Timeout = 10
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
    if (-not $Json) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Test-ServiceHealth {
    param(
        [string]$Url,
        [string]$ServiceName,
        [int]$TimeoutSeconds = 10
    )
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec $TimeoutSeconds -ErrorAction Stop
        
        $result = @{
            Service = $ServiceName
            Url = $Url
            Status = "Healthy"
            ResponseTime = 0
            Details = $response
            Error = $null
        }
        
        return $result
    }
    catch {
        $result = @{
            Service = $ServiceName
            Url = $Url
            Status = "Unhealthy"
            ResponseTime = 0
            Details = $null
            Error = $_.Exception.Message
        }
        
        return $result
    }
}

function Test-Port {
    param(
        [string]$Host = "localhost",
        [int]$Port,
        [int]$TimeoutSeconds = 5
    )
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect($Host, $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne($TimeoutSeconds * 1000, $false)
        
        if ($wait) {
            $tcpClient.EndConnect($asyncResult)
            $tcpClient.Close()
            return $true
        } else {
            $tcpClient.Close()
            return $false
        }
    }
    catch {
        return $false
    }
}

try {
    $startTime = Get-Date
    
    if (-not $Json) {
        Write-ColorOutput "🏥 AngelFive DSFM Health Check" $Cyan
        Write-ColorOutput "================================================" $Cyan
    }
    
    # Define services to check
    $services = @(
        @{
            Name = "Backend API"
            Port = 5000
            HealthUrl = "http://localhost:5000/api/health"
            BaseUrl = "http://localhost:5000"
        },
        @{
            Name = "ML Service"
            Port = 8000
            HealthUrl = "http://localhost:8000/health"
            BaseUrl = "http://localhost:8000"
        },
        @{
            Name = "Frontend"
            Port = 3000
            HealthUrl = "http://localhost:3000"
            BaseUrl = "http://localhost:3000"
        }
    )
    
    $healthResults = @()
    $overallHealthy = $true
    
    foreach ($service in $services) {
        if (-not $Json) {
            Write-ColorOutput "🔍 Checking $($service.Name)..." $Yellow
        }
        
        # First check if port is open
        $portOpen = Test-Port -Port $service.Port -TimeoutSeconds 3
        
        if ($portOpen) {
            if (-not $Json) {
                Write-ColorOutput "✅ Port $($service.Port) is open" $Green
            }
            
            # Check health endpoint
            $healthResult = Test-ServiceHealth -Url $service.HealthUrl -ServiceName $service.Name -TimeoutSeconds $Timeout
            
            if ($healthResult.Status -eq "Healthy") {
                if (-not $Json) {
                    Write-ColorOutput "✅ $($service.Name) is healthy" $Green
                    if ($Detailed -and $healthResult.Details) {
                        Write-ColorOutput "   Details: $($healthResult.Details | ConvertTo-Json -Compress)" $Blue
                    }
                }
            } else {
                if (-not $Json) {
                    Write-ColorOutput "❌ $($service.Name) health check failed" $Red
                    Write-ColorOutput "   Error: $($healthResult.Error)" $Red
                }
                $overallHealthy = $false
            }
            
            $healthResult | Add-Member -NotePropertyName "PortOpen" -NotePropertyValue $true
        } else {
            if (-not $Json) {
                Write-ColorOutput "❌ Port $($service.Port) is not accessible" $Red
            }
            
            $healthResult = @{
                Service = $service.Name
                Url = $service.HealthUrl
                Status = "Unreachable"
                ResponseTime = 0
                Details = $null
                Error = "Port $($service.Port) is not accessible"
                PortOpen = $false
            }
            
            $overallHealthy = $false
        }
        
        $healthResults += $healthResult
        
        if (-not $Json) {
            Write-ColorOutput "" # Empty line for readability
        }
    }
    
    $endTime = Get-Date
    $totalTime = ($endTime - $startTime).TotalMilliseconds
    
    # Prepare summary
    $summary = @{
        OverallStatus = if ($overallHealthy) { "Healthy" } else { "Unhealthy" }
        CheckTime = $startTime.ToString("yyyy-MM-dd HH:mm:ss")
        TotalCheckTime = "$([math]::Round($totalTime, 2))ms"
        Services = $healthResults
        HealthyServices = ($healthResults | Where-Object { $_.Status -eq "Healthy" }).Count
        TotalServices = $healthResults.Count
    }
    
    if ($Json) {
        # Output JSON for programmatic use
        $summary | ConvertTo-Json -Depth 3
    } else {
        # Human-readable output
        Write-ColorOutput "================================================" $Cyan
        Write-ColorOutput "📊 Health Check Summary" $Cyan
        Write-ColorOutput "================================================" $Cyan
        
        if ($overallHealthy) {
            Write-ColorOutput "🎉 Overall Status: HEALTHY" $Green
        } else {
            Write-ColorOutput "⚠️  Overall Status: UNHEALTHY" $Red
        }
        
        Write-ColorOutput "📈 Services: $($summary.HealthyServices)/$($summary.TotalServices) healthy" $Blue
        Write-ColorOutput "⏱️  Check completed in: $($summary.TotalCheckTime)" $Blue
        Write-ColorOutput "🕐 Check time: $($summary.CheckTime)" $Blue
        
        Write-ColorOutput "================================================" $Cyan
        Write-ColorOutput "🌐 Service URLs:" $Cyan
        
        foreach ($service in $services) {
            $result = $healthResults | Where-Object { $_.Service -eq $service.Name }
            $status = if ($result.Status -eq "Healthy") { "✅" } else { "❌" }
            Write-ColorOutput "$status $($service.Name): $($service.BaseUrl)" $Blue
        }
        
        if (-not $overallHealthy) {
            Write-ColorOutput "================================================" $Cyan
            Write-ColorOutput "🔧 Troubleshooting:" $Yellow
            Write-ColorOutput "1. Check if services are running: Get-Process node,python" $Blue
            Write-ColorOutput "2. Start services: pnpm run dev" $Blue
            Write-ColorOutput "3. Check logs for errors" $Blue
            Write-ColorOutput "4. Verify ports are not blocked by firewall" $Blue
        }
        
        Write-ColorOutput "================================================" $Cyan
    }
    
    # Exit with appropriate code
    if ($overallHealthy) {
        exit 0
    } else {
        exit 1
    }
    
}
catch {
    if ($Json) {
        $errorResult = @{
            OverallStatus = "Error"
            Error = $_.Exception.Message
            CheckTime = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
        $errorResult | ConvertTo-Json
    } else {
        Write-ColorOutput "❌ Health check failed: $($_.Exception.Message)" $Red
    }
    exit 1
}