# 更新時のデプロイ手順

画面（frontend）、Worker（backend）、インフラ（infra）を変更したあと、Cloudflare の本番環境へ反映する手順です。初回構築は完了している前提です（2026-09-05 実施）。

## 本番環境の情報

| 項目 | 値 |
| --- | --- |
| ダッシュボード | https://rp-weather-dashboard.pages.dev |
| Worker | https://rp-weather-api.b1a2b1o4.workers.dev |
| Discord Interactions URL | https://rp-weather-api.b1a2b1o4.workers.dev/discord/interactions |
| Pages プロジェクト名 | `rp-weather-dashboard`（本番ブランチ `main`） |
| Worker 名 / KV | `rp-weather-api` / `rp-weather-api-dashboard` |
| Cron | 毎時 00 分（UTC。日本時間も毎時 00 分） |

Terraform の変数は `rp_weather/infra/terraform.tfvars`、state は `rp_weather/infra/terraform.tfstate` にあります。どちらも git 管理外なので、この PC 以外から作業する場合は先にコピーしてください。

## 変更内容ごとの手順

| 変更した場所 | 実行するもの | 所要時間の目安 |
| --- | --- | --- |
| `rp_weather/frontend` の画面・スタイル | [A. 画面だけ更新](#a-画面だけ更新) | 1〜2分 |
| `rp_weather/backend` の Worker コード | [B. Worker・インフラを更新](#b-workerインフラを更新) | 3〜5分 |
| `rp_weather/infra` の Terraform | [B. Worker・インフラを更新](#b-workerインフラを更新) | 3〜5分 |
| API キーや Webhook URL の差し替え | [C. 秘密の値を更新](#c-秘密の値を更新) | 1分 |
| Discord コマンドの定義 | [D. Discord コマンドを再登録](#d-discord-コマンドを再登録) | 1分 |

## 共通の準備

毎回、PowerShell 7（`pwsh`）で次を実行してから各手順に進みます。プロンプトが `PS C:\...>` になっていることを確認してください。`C:\...>` の場合はコマンドプロンプトなので `pwsh` と入力して切り替えます。

### 1. リポジトリのルートへ移動

```powershell
cd C:\Works_local\raspberrPi_Dashboard\Dashboard_RaspberryPi
```

### 2. Node 24 を優先させる

この PC には nvm-windows の Node 20 も入っており、そのままだとビルドが失敗します。この設定は現在のセッションだけに効きます。

```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
node --version   # v24.x であること
```

### 3. 開発サーバーを止める

`npm run dev` や Storybook が起動していると `npm ci` が `EPERM`（esbuild.exe を削除できない）で失敗します。起動中のターミナルで `Ctrl+C` で止めてください。

### 4. 秘密の値を環境変数に読み込む

API キー3つは `rp_weather/backend/.dev.vars` から読み込みます。値は画面に表示されません。

```powershell
Get-Content rp_weather\backend\.dev.vars | Where-Object { $_ -match '^(OPENWEATHER_API_KEY|TWELVE_DATA_API_KEY|DISCORD_WEBHOOK_URL)="?([^"]*)"?$' } | ForEach-Object { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
```

Cloudflare API トークンは手入力します（入力は伏せ字）。

```powershell
$env:CLOUDFLARE_API_TOKEN = Read-Host 'Cloudflare API token' -MaskInput
```

正しく入ったか確認する場合は、値を出さずに Cloudflare に問い合わせます。`active` と出れば OK です。

```powershell
(Invoke-RestMethod -Uri 'https://api.cloudflare.com/client/v4/user/tokens/verify' -Headers @{ Authorization = "Bearer $($env:CLOUDFLARE_API_TOKEN.Trim())" }).result.status
```

画面だけの更新（手順 A）では Cloudflare API トークンだけあれば動きます。

## A. 画面だけ更新

frontend をビルドし、Pages に成果物をアップロードします。Worker とインフラは触りません。

```powershell
Push-Location rp_weather\frontend
npm ci
npm run lint
npm run build
Pop-Location
.\rp_weather\scripts\deploy-pages.ps1
```

`Success! Uploaded ...` と表示され、`https://rp-weather-dashboard.pages.dev` の URL が出れば完了です。反映まで1分ほどかかることがあります。

## B. Worker・インフラを更新

両アプリのビルド、Terraform apply、秘密の値の再登録、Pages のアップロードを一括で行います。共通の準備で4つの環境変数をすべて設定しておいてください。

```powershell
.\rp_weather\scripts\deploy.ps1
```

途中で Terraform の plan が表示され、`Enter a value:` で止まります。変更内容を確認して `yes` と入力してください。

- Worker コードだけ変えた場合、plan には `cloudflare_workers_script.api` の更新（`content_sha256` の差分）が出ます。
- 何も変えていない場合は `No changes.` になり、そのまま先に進みます。
- 意図しない `destroy` が出た場合は `no` で中断して原因を確認してください。KV の削除はキャッシュとポジション登録が消えます。

ビルドをすでに済ませている場合は `-SkipBuild`、確認なしで進める場合は `-AutoApprove` が使えます。

```powershell
.\rp_weather\scripts\deploy.ps1 -SkipBuild
```

Terraform だけ変更を確認したい場合は apply せずに plan を見られます。

```powershell
terraform -chdir=rp_weather/infra plan
```

### 注意事項

- `rp_weather/backend` で `wrangler deploy` を実行しないでください。Terraform が Worker を所有しているため、設定が競合します。
- `wrangler.toml` の値はローカル開発用です。本番の緯度経度や Discord ID は `terraform.tfvars` で管理します。
- Cron の変更は反映に最大15分かかります。
- Pages の Service Binding を変えた場合は、apply 後に Pages のアップロードも必要です（`deploy.ps1` は自動で行います）。

## C. 秘密の値を更新

OpenWeather、Twelve Data、Discord Webhook のいずれかを差し替える場合、`.dev.vars` を書き換えてから共通の準備の手順4を実行し、次を実行します。3つすべてが再登録されます。

```powershell
.\rp_weather\scripts\set-secrets.ps1
```

Webhook URL は `https://discord.com/api/webhooks/<数字>/<トークン>` の形式のみ受け付けます。末尾のスラッシュやクエリは拒否されます。

## D. Discord コマンドを再登録

`rp_weather/scripts/register-commands.ps1` のコマンド定義を変えた場合に実行します。Bot Token は Developer Portal の Bot ページで取得し、この登録にだけ使います。

```powershell
$env:DISCORD_APPLICATION_ID = Read-Host 'Discord Application ID'
$env:DISCORD_GUILD_ID = '1458372866364932223'
$env:DISCORD_BOT_TOKEN = Read-Host 'Discord bot token' -MaskInput
.\rp_weather\scripts\register-commands.ps1
Remove-Item Env:DISCORD_BOT_TOKEN
```

`-DryRun` を付けると送信せずに JSON を表示します。既存の無関係なコマンドは保持されます。

## 動作確認

### API とプロキシ

Worker 直接と Pages 経由の両方で3つの API が 200 の JSON を返すことを確認します。

```powershell
.\rp_weather\scripts\smoke-test.ps1
```

KV を作り直した直後など、次の毎時更新までは 503 になります。その間は `-AllowUninitialized` を付けると 503 を警告扱いにします。

### 画面と Discord

- ブラウザーで https://rp-weather-dashboard.pages.dev を開き、天気・予報・為替が表示されること。
- Worker を変えた場合は Discord で `/position` を実行し、応答が返ること。
- 次の毎時 00 分に Discord へ為替通知が届くこと。

### Worker のログ

Cloudflare ダッシュボードの Workers & Pages → `rp-weather-api` → Logs で、毎時更新の失敗やコマンドのエラーを確認できます。

## トラブルシューティング

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| `'Get-Content' is not recognized` | コマンドプロンプトで実行している | `pwsh` と入力して PowerShell 7 に切り替える |
| `terraform` が見つからない | 新しい PATH が反映されていない | ターミナルを開き直す |
| `npm WARN EBADENGINE` の後に失敗 | Node 20 が使われている | 共通の準備の手順2を実行する |
| `EPERM: operation not permitted, unlink ... esbuild.exe` | 開発サーバーが起動中 | 停止してから再実行する |
| `Secret update failed` | Cloudflare API トークンの権限不足か期限切れ | トークンの `verify` を確認し、必要なら再発行する |
| Discord 登録で `403` / コード `40333` | User-Agent なしのリクエストを Discord が遮断 | スクリプトは対策済み。VPN 経由なら切って再実行する |
| smoke-test が 503 | 次の毎時更新前 | 00 分を過ぎてから再実行する |
| 為替通知が届かない | Webhook URL 無効、または Twelve Data 取得失敗 | Worker のログを確認し、手順 C で Webhook を再登録する |

## 関連ファイル

- [rp_weather/scripts/deploy.ps1](../rp_weather/scripts/deploy.ps1) — 一括デプロイ
- [rp_weather/scripts/deploy-pages.ps1](../rp_weather/scripts/deploy-pages.ps1) — Pages のみ
- [rp_weather/scripts/set-secrets.ps1](../rp_weather/scripts/set-secrets.ps1) — Worker Secrets
- [rp_weather/scripts/register-commands.ps1](../rp_weather/scripts/register-commands.ps1) — Discord コマンド
- [rp_weather/scripts/smoke-test.ps1](../rp_weather/scripts/smoke-test.ps1) — 疎通確認
- [rp_weather/infra/README.md](../rp_weather/infra/README.md) — Terraform の設計と初回構築
