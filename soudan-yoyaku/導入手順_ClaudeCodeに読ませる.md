# 【AIエージェントへの指示】相談予約システムの導入

このファイルを読んだAI（Claude Code など）へ。**あなたが主導して**導入を進めてください。
担当者（人間）にやってもらうのは、原則として次の2つだけです。

1. **ログイン**（Google・LINE・Vercel・GitHub）と、Google の**権限の許可画面**
2. **秘密の値の貼り付け**（LINE のチャネルアクセストークン）

それ以外——画面の遷移、ボタン操作、入力、ファイル配置、コマンド実行、公開——は、使えるツールの範囲で**あなたが行います**。

> ⚠️ **絶対に守ること**
> - **確認を取る前に、外部サービスの状態を変えない。** 各STEPの冒頭で「これから○○します。進めてよいですか？」と聞き、「はい」をもらってから進める（STEP内の個々のクリックは都度聞かなくてよい）
> - **パスワード・2段階認証コードを入力しない。** ログイン画面が出たら担当者に交代し、終わったら再開する
> - **トークンを扱わない。** 画面に表示されたトークンを、チャットに書き出さない・ファイルに保存しない・コミットしない。貼り付け先には担当者本人に貼ってもらう
> - **既存のものを消さない。** `rm -rf` / `mv` を使わない。他のフォルダ・リポジトリ・チャネル・GASプロジェクトに触らない
> - **LINE公式アカウントの Webhook URL と、チャネルアクセストークンの「再発行」ボタンは押さない。** エルメが止まる
> - **押す前に止まって聞くもの：** 削除・再発行・課金。直前に必ず担当者に確認する

> 💻 Mac / Windows 共通。コマンドはOSごとに書き分けてあります。

---

## STEP 0｜キットを手に入れる

すでに `soudan-yoyaku/` フォルダが手元にあるなら STEP 1 へ。> 💡 依頼文で**ブランチ名**が指定されている場合は、`git clone -b <ブランチ名> …` で clone する（main にまだ取り込まれていない版を試すとき）。

URLだけ渡された場合は取得する（公開リポジトリなのでログイン不要）：

**Mac / Linux**
```
cd ~/Desktop && git clone https://github.com/ryoya9595/my-ai-news.git soudan-yoyaku-src
```
**Windows（PowerShell）**
```
Set-Location "$HOME\Desktop"; git clone https://github.com/ryoya9595/my-ai-news.git soudan-yoyaku-src
```
→ `soudan-yoyaku-src/soudan-yoyaku/` がキット本体。git が無ければ Zip：`https://github.com/ryoya9595/my-ai-news/raw/main/soudan-yoyaku-system.zip` を `curl -sSL -o` / `Invoke-WebRequest` で取得して解凍。

取得したら `はじめにお読みください.md` と `事前準備ガイド.md` も読む（後者は、あなたが画面を進めるときの台本）。

## STEP 1｜全体像を説明し、確認を取る

> 相談予約システムを導入します。LINE公式のリッチメニューから開く予約画面で、お客様が日時を選ぶと、Googleカレンダーに予定が入り（Google Meet付き）、台帳スプレッドシートに記録され、お客様のLINEに確認メッセージが届きます。前日リマインドも自動です。エルメの設定には触りません。
>
> お願いするのは**ログインと権限の許可、トークンの貼り付け**だけです。それ以外の設定は私が進めます。所要時間は 40〜70分ほど。途中で何度か「進めてよいですか？」と確認します。

> 「まず、お使いのPCとアカウントの状況を確認します。よろしいですか？（はい／いいえ）」

「はい」以外なら進めない。

## STEP 2｜自分に何ができるか確認する

| 確認 | 方法 | 使えると |
|---|---|---|
| **ブラウザ操作**（Claude in Chrome） | `mcp__claude-in-chrome__*` があるか。deferred なら `ToolSearch` で `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__get_page_text` を読み込み、`tabs_context_mcp` を呼ぶ | LINE Developers・GAS・Google の画面をあなたが操作できる |
| `node` / `npm` | `node --version` | `clasp`（GASをコマンドで置く）と `vercel` が使える |
| `git` | `git --version` | — |

ブラウザ操作のルール：新しいタブを作ってそのタブだけ操作／ログイン画面は担当者に交代／名称が違っても同じ意味の項目を探す／ID・URL（トークン以外）はチャットで見せて「控えメモ」に転記してもらう。
ブラウザ操作が使えない場合は、該当STEPを `事前準備ガイド.md` の読み上げ案内に切り替える。
`node` が無い場合は https://nodejs.org の LTS を担当者に入れてもらう（インストーラの操作は担当者）。

## STEP 3｜Google の台帳とカレンダー（あなたが画面を進める）

> 「申し込み台帳のスプレッドシートを作ります。進めてよいですか？」

