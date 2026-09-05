#requires -Version 7.0
[CmdletBinding()]
param()
. "$PSScriptRoot/common.ps1"
if ([string]::IsNullOrWhiteSpace($env:CLOUDFLARE_API_TOKEN)) { throw 'Set CLOUDFLARE_API_TOKEN first.' }
$deployment = Get-DeploymentOutputs
$frontend = Join-Path $ProjectRoot 'frontend'
if (-not (Test-Path -LiteralPath (Join-Path $frontend 'dist/index.html'))) { throw 'Build frontend/dist first.' }
if (-not (Test-Path -LiteralPath (Join-Path $frontend 'functions/api/[[path]].ts'))) { throw 'Missing Pages API proxy.' }
if (Test-Path -LiteralPath (Join-Path $frontend 'dist/_worker.js')) { throw 'dist/_worker.js would override Pages functions. Remove it from the frontend build.' }
# Terraform must remain the owner of Pages bindings. Do not upload a competing config.
foreach ($config in @('wrangler.toml', 'wrangler.json', 'wrangler.jsonc')) {
    if (Test-Path -LiteralPath (Join-Path $frontend $config)) { throw "Remove competing frontend/$config; Terraform owns Pages settings." }
}
Push-Location $PSScriptRoot
try { Invoke-Checked npm @('ci') } finally { Pop-Location }
$oldAccount = $env:CLOUDFLARE_ACCOUNT_ID
$env:CLOUDFLARE_ACCOUNT_ID = $deployment.account_id.value
Push-Location $frontend
try {
    # Running here is essential: Wrangler discovers frontend/functions alongside dist.
    Invoke-Checked node @(
        (Join-Path $PSScriptRoot 'node_modules/wrangler/bin/wrangler.js'),
        'pages', 'deploy', 'dist',
        '--project-name', $deployment.pages_project_name.value,
        '--branch', $deployment.production_branch.value
    )
} finally {
    Pop-Location
    $env:CLOUDFLARE_ACCOUNT_ID = $oldAccount
}
