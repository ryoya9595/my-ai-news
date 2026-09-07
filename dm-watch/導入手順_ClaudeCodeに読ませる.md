# 【AIエージェントへの指示】DMウォッチシステムの導入

このファイルを読んだAI（Claude Code など）へ。**あなたが主導して**導入を進めてください。
担当者（人間）にやってもらうのは、原則として次の3つだけです。

1. **ログイン**（Instagram・Facebook・LINE・Google・GitHub・claude.ai）
2. **秘密の値の貼り付け**（アクセストークン）
3. **スマホでの操作**（Instagram のプロアカウント切り替え）

それ以外——画面の遷移、ボタン操作、入力、ファイル配置、コマンド実行、ルーティン作成——は、使えるツールの範囲で**あなたが行います**。

> ⚠️ **絶対に守ること**
> - **確認を取る前に、外部サービスの状態を変えない。** 各STEPの冒頭で「これから○○します。進めてよいですか？」と聞き、「はい」をもらってから進める（STEPの中の個々のクリックは、都度聞かなくてよい）
> - **パスワード・2段階認証コードを入力しない。** ログイン画面が出たら担当者に交代し、ログインが終わったら再開する
> - **トークンを扱わない。** 画面に表示されたトークンを、チャットに書き出さない・ファイルに保存しない・コミットしない。トークンの貼り付け先には、担当者本人にコピー＆ペーストしてもらう
> - **既存のものを消さない。** `rm -rf` / `mv` を使わない。他のリポジトリ・フォルダ・アプリ・チャネルに触らない
> - **LINE公式アカウントの Webhook URL と、チャネルアクセストークンの「再発行」ボタンは押さない。** エルメなど他ツールが止まる
> - **押す前に止まって聞くもの：** 削除・再発行・課金・アプリの公開モード変更。この4つは、たとえ手順に書いてあっても、直前に必ず担当者に確認する
> - **Instagram に対して返信・フォロー・いいね等の操作をしない。** このシステムは読むだけ

> 💻 Mac / Windows 共通。コマンドはOSごとに書き分けてあります。

---

## STEP 0｜キットを手に入れる

すでに `dm-watch/` フォルダが手元にある（Zipを解凍済み・ドラッグ＆ドロップされた等）なら、STEP 1 へ。

> 💡 依頼文で**ブランチ名**が指定されている場合は、`git clone -b <ブランチ名> …` で clone する（main にまだ取り込まれていない版を試すとき）。

URLだけ渡された場合は、自分で取得する。**リポジトリを clone するのが最も確実**（公開リポジトリなのでログイン不要）：

**Mac / Linux**
```
cd ~/Desktop && git clone https://github.com/ryoya9595/my-ai-news.git dm-watch-src
```
**Windows（PowerShell）**
```
Set-Location "$HOME\Desktop"; git clone https://github.com/ryoya9595/my-ai-news.git dm-watch-src
```
→ `dm-watch-src/dm-watch/` がキット本体。以降「このキットのパス」＝ここ。

git が無い場合は Zip を取得して解凍：

**Mac / Linux**
```
cd ~/Desktop && curl -sSL -o dm-watch-system.zip https://github.com/ryoya9595/my-ai-news/raw/main/dm-watch-system.zip && unzip -q dm-watch-system.zip
```
**Windows（PowerShell）**
```
Set-Location "$HOME\Desktop"; Invoke-WebRequest -Uri https://github.com/ryoya9595/my-ai-news/raw/main/dm-watch-system.zip -OutFile dm-watch-system.zip; Expand-Archive dm-watch-system.zip -DestinationPath .
```

取得できたら、同じフォルダの `はじめにお読みください.md` と `事前準備ガイド.md` も読んでおく（事前準備ガイドは、あなたが画面を進めるときの台本になる）。

## STEP 1｜全体像を説明し、確認を取る

担当者に伝える：

> DMウォッチシステムを導入します。毎日 10時・14時・17時・19時 に Claude のクラウドが Instagram の新着DMを確認し、対応が必要なものだけ返信案付きで LINE に通知します。PCを閉じていても動きます。Instagram への返信や操作は一切しません。
>
> 必要な作業のうち、**ログイン・トークンの貼り付け・スマホ操作**だけお願いします。それ以外の画面操作や設定は私が進めます。所要時間は合計 45〜90分ほどです。
>
> 途中で「進めてよいですか？」と何度か確認します。

> 「まず、お使いのPCとアカウントの状況を確認します。よろしいですか？（はい／いいえ）」

「はい」以外なら進めない。

## STEP 2｜自分に何ができるか確認する

次を確認して、結果を担当者に一言で伝える。

| 確認 | 方法 | 使えると何ができるか |
|---|---|---|
| **ブラウザ操作**（Claude in Chrome） | ツール一覧に `mcp__claude-in-chrome__*` があるか。deferred なら `ToolSearch` で `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__get_page_text` を読み込み、`tabs_context_mcp` を1回呼ぶ | Meta・LINE・claude.ai の画面を**あなたが操作**できる |
| `git` | `git --version` | リポジトリ作成 |
| `gh`（GitHub CLI）とログイン状態 | `gh auth status` | GitHub リポジトリをコマンドで作れる |
| `python3` | `python3 --version`（Windows は `python --version`） | 接続テスト |
| Claude のプラン | 担当者に聞く（Pro / Max / Team） | Pro/Max なら API credentials が使える |

