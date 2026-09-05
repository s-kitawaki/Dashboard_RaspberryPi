#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$SkipInstall
)
. "$PSScriptRoot/common.ps1"

$applications = @('backend', 'frontend')
foreach ($app in $applications) {
    foreach ($file in @('package.json', 'package-lock.json')) {
        if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "$app/$file"))) {
            throw "Missing $app/$file."
        }
    }
}

if (-not $SkipInstall) {
    foreach ($app in $applications) {
        Write-Host "Installing locked $app dependencies..."
        Push-Location (Join-Path $ProjectRoot $app)
        try { Invoke-Checked npm @('ci') } finally { Pop-Location }
    }
}

Write-Host 'Checking backend...'
Push-Location (Join-Path $ProjectRoot 'backend')
try {
    Invoke-Checked npm @('run', 'lint')
    Invoke-Checked npm @('run', 'typecheck')
    Invoke-Checked npm @('test')
    Invoke-Checked npm @('run', 'build')
} finally { Pop-Location }

Write-Host 'Checking frontend...'
Push-Location (Join-Path $ProjectRoot 'frontend')
try {
    Invoke-Checked npm @('run', 'lint')
    Invoke-Checked npm @('run', 'typecheck')
    Invoke-Checked npm @('test')
    Invoke-Checked npm @('run', 'build')
    Invoke-Checked npm @('run', 'build-storybook')
    Invoke-Checked npm @('run', 'test:e2e')
} finally { Pop-Location }

Write-Host 'All backend and frontend checks passed.' -ForegroundColor Green
