param(
    [string]$ProjectRoot = $PSScriptRoot,
    [int]$Port = 8080,
    [switch]$CheckPort
)

$ErrorActionPreference = 'Stop'
$jarName = 'mango-bus-api-1.0.0.jar'
$stoppedIds = @()

Write-Host 'Checking for an older Mango backend before rebuilding...' -ForegroundColor Cyan

try {
    $javaProcesses = @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
        ($_.Name -eq 'java.exe' -or $_.Name -eq 'javaw.exe') -and
        $_.CommandLine -and
        # The artifact name is unique to Mango. Match it even when the user extracted
        # the updated ZIP into a new folder, so the older extracted copy is also stopped.
        $_.CommandLine -match [regex]::Escape($jarName)
    })
} catch {
    throw "Could not inspect Java processes to safely release the Mango JAR. Close the previous Mango backend window with Ctrl+C and retry. Details: $($_.Exception.Message)"
}

foreach ($processInfo in $javaProcesses) {
    $processId = [int]$processInfo.ProcessId
    Write-Host "Stopping the previous Mango Java process (PID $processId) so Maven can replace its JAR..." -ForegroundColor Yellow
    try {
        Stop-Process -Id $processId -Force -ErrorAction Stop
        $stoppedIds += $processId
    } catch {
        throw "Could not stop the previous Mango process (PID $processId). Close its backend terminal with Ctrl+C and run the launcher again."
    }
}

# Wait for the old JVM to exit and release its JAR/file handles.
foreach ($processId in $stoppedIds) {
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        $stillRunning = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if (-not $stillRunning) { break }
        Start-Sleep -Milliseconds 250
    }
}
if ($stoppedIds.Count -gt 0) { Start-Sleep -Milliseconds 700 }

if ($CheckPort) {
    if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) {
        Write-Host 'WARNING: Could not check port 8080 automatically. If startup later reports that the port is occupied, close the conflicting application.' -ForegroundColor Yellow
        return
    }

    $listeners = @()
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
        if ($listeners.Count -eq 0) { break }
        Start-Sleep -Milliseconds 250
    }

    if ($listeners.Count -gt 0) {
        $processIds = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
        $processDescriptions = foreach ($pidValue in $processIds) {
            $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $pidValue" -ErrorAction SilentlyContinue
            if ($owner) { "$($owner.Name) (PID $pidValue)" } else { "PID $pidValue" }
        }
        throw "Port $Port is already used by $($processDescriptions -join ', '). I only stop a Java process that clearly belongs to this Mango project. Close the application using port $Port, then run start-mango.bat again. To inspect the port, run: Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess"
    }
}

Write-Host 'The previous Mango JAR is released and the requested port is available.' -ForegroundColor Green
