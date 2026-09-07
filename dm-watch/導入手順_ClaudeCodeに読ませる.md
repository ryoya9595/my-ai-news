# 【Claude Codeへの指示】DMウォッチシステムの導入

このファイルを読んだAIへ。以下の手順で進めてください。

> ⚠️ **重要①：確認を取る前に、勝手に変更しないこと。**
> ステップ1で担当者から明確な「はい」をもらうまで、ファイルの作成・コマンド実行・push は一切しないでください。
>
> ⚠️ **重要②：既存のデータ・設定を絶対に消さないこと。**
> - `rm` / `rm -rf` / `mv` は使わない
> - 担当者のPCにある他のフォルダ・リポジトリ・ファイルには触らない
> - 既存のリポジトリに置く場合も、他のファイルは変更しない（`dm-watch/` を追加するだけ）
>
> ⚠️ **重要③：トークンを扱わない。**
> - Instagram / LINE のトークンを、チャットに貼らせない・ファイルに書かない・コミットしない
> - トークンは担当者が Claude のクラウド環境（API credentials）に自分で登録する（`事前準備ガイド.md` STEP 4）
> - ローカルでテストする場合も、トークンは担当者がターミナルで環境変数として自分で入力する

> 💻 Mac / Windows 共通。コマンドはOSごとに書き分けてあります。

---

## ステップ0：まず全体像を説明する（作業はまだしない）

担当者に次を伝えてください。

> このキットで作るのは「決まった時刻に Instagram のDMを確認して、対応が必要なものだけ LINE に知らせる仕組み」です。
>
> **動く場所**：Claude のクラウド。PCを閉じていても、毎日 10時・14時・17時・19時 に自動で動きます。
>
> **やること**：新着DMを取得 → Claude が「要対応／確認／対応不要」に分類 → 要対応には返信案を付けて LINE に1通で送る。新着がなければ何も送りません。
>
> **やらないこと**：Instagram への返信・既読・フォローなど、外向きの操作は一切しません。
>
> **作業の分担**：
> - 担当者：Instagram・Meta・LINE・Claude環境の設定（`事前準備ガイド.md`。ログインが必要なので本人が操作）
> - 私（AI）：キットをリポジトリに置く、接続テスト、ルーティン作成の案内

続けて確認：

> 「`事前準備ガイド.md` の STEP 1〜4 は終わっていますか？（Instagram がプロアカウント／Meta のトークン発行済み／LINE のトークンと userId 取得済み／Claude 環境に登録済み）」

- **終わっていない** → 「先に `事前準備ガイド.md` を進めてください。画面を見ながら案内できます」と伝える。担当者が希望すれば1ステップずつ案内する。**AIは画面操作を代行しない**
- **終わっている** → ステップ1へ

## ステップ1：作業してよいか確認を取る

> 「これから `dm-watch` フォルダを GitHub の非公開リポジトリに置きます（新規作成、または既存のリポジトリに追加）。進めてよろしいですか？（はい／いいえ）」

「はい」以外なら進めない。

## ステップ2：リポジトリに置く

担当者に「**既に Claude Code で使っているリポジトリはありますか？**」と聞く。

### 2-A. 既存のリポジトリに追加する場合
1. そのリポジトリをローカルに clone 済みか確認（なければ `git clone`）
2. `dm-watch/` フォルダをリポジトリ直下にコピー（**他のファイルには触らない**）

   **Mac / Linux**
   ```
   cp -R "<このキットのパス>/dm-watch" "<リポジトリのパス>/dm-watch"
   ```
   **Windows（PowerShell）**
   ```
   Copy-Item -Recurse "<このキットのパス>\dm-watch" "<リポジトリのパス>\dm-watch"
   ```
3. `dm-watch/demo/` があれば不要なので**コピーしなくてよい**（削除はしない）
4. コミットして push
   ```
   git add dm-watch
   git commit -m "Instagram DMチェックキットを追加"
   git push
   ```

### 2-B. 新しく作る場合
1. 担当者に GitHub で**非公開（Private）**リポジトリを作ってもらう（https://github.com/new → 名前 `ig-dm-notify` など → Private → Create）
2. ローカルで初期化して push

   **Mac / Linux**
   ```
   mkdir -p ~/ig-dm-notify && cd ~/ig-dm-notify
   git init
   cp -R "<このキットのパス>/dm-watch" ./dm-watch
   git add dm-watch
   git commit -m "Instagram DMチェックキットを追加"
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/ig-dm-notify.git
   git push -u origin main
   ```
   **Windows（PowerShell）**
   ```
   New-Item -ItemType Directory -Force "$HOME\ig-dm-notify"; Set-Location "$HOME\ig-dm-notify"
   git init
   Copy-Item -Recurse "<このキットのパス>\dm-watch" ".\dm-watch"
   git add dm-watch
   git commit -m "Instagram DMチェックキットを追加"
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/ig-dm-notify.git
   git push -u origin main
   ```
