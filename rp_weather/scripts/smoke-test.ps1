#requires -Version 7.0
[CmdletBinding()]
param([switch]$AllowUninitialized)
. "$PSScriptRoot/common.ps1"
$deployment = Get-DeploymentOutputs
foreach ($origin in @($deployment.worker_url.value, $deployment.pages_url.value)) {
    foreach ($path in @('/api/weather', '/api/forecast', '/api/rate')) {
        $url = "$origin$path"
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 60 -SkipHttpErrorCheck
        if ($AllowUninitialized -and $response.StatusCode -eq 503 -and $response.Headers['Content-Type'] -match 'application/json') {
            $null = ConvertFrom-Json $response.Content
            Write-Warning "HTTP 503 JSON at $url; may be waiting for the first successful hourly snapshot. Retry without -AllowUninitialized after cron."
            continue
        }
        if ($response.StatusCode -ne 200 -or $response.Headers['Content-Type'] -notmatch 'application/json') {
            throw "Expected HTTP 200 JSON at $url (check secrets, upstream APIs and API binding)."
        }
        $null = ConvertFrom-Json $response.Content
        Write-Host "OK $url"
    }
}
# Intentionally do not POST Discord interactions: that could trigger a notification.
