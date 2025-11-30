# Clean Next.js cache and restart dev server

Write-Host "Cleaning Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✓ Removed .next folder" -ForegroundColor Green
}

if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "✓ Removed node_modules cache" -ForegroundColor Green
}

Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`nStarting dev server..." -ForegroundColor Yellow
Write-Host "Access your app at: http://localhost:3000" -ForegroundColor Cyan
npm run dev
