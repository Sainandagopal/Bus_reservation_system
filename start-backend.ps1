$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$projectRoot = $PSScriptRoot
$statusFile = Join-Path $projectRoot '.mango-startup-status'
function Set-StartupStatus {
    param([string]$Value)
    try { Set-Content -LiteralPath $statusFile -Value $Value -Encoding UTF8 } catch { }
}
trap {
    if ($_.FullyQualifiedErrorId -eq 'NativeCommandError') {
        continue
    }
    Set-StartupStatus ("FAILED: $($_.Exception.Message)")
    Write-Host "Unexpected backend launcher error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Set-StartupStatus 'BACKEND_SETUP'
$backendRoot = Join-Path $projectRoot 'backend'
$staticIndex = Join-Path $backendRoot 'src\main\resources\static\index.html'
if (-not (Test-Path (Join-Path $backendRoot 'pom.xml'))) {
    Write-Host 'ERROR: backend/pom.xml was not found. Open the project root folder.' -ForegroundColor Red
    Set-StartupStatus 'FAILED: backend/pom.xml not found.'
    exit 1
}
if (-not (Test-Path $staticIndex)) {
    Write-Host 'ERROR: React has not been built into Spring Boot yet.' -ForegroundColor Red
    Write-Host 'Run .\build-frontend.ps1 first, or use .\start-mango.bat for the complete one-command startup.' -ForegroundColor Yellow
    Set-StartupStatus 'FAILED: React has not been built into Spring Boot static resources.'
    exit 1
}

# Find JDK 21 explicitly.
$candidateHomes = @()
if ($env:JAVA_HOME) { $candidateHomes += $env:JAVA_HOME }
$installRoots = @(
    (Join-Path $env:ProgramFiles 'Eclipse Adoptium'),
    (Join-Path $env:ProgramFiles 'Java'),
    (Join-Path $env:USERPROFILE '.jdks')
)
foreach ($root in $installRoots) {
    if ($root -and (Test-Path $root)) {
        $candidateHomes += Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
    }
}
$jdk21 = $null
foreach ($candidateHomePath in ($candidateHomes | Select-Object -Unique)) {
    $javaExe = Join-Path $candidateHomePath 'bin\java.exe'
    if (Test-Path $javaExe) {
        $versionText = (cmd.exe /c "`"$javaExe`" -version 2>&1") -join "`n"
        if ($versionText -match 'version "(\d+)') {
            if ([int]$Matches[1] -ge 21) { $jdk21 = $candidateHomePath; break }
        }
    }
}
if (-not $jdk21) {
    Write-Host 'ERROR: JDK 21 or higher was not found.' -ForegroundColor Red
    Write-Host 'Install Eclipse Temurin JDK 21 from https://adoptium.net/temurin/releases/?version=21 and rerun.' -ForegroundColor Yellow
    Set-StartupStatus 'FAILED: JDK 21 or higher was not found.'
    exit 1
}
$env:JAVA_HOME = $jdk21
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$javaExePath = Join-Path $env:JAVA_HOME 'bin\java.exe'
$keytoolExe = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
Write-Host "Using JDK: $env:JAVA_HOME" -ForegroundColor Green
& $javaExePath -version

# Generate a local-only self-signed certificate for https://localhost:8080.
$sslPassword = 'mango-local-dev'
$env:MANGO_SSL_KEYSTORE_PASSWORD = $sslPassword
$keystorePath = Join-Path $backendRoot 'mango-localhost.p12'
if (-not (Test-Path $keystorePath)) {
    Write-Host 'Generating a local HTTPS certificate for localhost...' -ForegroundColor Cyan
    & $keytoolExe -genkeypair -alias mango-localhost -keyalg RSA -keysize 2048 -storetype PKCS12 `
        -keystore $keystorePath -storepass $sslPassword -keypass $sslPassword -validity 825 `
        -dname 'CN=localhost, OU=Local Development, O=Mango, L=Local, ST=Local, C=US' `
        -ext 'SAN=dns:localhost,ip:127.0.0.1' -noprompt
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $keystorePath)) {
        Write-Host 'ERROR: Could not create the local HTTPS certificate.' -ForegroundColor Red
        Set-StartupStatus 'FAILED: Could not create the local HTTPS certificate.'
        exit 1
    }
}

# Use installed Maven; otherwise download a verified Apache Maven ZIP to the user profile.
$mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
if ($mavenCommand) {
    $mavenExe = $mavenCommand.Source
} else {
    $mavenVersion = '3.10.0'
    $toolRoot = Join-Path $env:LOCALAPPDATA 'MangoDevTools'
    $mavenHome = Join-Path $toolRoot "apache-maven-$mavenVersion"
    $mavenCandidate = Join-Path $mavenHome 'bin\mvn.cmd'
    if (-not (Test-Path $mavenCandidate)) {
        New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
        $archive = Join-Path $env:TEMP "apache-maven-$mavenVersion-bin.zip"
        $archiveUrl = "https://dlcdn.apache.org/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
        Write-Host "Maven is not installed. Downloading Apache Maven $mavenVersion..." -ForegroundColor Cyan
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $archiveUrl -OutFile $archive -UseBasicParsing
            $checksumText = (Invoke-WebRequest -Uri "$archiveUrl.sha512" -UseBasicParsing).Content
            $expectedHash = [regex]::Match($checksumText, '(?i)\b[0-9a-f]{128}\b').Value.ToLowerInvariant()
            if (-not $expectedHash) { throw 'Could not read the official Maven SHA-512 checksum.' }
            $actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA512).Hash.ToLowerInvariant()
            if ($expectedHash -ne $actualHash) { throw 'Maven checksum validation failed. The archive was not extracted.' }
            Expand-Archive -LiteralPath $archive -DestinationPath $toolRoot -Force
        } catch {
            Write-Host 'ERROR: Could not prepare Maven. Check internet/proxy access.' -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
            Write-Host 'Official instructions: https://maven.apache.org/install.html' -ForegroundColor Yellow
            Set-StartupStatus 'FAILED: Could not prepare Maven. Check internet/proxy access.'
            exit 1
        }
    }
    if (-not (Test-Path $mavenCandidate)) {
        Write-Host "ERROR: Maven executable not found at $mavenCandidate" -ForegroundColor Red
        Set-StartupStatus 'FAILED: Maven executable was not found.'
        exit 1
    }
    $mavenExe = $mavenCandidate
    $env:MAVEN_HOME = $mavenHome
    $env:Path = "$mavenHome\bin;$env:Path"
}

Write-Host 'Checking Maven...' -ForegroundColor Cyan
& $mavenExe -version
if ($LASTEXITCODE -ne 0) { Write-Host 'ERROR: Maven could not start.' -ForegroundColor Red; Set-StartupStatus 'FAILED: Maven could not start.'; exit $LASTEXITCODE }

if (-not $env:MANGO_ADMIN_USERNAME) { $env:MANGO_ADMIN_USERNAME = 'admin' }
if (-not $env:MANGO_ADMIN_PASSWORD) {
    Write-Host 'WARNING: MANGO_ADMIN_PASSWORD is not set. The demo password is only used if the initial Admin is being created.' -ForegroundColor Yellow
    Write-Host 'Set $env:MANGO_ADMIN_PASSWORD before first startup to choose your own.' -ForegroundColor Yellow
}
$env:FRONTEND_ORIGIN = 'https://localhost:8080'
$env:MANGO_SSL_ENABLED = 'true'
$env:MANGO_SSL_KEYSTORE = 'file:./mango-localhost.p12'
$env:PORT = '8080'

# A previous Mango instance can keep mango-bus-api-1.0.0.jar locked on Windows.
# Stop only a Java process running this app artifact (including an older extracted copy), then
# verify that port 8080 is free before Maven's clean phase tries to replace the JAR.
try {
    & (Join-Path $projectRoot 'stop-existing-mango.ps1') -ProjectRoot $projectRoot -Port 8080 -CheckPort
} catch {
    Write-Host 'ERROR: Could not prepare the backend for a clean build.' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Set-StartupStatus 'FAILED: Existing Mango process or port conflict.'
    exit 1
}

Push-Location $backendRoot
try {
    Set-StartupStatus 'BUILDING_BACKEND'
    Write-Host 'Building the complete Spring Boot application (Java backend + bundled React UI)...' -ForegroundColor Cyan
    & $mavenExe clean package
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'ERROR: Maven build failed. Fix the first compiler/test error shown above.' -ForegroundColor Red
        Set-StartupStatus 'FAILED: Maven clean package failed. See the backend terminal for the first Maven error.'
        exit $LASTEXITCODE
    }
    $jarPath = Join-Path $backendRoot 'target\mango-bus-api-1.0.0.jar'
    if (-not (Test-Path $jarPath)) {
        Write-Host "ERROR: Executable JAR was not created at $jarPath" -ForegroundColor Red
        Set-StartupStatus 'FAILED: Executable JAR was not created.'
        exit 1
    }
    Write-Host 'Starting Mango over HTTPS at https://localhost:8080 ...' -ForegroundColor Green
    Set-StartupStatus 'LAUNCHING_BACKEND'
    & $javaExePath -jar $jarPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Mango stopped with an error. Read the first ERROR/exception in this terminal.' -ForegroundColor Red
        Set-StartupStatus 'FAILED: Spring Boot exited during startup. See the backend terminal for the Java exception.'
        exit $LASTEXITCODE
    } else {
        Set-StartupStatus 'STOPPED: Spring Boot process exited.'
    }
} finally {
    Pop-Location
}
