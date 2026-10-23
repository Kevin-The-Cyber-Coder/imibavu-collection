# Starts both Imibavu servers (API + React frontend) and opens the browser.
# Double-click this file, or run:  powershell -ExecutionPolicy Bypass -File start-servers.ps1
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting API on http://localhost:5000 ..." -ForegroundColor Yellow
Start-Process node -ArgumentList "src\index.js" -WorkingDirectory (Join-Path $root "backend")

Write-Host "Starting React frontend on http://localhost:3000 ..." -ForegroundColor Yellow
Start-Process npm.cmd -ArgumentList "start" -WorkingDirectory (Join-Path $root "frontend")

Start-Sleep -Seconds 6
Write-Host ""
Write-Host "  API       http://localhost:5000/api/v1/health" -ForegroundColor Green
Write-Host "  Frontend  http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "  Demo admin: admin@imibavucollection.rw  /  Admin123" -ForegroundColor Cyan
Write-Host ""
Start-Process "http://localhost:3000/"rgtey