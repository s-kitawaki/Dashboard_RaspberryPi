#requires -Version 7.0
[CmdletBinding()]
param([switch]$Fix)
. "$PSScriptRoot/common.ps1"

$lintScript = if ($Fix) { 'lint:fix' } else { 'lint' }
foreach ($app in @('backend', 'frontend')) {
    Push-Location (Join-Path $ProjectRoot $app)
    try {
        Invoke-Checked npm @('run', $lintScript)
    } finally { Pop-Location }
}
