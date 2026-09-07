# yoyaku-kit — LINE内 相談予約フォーム

LINE公式のリッチメニューから開く、独自デザインの無料相談予約フォーム。予約すると Googleカレンダー登録（Meet付き）→ 台帳スプレッドシートに1行追加（流入経路つき）→ LINE に確認メッセージ → 前日リマインド、が自動で動く。エルメ（L Message）と共存できる。

| 読む順番 | ファイル | 誰が |
|---|---|---|
| 1 | `はじめにお読みください.md` | 人 |
| 2 | `事前準備ガイド.md` | 人（LINE Developers・Google・GAS・公開先の設定） |
| 3 | `導入手順_ClaudeCodeに読ませる.md` | Claude Code |
| — | `gas/Code.gs` / `gas/appsscript.json` | GAS に貼る |
| — | `frontend/index.html` / `frontend/config.js` | Vercel 等に置く |
| — | `demo/yoyaku-liff-demo.html` | 面談用の操作デモ（本番には使わない） |

構成：LIFF（LINE内ブラウザ）→ `frontend/index.html` → GAS Web App（`gas/Code.gs`）→ Googleカレンダー / スプレッドシート / LINE Messaging API。

入口ごとにリンクを分けると経路が台帳に残る：`https://liff.line.me/{LIFF_ID}?src=story|profile|line`
