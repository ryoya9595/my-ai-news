# DMウォッチシステム（dm-watch）

決まった時刻（日本時間 10 / 14 / 17 / 19時）に Instagram の新着DMを確認し、対応が必要なものだけ返信案付きで LINE に通知する。Claude のクラウドルーティンで動くので、PC・スマホは閉じていてよい。

| 読む順番 | ファイル | 誰が |
|---|---|---|
| 1 | `はじめにお読みください.md` | 人 |
| 2 | `事前準備ガイド.md` | 人（Instagram・Meta・LINE・Claude環境の設定） |
| 3 | `導入手順_ClaudeCodeに読ませる.md` | Claude Code |
| — | `routine-prompt.md` | ルーティンに貼る |
| — | `scripts/fetch_dms.py` / `send_line.py` / `refresh_token.py` | ルーティンが実行 |
| — | `dev/test_scripts.py` | 開発用の検証（納品物ではない。`scripts/` を直したら実行する） |

構成：Claude ルーティン（cron `0 1,5,8,10 * * *` UTC）→ `fetch_dms.py`（Instagram Graph API）→ Claude が判定 → `send_line.py`（LINE Messaging API push）。トークンは Claude 環境の API credentials に預け、コードにも環境変数にも置かない。
