#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$ApplicationId = $env:DISCORD_APPLICATION_ID,
    [string]$GuildId = $env:DISCORD_GUILD_ID,
    [switch]$DryRun
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$commands = @(
    @{
        name = 'entry'
        type = 1
        description = '共有のUSD/JPYポジションを登録・上書きします'
        options = @(
            @{ name = 'price'; description = 'エントリー価格（1 USDあたりの円、0より大きい数）'; type = 10; required = $true; min_value = 0; max_value = 1000000 },
            @{ name = 'quantity'; description = '保有数量（USD単位）。省略すると1 USDあたりの損益幅を表示'; type = 10; required = $false; min_value = 0; max_value = 1000000000 },
            @{
                name = 'side'; description = '売買方向。省略時は買い（long）'; type = 3; required = $false
                choices = @(@{ name = '買い（long）'; value = 'long' }, @{ name = '売り（short）'; value = 'short' })
            }
        )
    },
    @{ name = 'exit'; type = 1; description = '共有のUSD/JPYポジション登録を削除します' },
    @{ name = 'position'; type = 1; description = '共有ポジションと参考損益を自分だけに表示します' }
)
if ($DryRun) {
    ConvertTo-Json -InputObject $commands -Depth 10
    return
}
foreach ($id in @($ApplicationId, $GuildId)) {
    if ($id -notmatch '\A[0-9]{17,20}\z') { throw 'Set DISCORD_APPLICATION_ID and DISCORD_GUILD_ID to the application and configured guild IDs.' }
}
if ([string]::IsNullOrWhiteSpace($env:DISCORD_BOT_TOKEN)) { throw 'Set DISCORD_BOT_TOKEN in the local process environment.' }
$endpoint = "https://discord.com/api/v10/applications/$ApplicationId/guilds/$GuildId/commands"
# Discord rejects bot API calls without a "DiscordBot (url, version)" User-Agent (HTTP 403, code 40333).
$headers = @{
    Authorization = "Bot $env:DISCORD_BOT_TOKEN"
    'User-Agent'  = 'DiscordBot (https://github.com/s-kitawaki/Dashboard_RaspberryPi, 1.0)'
}
foreach ($command in $commands) {
    # POST is an upsert by name/type/scope; unrelated commands are preserved.
    try {
        $result = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType 'application/json' -Body ($command | ConvertTo-Json -Depth 10 -Compress)
        if ($result.name -ne $command.name) { throw 'Unexpected Discord response.' }
    } catch {
        throw "Registration failed for /$($command.name). Check application/guild IDs, bot token and applications.commands authorization. If rate-limited, wait and rerun."
    }
    Write-Host "Registered /$($command.name) in guild $GuildId"
}