1. 新しいタブで https://sheets.new を開く（ログインは担当者）
2. タイトルを「相談予約 台帳」にする
3. URL から `/d/` と `/edit` の間を読み取り → **【SHEET_ID】** として担当者に見せて控えてもらう
4. カレンダーは、担当者に「普段のカレンダーに入れてよいか、相談専用を分けるか」を聞く。普段のカレンダーなら **【CALENDAR_ID】= `primary`**。分ける場合は Googleカレンダーで新規作成し、設定の「カレンダーID」を読み取る

## STEP 4｜LINE の LIFF とトークン（あなたが画面を進める・トークンは担当者）

> 「LINE Developers で予約画面用の LIFF を作り、通知用のトークンを用意します。進めてよいですか？」

1. https://developers.line.biz/console/ を開く（ログインは担当者）
2. **エルメと接続しているLINE公式アカウントが入っているプロバイダー**を開く（どれか分からなければ担当者に聞く）
3. `事前準備ガイド.md` STEP 2-2 〜 2-4 の順に、あなたが操作する
   - 新規チャネル →「LINEログイン」→ 名前 `相談予約フォーム`、アプリタイプ「ウェブアプリ」
   - LIFF タブ → 追加：名前 `相談予約`、サイズ **Full**、エンドポイントURL は仮で `https://example.com`、Scope **profile / openid**、ボットリンク **On (Aggressive)**
   - 表示された **LIFF ID** を読み取り、担当者に見せて控えてもらう → **【LIFF_ID】**
   - ボットリンク先に、エルメと接続している Messaging API チャネルを選ぶ
4. **トークン**（STEP 2-5）：Messaging API チャネルの「Messaging API設定」→ チャネルアクセストークン（長期）を見る
   - 「**発行**」ボタンだけ → 押してよいか担当者に確認してから押す。表示されたトークンは**読まない・書かない**。担当者にパスワード管理ツールへ保存してもらう
   - トークンが**表示されている** → 担当者にそれを保存してもらう。「再発行」は押さない
   - 「**再発行**」しか無い → **押さない**。「トークンが見えない状態なので、別の方法が必要です。担当者（りょうや）に相談してください」と伝えて、このSTEPは保留にして先へ進む（GASのプロパティは後で入れられる）
5. 任意：「チャネル基本設定」→「あなたのユーザーID」を読み取って控えてもらう → **【ADMIN_LINE_USER_ID】**（予約が入ったとき本人にも通知する用）

## STEP 5｜GAS を置いてデプロイする（あなたが実行）

> 「裏側の処理（Google Apps Script）を作成して公開します。Google のログインと権限の許可をお願いします。進めてよいですか？」

### 5-1. clasp を用意
```
npm install -g @google/clasp
clasp login
```
→ ブラウザが開く。担当者にログインと許可をしてもらう。
初めて clasp を使う Google アカウントでは、https://script.google.com/home/usersettings で「Google Apps Script API」を**オン**にする必要がある（ブラウザ操作で開いてスイッチを押す／担当者に押してもらう）。

### 5-2. プロジェクト作成と push

**Mac / Linux**
```
cd "<このキットのパス>/gas"
clasp create --type standalone --title "相談予約システム" --rootDir .
clasp push -f
```
**Windows（PowerShell）**
```
Set-Location "<このキットのパス>\gas"
clasp create --type standalone --title "相談予約システム" --rootDir .
clasp push -f
```
- `Code.gs` と `appsscript.json` が push される（`appsscript.json` に Google Calendar API の有効化と Web app 設定が入っている）
- `clasp push` が `Code.gs` を無視する場合は `cp Code.gs Code.js`（Windows: `Copy-Item`）してから再度 push

### 5-3. 初期設定と権限の許可（画面）
```
clasp open
```
→ GASエディタが開く。ここからはブラウザ操作（使えなければ担当者に案内）：
1. 関数選択で **`applyDefaultConfig`** を選び「実行」→ 初回は権限の許可画面が出るので**担当者に許可してもらう**（「詳細」→「（安全ではないページ）に移動」→「許可」）
2. 実行ログに「手で入れる必要がある項目: CALENDAR_ID, SHEET_ID, LINE_CHANNEL_ACCESS_TOKEN, HOST_NAME」と出る
3. 設定（歯車）→「スクリプト プロパティ」→ 次を追加。**トークン以外はあなたが入力**、トークンの値だけ担当者に貼ってもらう
   - `CALENDAR_ID` = STEP 3 の値
   - `SHEET_ID` = STEP 3 の値
   - `HOST_NAME` = 担当者の名前（聞く）
   - `LINE_CHANNEL_ACCESS_TOKEN` = ← 担当者が貼る（STEP 4 で保留なら後で）
   - 任意：`ADMIN_LINE_USER_ID`