**ブラウザ操作が使えない場合**：以降の「画面を進める」STEPは、`事前準備ガイド.md` の該当箇所を**1ステップずつ読み上げて案内**する形に切り替える（それでも導入は完了できる）。

ブラウザ操作のルール（使える場合）：
- 必ず `tabs_create_mcp` で**新しいタブ**を作り、そのタブだけを操作する。担当者が開いているタブには触らない
- ログイン画面が出たら「ログインをお願いします。終わったら『できた』と言ってください」と伝えて待つ
- 画面の名称がガイドと違っても、**同じ意味の項目**を探して進める。見つからなければスクリーンショットを撮って担当者に相談する
- 各画面で得た **ID や URL**（トークン以外）は、チャットで担当者に見せて「控えメモ」に転記してもらう

## STEP 3｜Instagram をプロアカウントにする（担当者・スマホ）

これはスマホ操作なので担当者にやってもらう。`事前準備ガイド.md` の STEP 1 を読み上げて案内する。
**切り替え前に必ず伝える**：非公開アカウントにできなくなること、保留中のフォローリクエストが自動承認されること、商用利用不可の音源が使えなくなること。

終わったら「@ユーザー名」を聞いて控える。

## STEP 4｜Meta のアプリとトークン（あなたが画面を進める）

> 「Meta for Developers でアプリを作り、Instagram のアクセストークンを発行します。進めてよいですか？」

1. 新しいタブで https://developers.facebook.com/apps/ を開く → ログイン画面なら担当者に交代
2. `事前準備ガイド.md` STEP 2-1 〜 2-4 の順に、あなたが操作する（アプリ作成 → Instagram 設定 → Instagram アカウント追加 → 権限確認）
   - アプリ名は `DM通知`、メールは担当者に聞く
   - Instagram アカウントの追加で Instagram 側の承認が必要になったら、担当者のスマホで承認してもらう
3. **トークン発行**（STEP 2-5）：「アクセストークンを生成」を押すところまではあなたが行う。Instagram のログイン／許可画面は担当者に交代
4. トークンが表示されたら：**読み上げない・書き出さない**。担当者に「表示されたトークンを、パスワード管理ツール等にコピーして保存してください。あとで Claude の環境に貼り付けます」と伝える
5. 発行日を控えてもらう（60日後が期限）

## STEP 5｜通知用の LINE（あなたが画面を進める）

> 「通知を受け取るための LINE公式アカウント（通知専用）を作り、トークンとユーザーIDを取得します。進めてよいですか？」

1. https://manager.line.biz/ を開く → ログインは担当者
2. `事前準備ガイド.md` STEP 3-1 の順に、あなたが操作する（公式アカウント作成 → Messaging API を利用する）
   - **Webhook URL は空欄のまま**
3. https://developers.line.biz/console/ で、そのチャネルの「Messaging API設定」→ チャネルアクセストークン（長期）の「**発行**」を押す（**既存の別チャネルには触らない**。「再発行」の表示なら押さずに担当者に相談）
4. トークンは STEP 4 と同じ扱い（読まない・書かない。担当者が保存）
5. 「チャネル基本設定」→「あなたのユーザーID」を読み取り、担当者に見せて控えてもらう（これは秘密ではない）
6. 「Messaging API設定」の QRコードを表示して、担当者に**スマホのLINEで友だち追加**してもらう（追加しないと通知が届かない）

## STEP 6｜Claude の環境にトークンを登録する（あなたが画面を進める・貼り付けは担当者）

> 「Claude のクラウド環境に、Instagram と LINE のトークンを登録します。トークンの貼り付けだけお願いします。進めてよいですか？」

1. https://claude.ai/code を開き、環境の設定 → `Default` の編集（または新規環境 `IG DM通知`）
2. **Pro / Max の場合**：「API credentials」→「Add credential」を開き、次を**あなたが入力**する。Value 欄だけ担当者に貼り付けてもらう
   - 1つ目：Name `Instagram`、Allowed websites `graph.instagram.com`、Header `Authorization` / Prefix `Bearer`、Value ← 担当者
   - 2つ目：Name `LINE`、Allowed websites `api.line.me`、Header `Authorization` / Prefix `Bearer`、Value ← 担当者
3. 「Environment variables」に、あなたが入力：
   ```
   LINE_TO_USER_ID=（STEP 5 で控えたユーザーID）
   IG_WINDOW_HOURS=4.5
   ```
4. 保存
5. **Team の場合**：`事前準備ガイド.md` STEP 4-B の内容で、Network access を Custom にしてドメインを追加し、環境変数にトークンを入れる（値の貼り付けは担当者）

## STEP 7｜リポジトリに置く（あなたが実行）

> 「キットを GitHub の非公開リポジトリに置きます。進めてよいですか？」

担当者に「Claude Code で既に使っているリポジトリはありますか？」と聞く。

