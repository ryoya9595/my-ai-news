# dev — 開発用の検証ツール（納品物ではない）

`test_gas.cjs` は、Apps Script の API（CalendarApp / SpreadsheetApp / UrlFetchApp / LockService / ScriptApp）を
スタブ化して `gas/Code.gs` を Node 上で実行し、ロジックを検証する。Google に接続しないので誰でも実行できる。

```
node soudan-yoyaku/dev/test_gas.cjs
```

検証している内容（56項目）:
- `applyDefaultConfig` の初期値投入と既存値の保護
- 空き枠の計算：昼休み・既存予定との重なり（部分重複含む）・終日予定・欠席予定・曜日・最短リードタイム・枠長
- `doGet`：ping / slots / 未知action / カレンダー不正時のエラーJSON / settings にトークンが混ざらないこと
- `doPost`：予約作成、Meet URL、台帳14列の内容、経由ラベル、LINE push の宛先とヘッダと本文
- 二重予約の拒否（`slot_taken`）と、拒否時に副作用が残らないこと
- 入力検証（空の名前・日付形式・時刻形式・壊れたJSON）
- 障害時の挙動：LINE 失敗・Meet 作成失敗・userId なし でも予約自体は成立すること
- `sendReminders`：前日分だけ送る／二重送信しない／台帳に送信記録
- `installReminderTrigger` の冪等性、`selfCheck` の判定

`Code.gs` を編集したら、push する前にこれを実行すること。
