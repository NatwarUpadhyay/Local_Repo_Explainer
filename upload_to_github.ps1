# 🚀 GitHub Upload Script for LocalRepoExplainer
# Run this script after creating your GitHub repository

Write-Host "`n════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 GitHub Upload Helper" -ForegroundColor Green
Write-Host "════════════════════════════════════════`n" -ForegroundColor Cyan

# Step 1: Get GitHub username and repo name
Write-Host "📝 First, create your GitHub repository:" -ForegroundColor Yellow
Write-Host "   1. Go to: https://github.com/new" -ForegroundColor White
Write-Host "   2. Name: LocalRepoExplainer (or your choice)" -ForegroundColor White
Write-Host "   3. Make it PUBLIC" -ForegroundColor White
Write-Host "   4. Don't initialize with README" -ForegroundColor White
Write-Host "   5. Click 'Create repository'`n" -ForegroundColor White

Write-Host "Press Enter after creating the repository..." -ForegroundColor Yellow
Read-Host

$username = Read-Host "`nEnter your GitHub username"
$reponame = Read-Host "Enter repository name (default: LocalRepoExplainer)"

if ([string]::IsNullOrWhiteSpace($reponame)) {
    $reponame = "LocalRepoExplainer"
}

$repoUrl = "https://github.com/$username/$reponame.git"

Write-Host "`n✅ Repository URL: $repoUrl`n" -ForegroundColor Green

# Step 2: Check if git is installed
Write-Host "🔍 Checking for Git installation..." -ForegroundColor Yellow
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "❌ Git not found! Please install Git first:" -ForegroundColor Red
    Write-Host "   Download from: https://git-scm.com/download/win`n" -ForegroundColor White
    exit 1
}
Write-Host "✅ Git is installed`n" -ForegroundColor Green

# Step 3: Initialize git repository
Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "⚠️  Git repository already exists. Skipping init.`n" -ForegroundColor Yellow
} else {
    git init
    Write-Host "✅ Git repository initialized`n" -ForegroundColor Green
}

# Step 4: Add all files
Write-Host "📁 Adding files to Git..." -ForegroundColor Yellow
git add .
Write-Host "✅ Files added`n" -ForegroundColor Green

# Step 5: Commit
Write-Host "💾 Creating initial commit..." -ForegroundColor Yellow
$commitMessage = "Initial commit: LocalRepoExplainer v1.0 - Privacy-first code analyzer with local AI

Features:
- Local LLM integration (9+ models)
- Multi-language support (20+ languages)
- Tree + Graph visualization
- AI-powered analysis
- Real-time progress tracking
- 100% private - no external API calls"

git commit -m $commitMessage
Write-Host "✅ Commit created`n" -ForegroundColor Green

# Step 6: Add remote
Write-Host "🔗 Adding GitHub remote..." -ForegroundColor Yellow
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "⚠️  Remote 'origin' already exists: $existingRemote" -ForegroundColor Yellow
    $changeRemote = Read-Host "Do you want to change it? (y/n)"
    if ($changeRemote -eq "y") {
        git remote remove origin
        git remote add origin $repoUrl
        Write-Host "✅ Remote updated`n" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Keeping existing remote`n" -ForegroundColor Yellow
    }
} else {
    git remote add origin $repoUrl
    Write-Host "✅ Remote added`n" -ForegroundColor Green
}

# Step 7: Push to GitHub
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes depending on connection speed...`n" -ForegroundColor Gray

git branch -M main
$pushResult = git push -u origin main 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully pushed to GitHub!`n" -ForegroundColor Green
    
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════`n" -ForegroundColor Cyan
    
    Write-Host "📍 Your repository is now live at:" -ForegroundColor Yellow
    Write-Host "   https://github.com/$username/$reponame`n" -ForegroundColor White
    
    Write-Host "📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Visit your repository URL" -ForegroundColor White
    Write-Host "   2. Add topics (Settings → About → gear icon)" -ForegroundColor White
    Write-Host "      Suggested: code-analysis, local-llm, privacy-first" -ForegroundColor Gray
    Write-Host "   3. Enable Issues (Settings → Features)" -ForegroundColor White
    Write-Host "   4. Enable Discussions (Settings → Features)" -ForegroundColor White
    Write-Host "   5. Share your project!`n" -ForegroundColor White
    
    Write-Host "🌟 Share on:" -ForegroundColor Yellow
    Write-Host "   • Reddit: r/programming, r/MachineLearning" -ForegroundColor White
    Write-Host "   • Twitter/X: #OpenSource #LocalLLM" -ForegroundColor White
    Write-Host "   • Hacker News: news.ycombinator.com" -ForegroundColor White
    Write-Host "   • Dev.to: Write a blog post`n" -ForegroundColor White
    
    Write-Host "📖 Users can now clone and use:" -ForegroundColor Yellow
    Write-Host "   git clone https://github.com/$username/$reponame.git" -ForegroundColor White
    Write-Host "   cd $reponame" -ForegroundColor White
    Write-Host "   .\setup_venv.ps1" -ForegroundColor White
    Write-Host "   .\run.ps1`n" -ForegroundColor White
    
} else {
    Write-Host "`n❌ Push failed. Possible reasons:" -ForegroundColor Red
    Write-Host "   • Repository doesn't exist on GitHub" -ForegroundColor White
    Write-Host "   • Incorrect username or repository name" -ForegroundColor White
    Write-Host "   • No push permissions" -ForegroundColor White
    Write-Host "   • Need to authenticate (use Git Credential Manager)`n" -ForegroundColor White
    
    Write-Host "💡 Try:" -ForegroundColor Yellow
    Write-Host "   1. Verify repository exists: https://github.com/$username/$reponame" -ForegroundColor White
    Write-Host "   2. Check your GitHub username is correct" -ForegroundColor White
    Write-Host "   3. Make sure you're logged into Git" -ForegroundColor White
    Write-Host "   4. Try using GitHub Desktop instead`n" -ForegroundColor White
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
