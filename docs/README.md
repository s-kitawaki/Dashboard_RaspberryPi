# ドキュメント

運用・手順に関するドキュメントを置くディレクトリです。設計や検証の詳細は各アプリの README を参照してください。

| ファイル | 内容 |
| --- | --- |
| [deploy.md](deploy.md) | 画面・Worker・インフラを更新したときの Cloudflare へのデプロイ手順、動作確認、トラブルシューティング |
| [cloudflare-free-tier.md](cloudflare-free-tier.md) | 使用中の Cloudflare 機能の無料枠、このダッシュボードの利用量の目安、上限超過時の挙動 |
| [plan-oheya.md](plan-oheya.md) | ドット絵の部屋・DotGothic16・パネル再配置の実装計画（2026-09-23 採用案） |
| `credentials.md`（git 管理外、リンクなし） | Cloudflare・外部 API・Discord の認証情報と設定値の控え。秘密の値を含むため `.gitignore` で除外しており、このPCにしかない |

新しいドキュメントを追加したら、この表に1行追加してください。
