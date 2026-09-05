#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$InfraRoot = Join-Path $ProjectRoot 'infra'

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE)." }
}

function Get-DeploymentOutputs {
    $json = & terraform "-chdir=$InfraRoot" output -json
    if ($LASTEXITCODE -ne 0) { throw 'Cannot read Terraform outputs. Apply infrastructure first.' }
    return ($json -join "`n" | ConvertFrom-Json)
}

function Assert-SecretEnvironment {
    foreach ($name in @('CLOUDFLARE_API_TOKEN', 'OPENWEATHER_API_KEY', 'DISCORD_WEBHOOK_URL', 'TWELVE_DATA_API_KEY')) {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
            throw "Set $name in the process environment or CI secret store before deployment."
        }
    }
    if ($env:DISCORD_WEBHOOK_URL -cnotmatch '\Ahttps://discord\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+\z') {
        throw 'DISCORD_WEBHOOK_URL must be https://discord.com/api/webhooks/id/token with no query, fragment or trailing slash.'
    }
}
