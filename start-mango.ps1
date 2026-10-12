$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = $PSScriptRoot
$statusFile = Join-Path $root '.mango-startup-status'
function Set-StartupStatus {
    param([string]$Value)
    try { Set-Content -LiteralPath $statusFile -Value $Value -Encoding UTF8 } catch { }
}
Set-StartupStatus 'FRONTEND_BUILDING'
if (-not (Test-Path (Join-Path $root 'backend\pom.xml')) -or -not (Test-Path (Join-Path $root 'frontend\package.json'))) {
    Write-Host 'Open/run this launcher from the project root containing both backend and frontend.' -ForegroundColor Red
    exit 1
}

Write-Host 'MANGO | Spring Boot + React | Single HTTPS URL' -ForegroundColor Green
Write-Host 'Step 1/2: Build React and copy it into Spring Boot static resources.' -ForegroundColor Cyan
& (Join-Path $root 'build-frontend.ps1')
if ($LASTEXITCODE -ne 0) {
    Write-Host 'React build failed. Fix the first npm/TypeScript error above and retry.' -ForegroundColor Red
    Set-StartupStatus 'FAILED: React production build failed.'
    exit $LASTEXITCODE
}

Write-Host 'Step 2/2: Start the Spring Boot HTTPS server in a separate window.' -ForegroundColor Cyan
Write-Host 'The site and API will both use https://localhost:8080.' -ForegroundColor Green
# If this same project's previous JVM is still running, stop it before spawning the
# next backend build. Otherwise its locked JAR can make Maven's clean phase fail.
try {
    & (Join-Path $root 'stop-existing-mango.ps1') -ProjectRoot $root -Port 8080 -CheckPort
} catch {
    Write-Host 'ERROR: Mango cannot restart until the current port/JAR conflict is resolved.' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}
Set-StartupStatus 'BACKEND_STARTING'
$backendScript = Join-Path $root 'start-backend.ps1'
$backendArgs = "-NoProfile -ExecutionPolicy Bypass -NoExit -File `"$backendScript`""
$backendWindow = Start-Process -FilePath 'powershell.exe' -ArgumentList $backendArgs -WorkingDirectory $root -PassThru

# PowerShell 5.1 may reject the local self-signed certificate while polling.
# This callback is only used by this startup-check process; the browser still validates normally.
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
if (-not ([System.Management.Automation.PSTypeName]'MangoTrustPolicy').Type) {
    Add-Type -TypeDefinition @"
        using System.Net;
        using System.Security.Cryptography.X509Certificates;
        public class MangoTrustPolicy : ICertificatePolicy {
            public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int problem) {
                return true;
            }
        }
"@
}
[System.Net.ServicePointManager]::CertificatePolicy = New-Object MangoTrustPolicy
Write-Host 'Waiting for https://localhost:8080/api/health ...' -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(10)
$ready = $false
$startupFailed = $false
while ((Get-Date) -lt $deadline) {
    if (Test-Path $statusFile) {
        $state = (Get-Content -LiteralPath $statusFile -Raw -ErrorAction SilentlyContinue).Trim()
        if ($state -like 'FAILED:*' -or $state -like 'STOPPED:*') {
            Write-Host "Backend startup failed: $state" -ForegroundColor Red
            Write-Host 'Read the separate backend PowerShell window for the full error.' -ForegroundColor Yellow
            $startupFailed = $true
            break
        }
    }
    if ($backendWindow.HasExited) {
        Write-Host 'The backend startup window exited before the HTTPS health check passed.' -ForegroundColor Red
        $startupFailed = $true
        break
    }
    try {
        $health = Invoke-RestMethod -Uri 'https://localhost:8080/api/health' -TimeoutSec 3
        if ($health.status -eq 'UP' -and $health.application -eq 'Mango Bus Reservation') {
            $ready = $true
            break
        }
    } catch { }
    Start-Sleep -Seconds 2
}

if ($ready) {
    Set-StartupStatus 'RUNNING'
    Start-Process 'https://localhost:8080'
    Write-Host 'Mango is ready at https://localhost:8080' -ForegroundColor Green
    Write-Host 'If the browser shows a localhost certificate warning, use the local-development instructions in README.md.' -ForegroundColor Yellow
} else {
    Write-Host 'Mango did not start within ten minutes.' -ForegroundColor Red
    Write-Host 'Check the separate backend PowerShell window for the first Maven, certificate, or Spring Boot error.' -ForegroundColor Yellow
    Write-Host 'If the error is a dependency download failure, check internet/proxy access and rerun this launcher.' -ForegroundColor Yellow
}
