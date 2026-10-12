$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$projectRoot = $PSScriptRoot
$frontendRoot = Join-Path $projectRoot 'frontend'
$backendStatic = Join-Path $projectRoot 'backend\src\main\resources\static'

if (-not (Test-Path (Join-Path $frontendRoot 'package.json'))) {
    Write-Host 'ERROR: frontend/package.json was not found. Open the project root folder.' -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $projectRoot 'backend\pom.xml'))) {
    Write-Host 'ERROR: backend/pom.xml was not found. Open the project root folder.' -ForegroundColor Red
    exit 1
}

# Use a compatible installed Node.js/npm; otherwise use the official portable ZIP.
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
$nodeHome = $null
$usableSystemNode = $false
if ($nodeCommand -and $npmCommand) {
    try {
        $systemNodeVersion = (& $nodeCommand.Source -v 2>&1 | Out-String).Trim()
        if ($systemNodeVersion -match '^v(\d+)\.(\d+)\.(\d+)') {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            $usableSystemNode = ($major -gt 22) -or ($major -eq 22 -and $minor -ge 12)
        }
    } catch { $usableSystemNode = $false }
}

if ($nodeCommand -and $npmCommand -and $usableSystemNode) {
    $nodeHome = Split-Path $nodeCommand.Source -Parent
} else {
    $nodeVersion = 'v24.20.0'
    $toolsRoot = Join-Path $projectRoot '.tools'
    $nodeHome = Join-Path $toolsRoot "node-$nodeVersion-win-x64"
    $nodeExe = Join-Path $nodeHome 'node.exe'
    $npmExe = Join-Path $nodeHome 'npm.cmd'

    if (-not ((Test-Path $nodeExe) -and (Test-Path $npmExe))) {
        New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
        $archive = Join-Path $env:TEMP "node-$nodeVersion-win-x64.zip"
        $archiveUrl = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip"
        $checksumsUrl = "https://nodejs.org/dist/$nodeVersion/SHASUMS256.txt"
        Write-Host "Node.js/npm was not found or is too old. Downloading portable Node.js $nodeVersion..." -ForegroundColor Cyan
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $archiveUrl -OutFile $archive -UseBasicParsing
            $checksumLines = (Invoke-WebRequest -Uri $checksumsUrl -UseBasicParsing).Content -split "`r?`n"
            $checksumLine = $checksumLines | Where-Object { $_ -match "\snode-$([regex]::Escape($nodeVersion))-win-x64\.zip$" } | Select-Object -First 1
            if (-not $checksumLine) { throw 'Could not find the official Node.js archive checksum.' }
            $expectedHash = ($checksumLine.Trim() -split '\s+')[0].ToLowerInvariant()
            $actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($expectedHash -ne $actualHash) { throw 'Node.js checksum validation failed. The archive was not extracted.' }
            Expand-Archive -LiteralPath $archive -DestinationPath $toolsRoot -Force
        } catch {
            Write-Host 'ERROR: Could not prepare Node.js.' -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
            Write-Host 'Install Node.js LTS from https://nodejs.org/en/download/ and reopen VS Code, or retry with internet access.' -ForegroundColor Yellow
            exit 1
        }
    }
    if (-not ((Test-Path $nodeExe) -and (Test-Path $npmExe))) {
        Write-Host 'ERROR: node.exe/npm.cmd were not found after extraction.' -ForegroundColor Red
        exit 1
    }
    $env:Path = "$nodeHome;$env:Path"
}

$nodeExePath = Join-Path $nodeHome 'node.exe'
$npmExePath = Join-Path $nodeHome 'npm.cmd'
if (-not (Test-Path $npmExePath)) {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCommand) { $npmExePath = $npmCommand.Source }
}
if (-not (Test-Path $npmExePath)) {
    Write-Host 'ERROR: npm.cmd is not available. Repair the Node.js installation.' -ForegroundColor Red
    exit 1
}

Write-Host "Using Node.js $((& $nodeExePath -v).Trim()) and npm $((& $npmExePath -v).Trim())" -ForegroundColor Green
Push-Location $frontendRoot
try {
    $dependenciesReady = (Test-Path 'node_modules/react/package.json') -and `
        (Test-Path 'node_modules/react-dom/package.json') -and `
        (Test-Path 'node_modules/vite/package.json') -and `
        (Test-Path 'node_modules/typescript/package.json')
    if (-not $dependenciesReady) {
        if (Test-Path 'package-lock.json') {
            Write-Host 'Installing React dependencies from package-lock.json...' -ForegroundColor Cyan
            & $npmExePath ci --no-audit --no-fund
        } else {
            Write-Host 'Installing React dependencies...' -ForegroundColor Cyan
            & $npmExePath install --no-audit --no-fund
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Host 'ERROR: npm dependency installation failed. Check internet access and the error above.' -ForegroundColor Red
            exit $LASTEXITCODE
        }
    }

    Write-Host 'Building the React production bundle...' -ForegroundColor Cyan
    & $npmExePath run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'ERROR: React build failed. Fix the first TypeScript/Vite error shown above.' -ForegroundColor Red
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

$distRoot = Join-Path $frontendRoot 'dist'
$distIndex = Join-Path $distRoot 'index.html'
if (-not (Test-Path $distIndex)) {
    Write-Host 'ERROR: frontend/dist/index.html was not generated.' -ForegroundColor Red
    exit 1
}

# Spring Boot will serve React from the same HTTPS origin and port as its REST API.
if (Test-Path $backendStatic) {
    Get-ChildItem -LiteralPath $backendStatic -Force | Remove-Item -Recurse -Force
} else {
    New-Item -ItemType Directory -Force -Path $backendStatic | Out-Null
}
Copy-Item -Path (Join-Path $distRoot '*') -Destination $backendStatic -Recurse -Force
if (-not (Test-Path (Join-Path $backendStatic 'index.html'))) {
    Write-Host 'ERROR: React files were not copied into Spring Boot static resources.' -ForegroundColor Red
    exit 1
}

Write-Host 'React production files are now bundled into Spring Boot static resources.' -ForegroundColor Green
Write-Host 'The app will use one address: https://localhost:8080' -ForegroundColor Green