**既存リポジトリに追加**：そのリポジトリのローカルに `dm-watch/` をコピーして push（他のファイルには触らない）
```
cp -R "<このキットのパス>/dm-watch" "<リポジトリ>/dm-watch"     # Windows: Copy-Item -Recurse
cd "<リポジトリ>" && git add dm-watch && git commit -m "DMウォッチシステムを追加" && git push
```

**新規に作る**：
- `gh` がログイン済みなら、あなたが作る：
  ```
  mkdir -p ~/dm-watch-notify && cd ~/dm-watch-notify && git init -b main
  cp -R "<このキットのパス>/dm-watch" ./dm-watch
  git add dm-watch && git commit -m "DMウォッチシステムを追加"
  gh repo create dm-watch-notify --private --source=. --push
  ```
- `gh` が無い／未ログインなら：ブラウザ操作で https://github.com/new を開き、名前 `dm-watch-notify`・**Private** で作成（ログインは担当者）。その後：
  ```
  git remote add origin https://github.com/<ユーザー名>/dm-watch-notify.git && git push -u origin main
  ```
  push の認証は担当者。

確認：`git ls-files dm-watch` に `scripts/fetch_dms.py`・`scripts/send_line.py`・`routine-prompt.md` が含まれていること。

## STEP 8｜接続テスト（任意・あなたが案内、トークン入力は担当者）

クラウドで動かす前に、担当者のPCで疎通を確認できる。トークンは担当者が**ターミナルで直接**入力する（チャットに貼らせない）。

**Mac / Linux**
```
IG_ACCESS_TOKEN="ここに貼る" python3 dm-watch/scripts/fetch_dms.py --self-test
LINE_CHANNEL_ACCESS_TOKEN="ここに貼る" python3 dm-watch/scripts/send_line.py --self-test
```
**Windows（PowerShell）**
```
$env:IG_ACCESS_TOKEN="ここに貼る"; python dm-watch\scripts\fetch_dms.py --self-test
$env:LINE_CHANNEL_ACCESS_TOKEN="ここに貼る"; python dm-watch\scripts\send_line.py --self-test
```
両方 `"ok": true` ならOK。エラーの見方は `はじめにお読みください.md` の「困ったら」。テスト後はそのターミナルを閉じてもらう（履歴にトークンが残るため）。

## STEP 9｜ルーティンを作る（あなたが実行）

> 「毎日 10時・14時・17時・19時 に動くルーティンを作ります。進めてよいですか？」

設定値：

| 項目 | 値 |
|---|---|
| 名前 | `DMウォッチ` |
| リポジトリ／ブランチ | STEP 7 のもの／`main`（push 許可があればON） |
| 環境 | STEP 6 の環境 |
| スケジュール | `0 1,5,8,10 * * *`（UTC＝日本時間 10/14/17/19時） |
| プロンプト | `dm-watch/routine-prompt.md` の `---` の間 |
| コネクタ | なし |

作り方は、使えるものから順に：
1. **`/schedule` コマンドが使える場合**：Claude Code 内で `/schedule` を実行し、上の値を渡して作る
2. **ブラウザ操作が使える場合**：https://claude.ai/code のルーティン作成画面を開き、上の値をあなたが入力する（プロンプト欄には `routine-prompt.md` の該当部分を貼る）
3. **どちらも無い場合**：上の表と、プロンプト部分をコードブロックで表示して、担当者に作ってもらう

作成後、「今すぐ実行」を押す（またはブラウザで押す／担当者に押してもらう）。

## STEP 10｜初回実行の確認

数分待って、担当者に LINE に通知が来たか聞く。

- **来た** → 完了
- **来ない** → ルーティンの実行履歴（claude.ai/code）を確認する
  - `count: 0` で終了 → 新着DMがないだけ。正常。テスト用に別アカウントから自分にDMを送って「今すぐ実行」
  - `"stage": "auth"` → 環境の API credentials に `graph.instagram.com` が無い、またはトークンが違う
  - LINE 送信で `401` → API credentials に `api.line.me` が無い
  - LINE 送信で `400`（`to` 関連） → `LINE_TO_USER_ID` が違う、または友だち追加していない

## STEP 11｜完了を伝える

> 「導入できました。毎日 10時・14時・17時・19時 に自動で動き、新着DMがなければ何も届きません。
> Instagram のトークンは約60日で切れます。`事前準備ガイド.md` の『トークンの更新』を、発行から50日後を目安に行ってください。カレンダーにリマインドを入れておくのがおすすめです。」

---

## 変更・停止（担当者に頼まれたら）

| 変えたいこと | どこ |
|---|---|
| 確認する時刻 | ルーティンのスケジュール（UTC。日本時間 −9時間） |
| 判定基準・LINEの文面 | `dm-watch/routine-prompt.md` → ルーティンのプロンプトに貼り直す |
| 拾う時間幅 | 環境変数 `IG_WINDOW_HOURS` |
| 停止 | ルーティンを無効化（削除は担当者の明確な指示があるときだけ） |

**Instagram アカウント・Meta アプリ・LINE公式アカウント・環境の credentials は、担当者から明確に「消して」と言われない限り消さない。**
