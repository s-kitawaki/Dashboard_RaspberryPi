# Cloudflare 無料枠と利用状況

このダッシュボードが使っている Cloudflare の機能と、Free プランの上限、実際の利用量の目安をまとめます。数値は 2026-09-05 に公式ドキュメントで確認したものです。Cloudflare は年に数回料金体系を見直すため、気になったときは下記のリンクと Cloudflare ダッシュボードの「Workers & Pages」右上の「Usage」で最新の値を確認してください。

## 使用中の機能と無料枠

| 機能 | 無料枠（Free プラン） | このダッシュボードの目安 |
| --- | --- | --- |
| Workers リクエスト | 100,000 件/日（UTC 0時リセット） | 1端末あたり約100件/日 |
| Workers CPU 時間 | 1回あたり 10 ms | 通信待ちが主で CPU はほぼ使わない |
| Cron Triggers | アカウントで 5 個 | 1 個使用（毎時 00 分） |
| Worker スクリプト数 | 100 個 | 1 個（`rp-weather-api`） |
| 1回あたりの外部通信（サブリクエスト） | 50 回 | 毎時更新で 4 回 |
| KV 読み取り | 100,000 件/日 | 数百件/日 |
| KV 書き込み | 1,000 件/日 | 約120件/日（毎時5件） |
| KV 容量 | 1 GB | 数 KB |
| KV 同一キーへの書き込み | 毎秒 1 回 | 毎時更新と Discord コマンドの衝突はほぼない |
| Pages 静的配信 | リクエスト・転送量とも無制限 | 制限なし |
| Pages ファイル数 / サイズ | 20,000 ファイル、1ファイル 25 MiB | 3 ファイル、最大 314 KB |
| Pages ビルド | 500 回/月 | 0 回（Direct Upload なので消費しない） |

## リクエスト数の内訳

- 毎時更新の Cron は1回1リクエスト扱いで、1日 24 件です。
- 画面は起動時と毎時の再読み込みで API を3件（天気・予報・為替）呼びます。1日開きっぱなしで約 72 件です。
- Pages Functions から Service Binding 経由で Worker を呼ぶ分は、公式に「追加のリクエスト料金は発生しない」と明記されています。画面からの API 呼び出しは二重に数えられず、1回として数えます。
- Discord の `/entry` `/exit` `/position` は1回1リクエストです。
- API 応答には `Cache-Control: public, max-age=60` が付くため、同じ端末からの連続した再読み込みは Cloudflare のキャッシュで吸収されることがあります。

Raspberry Pi とスマホなど5台で常時表示しても、1日 500 件程度です。上限の 0.5% ほどで、無料枠を超える可能性は実質ありません。

## KV 書き込みの内訳

毎時更新1回あたりの書き込みは次の5件です。

| キー | 内容 |
| --- | --- |
| `snapshot:weather` | 現在の天気 |
| `snapshot:forecast` | 3時間ごとの予報 |
| `snapshot:rate` | USD/JPY レート |
| `notified:<時刻>` | 同じ時間枠での通知重複防止（2日で自動削除） |
| `notification:last` | 前回通知した価格 |

1日 120 件で、上限 1,000 件の 12% です。`/entry` は1件、`/exit` は削除1件を追加で消費します。Discord コマンドの応答キャッシュ（`interaction:<ID>`、15分で自動削除）も1件ずつ書き込みます。

## 上限を超えたときの挙動

- Workers のリクエスト上限を超えると、既定では Worker が素通し（fail open）になり、API が 404 や HTML を返して画面のデータ取得が失敗します。翌日 UTC 0時（日本時間 9時）に自動で回復します。設定で fail closed（Cloudflare 1027 エラー）に変えることもできます。
- KV の書き込み上限を超えると、毎時更新のスナップショット保存が失敗し、画面には前回のデータが「前回のデータを表示」として残ります。
- どちらも有料の Workers Paid プラン（月額 5 ドルから）に切り替えれば上限が大きく緩和されますが、現状の利用量では不要です。

## 参照した公式ドキュメント

- [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) — リクエスト数、CPU 時間、Cron Triggers、サブリクエスト
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) — Service Binding が追加課金にならない旨、Cron のカウント
- [Workers KV Limits](https://developers.cloudflare.com/kv/platform/limits/) — 読み書き回数、容量、キーとバリューのサイズ
- [Pages Limits](https://developers.cloudflare.com/pages/platform/limits/) — ファイル数、ファイルサイズ、ビルド数、Functions のカウント方法

## 関連ドキュメント

- [deploy.md](deploy.md) — 更新時のデプロイ手順
- [rp_weather/infra/README.md](../rp_weather/infra/README.md) — Terraform の設計
