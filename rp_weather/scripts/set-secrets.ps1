#requires -Version 7.0
[CmdletBinding()]
param()
. "$PSScriptRoot/common.ps1"
Assert-SecretEnvironment
$deployment = Get-DeploymentOutputs
$account = [uri]::EscapeDataString($deployment.account_id.value)
$worker = [uri]::EscapeDataString($deployment.worker_name.value)
$endpoint = "https://api.cloudflare.com/client/v4/accounts/$account/workers/scripts/$worker/secrets"

foreach ($name in @('OPENWEATHER_API_KEY', 'DISCORD_WEBHOOK_URL', 'TWELVE_DATA_API_KEY')) {
    $body = @{
        name = $name
        type = 'secret_text'
        text = [Environment]::GetEnvironmentVariable($name)
    } | ConvertTo-Json -Compress
    try {
        $result = Invoke-RestMethod -Method Put -Uri $endpoint -Headers @{
            Authorization = "Bearer $env:CLOUDFLARE_API_TOKEN"
        } -ContentType 'application/json' -Body $body
        if (-not $result.success) { throw 'Cloudflare rejected the update.' }
    } catch {
        # Do not render API response/request bodies, which could contain credentials.
        throw "Secret update failed for $name. Check token scope and the Terraform Worker output; retry this script."
    } finally { $body = $null }
    Write-Host "Updated Worker secret: $name"
}
