#requires -Version 7.0
[CmdletBinding()]
param()
. "$PSScriptRoot/common.ps1"

# Check both applications before installing or building either.
foreach ($app in @('backend', 'frontend')) {
    foreach ($file in @('package.json', 'package-lock.json')) {
        if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "$app/$file"))) {
            throw "Missing $app/$file. Each application must provide a locked npm build."
        }
    }
}
foreach ($app in @('backend', 'frontend')) {
    Push-Location (Join-Path $ProjectRoot $app)
    try {
        Invoke-Checked npm @('ci')
        Invoke-Checked npm @('run', 'lint')
        Invoke-Checked npm @('run', 'build')
    } finally { Pop-Location }
}
foreach ($file in @('backend/dist/index.js', 'frontend/dist/index.html')) {
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot $file))) {
        throw "Build did not produce $file."
    }
}