3. `git push` で認証を求められたら、担当者に GitHub のログインをしてもらう（AIは入力しない）

### 2-C. 確認
```
git ls-files dm-watch
```
`dm-watch/scripts/fetch_dms.py` と `dm-watch/scripts/send_line.py` と `dm-watch/routine-prompt.md` が含まれていればOK。

## ステップ3：接続テスト（任意）

クラウドで動かす前に、担当者のPCでスクリプトが Instagram と LINE に繋がるか確認できます。**トークンは担当者がターミナルに自分で入力**します（チャットには貼らない）。

担当者に次を案内する：

**Mac / Linux**
```
cd "<リポジトリのパス>"
IG_ACCESS_TOKEN="ここに自分で貼る" python3 dm-watch/scripts/fetch_dms.py --self-test
LINE_CHANNEL_ACCESS_TOKEN="ここに自分で貼る" python3 dm-watch/scripts/send_line.py --self-test
```
**Windows（PowerShell）**
```
Set-Location "<リポジトリのパス>"
$env:IG_ACCESS_TOKEN="ここに自分で貼る"; python dm-watch\scripts\fetch_dms.py --self-test
$env:LINE_CHANNEL_ACCESS_TOKEN="ここに自分で貼る"; python dm-watch\scripts\send_line.py --self-test
```

- 両方 `"ok": true` ならOK
- Instagram が `HTTP 190` / `OAuthException` → トークンが違うか期限切れ。事前準備ガイド STEP 2-5
- Instagram が `HTTP 400` で `platform` 関連 → プロアカウントになっていない、またはアプリにアカウントが紐づいていない。STEP 1 / 2-3
- LINE が `401` → トークンが違う。STEP 3-2
- `python3: command not found` → Python 未導入。https://www.python.org からインストール（Mac は `python3` が最初から入っていることが多い）

> テスト後、ターミナルの履歴にトークンが残ります。気になる場合は、そのターミナルを閉じてもらう。

## ステップ4：ルーティン作成を案内する（担当者が操作）

`事前準備ガイド.md` の STEP 6 の表を読み上げて、担当者に claude.ai/code でルーティンを作ってもらう。
プロンプトは `dm-watch/routine-prompt.md` の `---` の間の部分。担当者が貼り付けやすいように、その部分を**コードブロックで表示**してあげる。

ポイントとして伝えること：
- スケジュールは **UTC**。`0 1,5,8,10 * * *` が日本時間の 10/14/17/19時
- リポジトリのブランチへの **push を許可**すると、通知済みの記録（`dm-watch/state/ig_seen.json`）が残り、同じDMを2回通知しなくなる
- コネクタ（Gmail 等）は**選ばない**

## ステップ5：初回実行と確認

1. ルーティンの「今すぐ実行」を押してもらう
2. 数分待って、LINE に通知が来たか聞く
3. 来ない場合、ルーティンの実行履歴（claude.ai/code）を開いてもらい、内容を教えてもらう
   - `count: 0` で終わっている → 新着DMがないだけ。正常。テスト用に別アカウントから自分にDMを送って再実行
   - `"stage": "auth"` のエラー → 環境の API credentials に `graph.instagram.com` が登録されていない、またはトークンが違う
   - LINE 送信で `401` → API credentials に `api.line.me` が登録されていない
   - LINE 送信で `400` と `to` 関連 → `LINE_TO_USER_ID` が違う、または通知用アカウントを友だち追加していない

## ステップ6：完了を伝える

> 「導入できました。毎日 10時・14時・17時・19時 に自動で動きます。新着DMがなければ何も届きません。
> Instagram のトークンは約60日で切れるので、切れる前に `事前準備ガイド.md` の『トークンの更新』を行ってください。カレンダーに50日後のリマインドを入れておくのがおすすめです。」

---

## 変更したいとき（担当者に頼まれたら）

| 変えたいこと | どこを変える |
|---|---|
| 確認する時刻 | ルーティンのスケジュール（UTCで。日本時間 −9時間） |
| 判定の基準・LINEの文面 | `dm-watch/routine-prompt.md` を編集 → ルーティンのプロンプトに貼り直す |
| 拾う時間幅 | 環境変数 `IG_WINDOW_HOURS`（実行間隔より少し長くしておく） |
| 通知先を増やす | `send_line.py` を宛先ごとに呼ぶようにプロンプトを修正（1通が人数分カウントされる点に注意） |

## 停止・アンインストール

担当者から**明確に「止めて」「消して」と言われたときだけ**：
1. ルーティンを無効化または削除（claude.ai/code から、担当者が操作）
2. 必要なら、環境の API credentials から `Instagram` と `LINE` を削除（担当者が操作）
3. 必要なら、リポジトリから `dm-watch/` を削除（他のファイルには触らない）

**Instagram のアカウント・Meta のアプリ・LINE公式アカウントは消さない**（担当者の判断で別途）。
