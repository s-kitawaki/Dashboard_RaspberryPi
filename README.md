# Raspberry Pi Dashboard

Vue 3 / TypeScript / Vuetify のダッシュボードと、Cloudflare Workers の毎時更新・Discord通知です。旧FastAPIとPython Botを置き換え、`rp_weather_simple` は廃止しました。Raspberry Piでは公開URLをブラウザーで開くだけで使えます。

```text
ブラウザー → Cloudflare Pages（Vue / Vuetify）
                   └ /api/* → Pages Functions → Worker → KVの公開スナップショット
毎時00分 → Worker → OpenWeather / Twelve Data → KV更新
                 └ KVのエントリー価格と比較 → Discord Webhook
Discord /entry・/exit・/position → 署名検証 → Worker → KVの共有ポジション
```

## 構成

| ディレクトリ | 内容 |
| --- | --- |
| `rp_weather/frontend` | Vue / TypeScript / Vuetify、Storybook、Pages APIプロキシ |
| `rp_weather/backend` | TypeScript Worker、データ取得、Discord署名検証、損益計算、テスト |
| `rp_weather/infra` | TerraformによるPages、Worker、KV、Cronの構築 |
| `rp_weather/scripts` | ビルド、公開、シークレット登録、Discordコマンド登録 |

## 開発

Node.js 24 LTSとnpmを使用します。各ディレクトリの `package-lock.json` を使って再現できます。

```powershell
cd rp_weather/backend
npm ci
Copy-Item .dev.vars.example .dev.vars
# .dev.vars に自分のAPIキーを設定する
npm run dev
```

別ターミナルで初回データを作成します。ローカルでもWebhookを設定すると通知を実際に送信するので、開発用チャンネルのWebhookを使ってください。未設定時は為替スナップショットまで更新し、通知処理が失敗します。

```powershell
Invoke-WebRequest 'http://localhost:8787/__scheduled?cron=0+*+*+*+*'
```

別ターミナルで画面を起動します。

```powershell
cd rp_weather/frontend
npm ci
npm run dev
# Storybookは npm run storybook
```

Viteの開発用プロキシで `/api` をローカルWorkerへ転送します。StorybookのサンプルはAPIキー不要です。

## Discordの使い方

Discord Developer Portalでアプリを作成し、Public KeyをTerraformの設定へ、Bot Tokenをコマンド登録時だけの環境変数へ設定します。公開したWorkerの `/discord/interactions` を **Interactions Endpoint URL** に登録します。Webhook URLは送信専用です。受信にはSlash Commandを使い、常時接続Botは不要です。

| コマンド | 動作 |
| --- | --- |
| `/entry price:150` | 買い150円を登録。数量未設定なので1 USDあたりの損益幅を通知 |
| `/entry price:150 quantity:10000 side:long` | 150円、買い10,000 USDのポジションを登録 |
| `/entry price:150 quantity:10000 side:short` | 売り10,000 USDを登録 |
| `/position` | 登録内容と最終取得レートによる参考損益を自分だけに表示 |
| `/exit` | 登録を削除。売買注文や実現損益の記録は行いません |

**1つのサーバー・チャンネルで1つのUSD/JPYポジションを共有**します。`/entry` は既存登録を置き換えます。操作を許可したユーザー全員が同じ登録を変更できます。価格だけで登録し直すと数量は未設定に戻ります。許可ユーザー未設定の場合、操作は拒否されます。従来の `!entry` や通常のチャット投稿は処理しません。

買いの評価損益は `(現在価格 − エントリー価格) × USD数量`、売りは符号を反転します。例: 買い150円・10,000 USD、現在151円なら +10,000円です。手数料・スプレッド・スワップは含みません。これは参考評価額であり、口座の実際の損益ではありません。

## Cloudflareへ公開

詳細な手順、必要な権限と環境変数は [インフラのREADME](rp_weather/infra/README.md) を参照してください。

1. Cloudflare Account IDとAPI Token、OpenWeatherとTwelve DataのAPIキー、Discordの各ID・Public Key・Webhook URLを用意します。
2. `rp_weather/infra/terraform.tfvars.example` を `terraform.tfvars` にコピーして自分の設定に変更します。
3. 手順に従ってビルドし、TerraformでPages・Worker・KV・Cronを作成します。
4. 秘密の値をWorker Secretsへ登録し、Pagesのビルド成果物をアップロードします。
5. DiscordのSlash CommandとInteractions Endpoint URLを登録します。
6. 最初の毎時更新後、画面とDiscord通知を確認します。

インフラとWorkerコードはTerraform管理、Pagesの成果物はWranglerによるDirect Uploadです。秘密の値はTerraform stateへ含めず、付属スクリプトでWorker Secretsへ登録します。Storybookは開発・確認用で、ダッシュボードの本番公開には含めません。