4. 営業時間などを変えたいか担当者に聞く（`BUSINESS_START` / `BUSINESS_END` / `WEEKDAYS` など。初期値は平日10〜18時・60分枠・昼休み12〜13時）
5. 関数選択で **`selfCheck`** を実行 → ログに「カレンダー: OK」「スプレッドシート: OK」「LINEトークン: 設定あり」を確認
6. 関数選択で **`installReminderTrigger`** を実行（前日リマインドの自動実行を登録）

### 5-4. デプロイ
```
clasp deploy --description "v1"
```
→ 表示される **Deployment ID**（`AKfycb…`）から、ウェブアプリURLを組み立てる：
```
https://script.google.com/macros/s/【Deployment ID】/exec
```
これを **【API_URL】** とする。確認：
```
curl -sL "【API_URL】?action=ping"
```
`{"ok":true,...}` が返ればOK（Windows は `Invoke-WebRequest -Uri "…" | Select-Object -Expand Content`）。

> `clasp deploy` が使えない場合は、`clasp open` で開いたエディタから「デプロイ」→「新しいデプロイ」→ ウェブアプリ／自分として実行／全員 でデプロイし、URLを読み取る。

## STEP 6｜予約画面を公開する（あなたが実行）

> 「予約画面を Vercel に公開します。Vercel のログインをお願いします。進めてよいですか？」

1. `frontend/config.js` を編集：`LIFF_ID`【LIFF_ID】、`API_URL`【API_URL】、`HOST_NAME`、必要なら `TOPICS` / `ACCENT`（担当者に希望を聞く）。編集結果を見せて確認してもらう
2. 公開：
   ```
   npm install -g vercel
   vercel login            ← 担当者がログイン
   cd "<このキットのパス>/frontend"
   vercel --prod --yes
   ```
   質問はすべて Enter（既定値）。プロジェクト名は `soudan-yoyaku`
3. 表示された `https://….vercel.app` → **【FRONT_URL】**

## STEP 7｜LIFF のエンドポイントを差し替える（あなたが画面を進める）

LINE Developers → LINEログインチャネル → LIFF → `相談予約` を開き、エンドポイントURL を **【FRONT_URL】** に変更して保存（末尾 `/` なし）。

## STEP 8｜テスト

担当者に、スマホのLINEで `https://liff.line.me/【LIFF_ID】?src=line` を開いてもらう（自分宛にトークで送ってタップ）。

1. 初回だけ「プロフィール情報の利用を許可」の画面が出る → 許可
2. 空き時間が表示される → 1件予約
3. あなたが確認する：カレンダーに予定（`clasp open` のカレンダー、またはブラウザ操作で https://calendar.google.com）／スプレッドシートに1行／担当者のLINEに確認メッセージ
4. 担当者に、**エルメのテスト配信が今までどおり届くか**も確認してもらう
5. テスト予約はカレンダーから削除（担当者に確認してから）

うまくいかないとき：

| 症状 | 見るところ |
|---|---|
| 「設定が未完了です」 | `config.js` の `LIFF_ID` / `API_URL`。再デプロイ忘れ |
| 「空き枠を取得できませんでした」 | `appsscript.json` の `webapp.access` が `ANYONE_ANONYMOUS` か。`selfCheck` のログ |
| LINE通知が来ない | プロパティ `LINE_CHANNEL_ACCESS_TOKEN`。GASの「実行数」画面のエラー |
| 画面が真っ白 | `config.js` の記法ミス。ブラウザのコンソール |
| Meet のURLが付かない | `appsscript.json` の `enabledAdvancedServices`。付かなくても予約は動く |

## STEP 9｜完了を伝える

> 「導入できました。リンクを置く場所ごとに末尾を変えると、台帳に経路が記録されます：
> エルメのリッチメニュー `?src=line`／Instagramストーリーズ `?src=story`／プロフィール `?src=profile`（いずれも `https://liff.line.me/【LIFF_ID】` の後ろ）。
> 営業時間や枠の長さは、GASのスクリプトプロパティを変えるだけで反映されます。」

エルメのリッチメニューへの設定は、担当者がエルメの管理画面で行う（ブラウザ操作が使えれば、リンク先の入力を手伝う）。

---

## 更新・停止（担当者に頼まれたら）

| 変えたいこと | どうする |
|---|---|
| 画面の文言・色・選択肢 | `frontend/config.js` → `vercel --prod --yes` |
| 営業時間・枠・リマインド時刻 | GASのスクリプトプロパティ（再デプロイ不要） |
| 裏側の処理 | `gas/Code.gs` を直して `clasp push -f` → `clasp deploy -i 【Deployment ID】`（同じURLのまま更新） |
| 停止 | LIFF のエンドポイントを外す、または Vercel のプロジェクトを止める（削除は担当者の明確な指示があるときだけ） |

**Messaging APIチャネル・エルメの設定・スプレッドシート・カレンダーは消さない。**
