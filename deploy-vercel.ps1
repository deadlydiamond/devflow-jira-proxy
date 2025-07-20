# DevFlow Vercel Deployment Script
Write-Host "🚀 Starting Vercel Deployment for DevFlow..." -ForegroundColor Green

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

# Login to Vercel
Write-Host "🔐 Logging into Vercel..." -ForegroundColor Yellow
vercel login

# Deploy to Vercel
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
vercel --yes

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "📝 Remember to update your Angular service with the Vercel URL" -ForegroundColor Cyan 