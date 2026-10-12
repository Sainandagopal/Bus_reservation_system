$ErrorActionPreference = 'Stop'
$backendRoot = Join-Path $PSScriptRoot 'backend'
$keystore = Join-Path $backendRoot 'mango-localhost.p12'
$certificateFile = Join-Path $backendRoot 'mango-localhost.cer'
if (-not (Test-Path $keystore)) {
    Write-Host 'The local certificate has not been generated yet.' -ForegroundColor Yellow
    Write-Host 'Run .\start-mango.bat once, wait until the backend opens, then close it with Ctrl+C and run this script.' -ForegroundColor Yellow
    exit 1
}
$sslPassword = 'mango-local-dev'
$keytoolCommand = Get-Command keytool.exe -ErrorAction SilentlyContinue
$keytoolPath = if ($keytoolCommand) { $keytoolCommand.Source } else { $null }
if (-not $keytoolPath -and $env:JAVA_HOME) {
    $candidate = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
    if (Test-Path $candidate) { $keytoolPath = $candidate }
}
if (-not $keytoolPath) {
    Write-Host 'keytool was not found. Install/configure JDK 21, then retry.' -ForegroundColor Red
    exit 1
}
& $keytoolPath -exportcert -alias mango-localhost -keystore $keystore -storetype PKCS12 -storepass $sslPassword -file $certificateFile
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $certificateFile)) { throw 'Could not export the Mango localhost certificate.' }
$confirmation = Read-Host 'Trust this self-signed certificate for localhost in your CURRENT WINDOWS USER account? Type TRUST to continue'
if ($confirmation -cne 'TRUST') {
    Write-Host 'No certificate was installed. You can still use the browser Advanced/Proceed option for local development.' -ForegroundColor Yellow
    exit 0
}
Import-Certificate -FilePath $certificateFile -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
Write-Host 'Certificate imported for the current Windows user. Restart the browser and open https://localhost:8080.' -ForegroundColor Green
Write-Host 'This certificate is only for this local development project. Remove it from certmgr.msc when it is no longer needed.' -ForegroundColor Yellow
