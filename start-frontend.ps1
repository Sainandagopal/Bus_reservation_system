$ErrorActionPreference = 'Stop'
Write-Host 'Mango now serves the compiled React UI from Spring Boot over HTTPS on port 8080.' -ForegroundColor Cyan
Write-Host 'This avoids a separate http://localhost:5173 site.' -ForegroundColor Cyan
Write-Host 'Building React assets for Spring Boot...' -ForegroundColor Yellow
& (Join-Path $PSScriptRoot 'build-frontend.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'React is ready. Run .\start-backend.ps1 or .\start-mango.bat to launch https://localhost:8080.' -ForegroundColor Green