## データ更新と運用

- Cronは `0 * * * *`（UTC）。日本時間も毎時00分に相当します。ブラウザーを閉じても処理は動きます。
- 毎時、天気・予報・為替を取得します。画面の参照や手動再読み込みはKVを読むだけで、外部APIやDiscord送信を呼び出しません。
- 初回更新前はAPIが503を返し、画面に待機・再試行状態を表示します。
- 天気・予報・為替は独立して更新します。失敗したデータは前回値を残し、古いデータであることを表示します。為替取得失敗時は古い値で新しい損益通知を送信しません。
- 為替はTwelve DataのUSD/JPY参考レートです。以前のyfinanceの日足終値とは取得元が異なります。休日や配信停止時にはレート時刻が古くなるため、90分超で注意表示します。配信APIの利用枠と、公開画面でのデータ表示に適した利用条件を確認してください。
- Discord送信成功後だけ前回通知価格を更新します。失敗はWorkerログで確認できます。自動再送は実装しておらず、次の時間枠に再試行します。
- KVは結果整合性のため、登録・削除の反映に60秒以上かかる場合があります。毎時通知の重複抑止もKVによるベストエフォートで、同時実行や送信後の保存失敗に対する厳密な一度だけの配信は保証しません。
- 公開APIは天気・予報・参考レートのみです。ポジション、ユーザーID、APIキー、Webhook URLは返しません。
- 元の `entry_price.txt` の自動移行はありません。公開後に `/entry` で登録し直してください。

## 検証

### backend・frontendの一括チェック

リポジトリのルートから次の1コマンドで、backendとfrontendの全チェックを実行できます。

```powershell
./rp_weather/scripts/check.ps1
```

Windows標準のWindows PowerShell 5.1から実行できます。実行ポリシーによってスクリプトが拒否される環境では、次の形式を使用してください。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\rp_weather\scripts\check.ps1
```

このコマンドは固定された依存関係をインストールした後、次を順番に実行します。

- backend: lint、型チェック、単体テスト、Workerビルド
- frontend: lint、型チェック、単体テスト、本番ビルド、Storybookビルド、Chromiumによる画面テスト

Playwright用のChromiumはインストール済みであることを前提としています。依存関係も既に `npm ci` で揃っている場合は、短縮できます。

```powershell
./rp_weather/scripts/check.ps1 -SkipInstall
```

途中で1つでも失敗すると、その時点で終了コード1以上を返して停止します。GitHub Actionsも同じ一括チェックを実行します。

### Lint

フロントエンド（Vue・TypeScript・Storybook・Pages Functions・テスト）とWorker（TypeScript・テスト）にESLintを設定しています。未使用変数や不正なVueテンプレートなどを検出し、警告もエラー扱いにします。生成物・依存パッケージは対象外です。型の検証は既存の `typecheck` と併用します。

依存パッケージの初回インストール・更新後、リポジトリのルートからまとめて実行できます。

```powershell
npm --prefix rp_weather/backend ci
npm --prefix rp_weather/frontend ci
./rp_weather/scripts/lint.ps1
# 自動修正可能な問題を修正する場合:
./rp_weather/scripts/lint.ps1 -Fix
```

各アプリのディレクトリで `npm run lint` / `npm run lint:fix` を実行することもできます。GitHub Actionsのpush・pull requestと、公開用の `build.ps1` でもlintを実行し、違反があれば後続処理を停止します。Terraformは既存の `terraform fmt -check` / `terraform validate` で検証します。

設定は [ESLint / TypeScriptの推奨構成](https://typescript-eslint.io/getting-started/) と [VueのEssentialルール](https://eslint.vuejs.org/user-guide/) を使用しています。

### 型・テスト・ビルド

```powershell
cd rp_weather/backend
npm run lint
npm run typecheck
npm test
npm run build
cd ../frontend
npm run lint
npm test
npm run build
npm run build-storybook
npx playwright install chromium
npm run test:e2e
cd ../infra
terraform init -backend=false
terraform validate
```

外部サービスの実接続確認には、自分のAPIキーとCloudflare / Discordの設定が必要です。

画面のブラウザーテストはサンプルデータを使い、1024×600のRaspberry Pi画面と390px幅のスマートフォン画面、毎時更新、日付変更、API失敗・再試行を確認します。

## 参照した公式仕様

- [Discord Interactionsの受信・署名検証・応答期限](https://docs.discord.com/developers/interactions/receiving-and-responding)
- [Cloudflare KVの結果整合性](https://developers.cloudflare.com/kv/concepts/how-kv-works/)
- [Twelve Data Forex API](https://twelvedata.com/forex)
- [OpenWeather 3時間予報](https://openweathermap.org/forecast5)
