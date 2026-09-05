#requires -Version 7.0
[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$AutoApprove
)
. "$PSScriptRoot/common.ps1"
Assert-SecretEnvironment
if (-not $SkipBuild) { & "$PSScriptRoot/build.ps1" }
foreach ($file in @('backend/dist/index.js', 'frontend/dist/index.html')) {
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot $file))) { throw "Missing $file. Run build.ps1 first." }
}
Invoke-Checked terraform @("-chdir=$InfraRoot", 'init', '-input=false')
Invoke-Checked terraform @("-chdir=$InfraRoot", 'validate')
$applyArguments = @("-chdir=$InfraRoot", 'apply')
if ($AutoApprove) { $applyArguments += @('-auto-approve', '-input=false') }
Invoke-Checked terraform $applyArguments
& "$PSScriptRoot/set-secrets.ps1"
& "$PSScriptRoot/deploy-pages.ps1"
$deployment = Get-DeploymentOutputs
Write-Host "Dashboard: $($deployment.pages_url.value)"
Write-Host "Discord interactions URL: $($deployment.discord_interactions_url.value)"
