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

すでに `soudan-yoyaku/` フォルダが手元にあるなら STEP 1 へ。

> 💡 依頼文で**ブランチ名**が指定されている場合は、`git clone -b <ブランチ名> …` で clone する（main にまだ取り込まれていない版を試すとき）。

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

> 💡 **実測で分かった操作のコツ（2026-09-08 の導入テスト）**
> - **座標クリック・`type` は入らないことがある**（Googleスプレッドシート／カレンダーの入力欄で発生）。
>   `find` で要素の参照を取り、`form_input` で値を入れるのが確実。
> - **Apps Script の「Google Apps Script API」トグルは画面上に描画されない**ことがある（サイズ0）。
>   `aria-label="Google Apps Script API の許可を切り替え"` の要素を JS で `.click()` すると切り替わる。
> - **GASエディタの「実行する関数」ドロップダウンは自動操作では選択できない**（後述 5-3）。
> - Googleの認可画面はポップアップで開く。ポップアップを掴めない場合は、
>   クリック前に `window.open` を「同じタブで遷移する」関数に差し替えると追える。

`node` が無い場合は https://nodejs.org の LTS を担当者に入れてもらう（インストーラの操作は担当者）。

## STEP 3｜Google の台帳とカレンダー（あなたが画面を進める）

> 「申し込み台帳のスプレッドシートを作ります。進めてよいですか？」

1. 新しいタブで https://sheets.new を開く（ログインは担当者）
2. タイトルを「相談予約 台帳」にする
3. URL から `/d/` と `/edit` の間を読み取り → **【SHEET_ID】** として担当者に見せて控えてもらう
4. カレンダーは、担当者に「普段のカレンダーに入れてよいか、相談専用を分けるか」を聞く。
   - 普段のカレンダーなら **【CALENDAR_ID】= `primary`**
   - **相談専用に分けるのを推奨**（テスト予約が本業の予定に混ざらない。他システムとカレンダー同期している人は必須）。作り方は次のとおり：
     1. `https://calendar.google.com/calendar/u/0/r/settings/createcalendar` を開く
     2. 「名前」に `相談予約` などを入れて「**カレンダーを作成**」（タイムゾーンは日本標準時のまま）
     3. 作成後、左ペインの「**マイカレンダーの設定**」に出てくるそのカレンダー名をクリック
     4. 下へスクロールして見出し「**カレンダーの統合**」の中の「**カレンダー ID**」（`〜@group.calendar.google.com`）を読み取る → **【CALENDAR_ID】**
   - 二次カレンダー（`@group.calendar.google.com`）でも Google Meet の自動発行は動く（2026-09-08 実測）

## STEP 4｜LINE の LIFF とトークン（あなたが画面を進める・トークンは担当者）

> 「LINE Developers で予約画面用の LIFF を作り、通知用のトークンを用意します。進めてよいですか？」

1. https://developers.line.biz/console/ を開く（ログインは担当者）
   - 未ログインだと「**LINEヤフーBusiness ID**」のログイン画面になる。選択肢は
     **LINEアカウント / メールアドレス / Yahoo! JAPAN ID / パスキーでログイン**。「前回のログイン」ラベルが付いているものが目印
2. **エルメと接続しているLINE公式アカウントが入っているプロバイダー**を開く（どれか分からなければ担当者に聞く）
   - 見分け方：そのプロバイダーの Messaging APIチャネルの「Messaging API設定」を開き、**Webhook URL が `cb.lmes.jp` を含んでいれば**それがエルメと繋がっているチャネル（**読むだけ。絶対に書き換えない**）
   - 🔴 **同じプロバイダーの中に作ること。** LINEの userId は**プロバイダー単位**で共通なので、別プロバイダーに作ると
     LIFFで取れる userId と push 先の userId がずれて、確認メッセージが 400 で失敗する（同一プロバイダー内で一致することは実測済み）
3. `事前準備ガイド.md` STEP 2-2 〜 2-4 の順に、あなたが操作する
   - 新規チャネル作成 → 種類は4つ（LINEログイン / Messaging API / ブロックチェーンサービス / LINEミニアプリ）から「**LINEログイン**」
   - 名前 `相談予約フォーム`、説明 `無料相談の予約画面`、アプリタイプ「ウェブアプリ」
   - ⚠️ **サービスを提供する地域＝日本**、**会社・事業者の所在国・地域＝日本**（未設定だと作成できない）
   - **2要素認証の必須化は既定ONのまま**にする（勝手に切らない）
   - ⚠️ 最後の「**LINE開発者契約 に同意します**」のチェックと「**作成**」は、**規約への同意なので担当者に押してもらう**
   - LIFF タブ → 追加：名前 `相談予約`、サイズ **Full**、エンドポイントURL は仮で `https://example.com`、
     Scope は **profile のみ**（`openid` は不要。このキットは `liff.getProfile()` しか使わない）、
     **友だち追加オプション**（旧「ボットリンク機能」）**On (Aggressive)**
   - 表示された **LIFF ID** を読み取り、担当者に見せて控えてもらう → **【LIFF_ID】**
   - 🔴 **リンクされたLINE公式アカウントは自動で紐づかない。** チャネル基本設定 →「友だち追加オプション」→
     「リンクされたLINE公式アカウント」→ **編集 → エルメと繋がっているMessaging APIチャネルを選択 → 更新**。
     初期値は `–` なので、ここを飛ばすと友だち追加が動かない
   - ⚠️ 作成直後のチャネルは **「開発中」**。担当者本人はテストできるが**他の人は予約画面を開けない**。
     STEP 8 のテストが通ったら、チャネル名の横の「開発中」バッジから「**公開**」に切り替えるよう担当者に伝える
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
→ ブラウザが開く。担当者にログインと許可をしてもらう。ここで出る画面（2026-09-08 実測）：

1. **「アカウントを選択してください」** … Googleアカウントを複数持っている人は候補が並ぶ。
   **必ず STEP 3 の台帳・カレンダーを作ったのと同じアカウント**を選ぶ（別アカウントを選ぶと後で `selfCheck` がカレンダーNGになる）
2. **「clasp – The Apps Script CLI にログイン」** → 「次へ」
3. **「clasp – The Apps Script CLI がアクセスできる情報を選択してください」**
   … ⚠️ 権限が**項目ごとのチェックボックス**になっている。
   **「すべて選択」にチェックを入れてから続行する**。1つでも外すと clasp が権限不足で失敗する
4. ブラウザに `Logged in! You may close this page.` と出れば完了

初めて clasp を使う Google アカウントでは、https://script.google.com/home/usersettings で「Google Apps Script API」を**オン**にする必要がある（ブラウザ操作で開いてスイッチを押す／担当者に押してもらう）。
オンにしたあとページを再読み込みして、表示が「オン」のままであることを確認する。

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
> 🔴 **`clasp create` の直後に必ずやること（2026-09-08 実測・これを飛ばすと壊れる）**
>
> `clasp create ... --rootDir .` は、**作ったばかりの空プロジェクトの `appsscript.json` を手元に上書きコピーする**。
> その結果、キット同梱の `appsscript.json`（649バイト）が**Googleの初期状態（124バイト）に置き換わる**。
> 消えるのは次の4つ ——
> `timeZone: Asia/Tokyo`（→ `America/New_York` になる）／`enabledAdvancedServices`（Calendar v3＝Meet発行）／
> `webapp`（`access: ANYONE_ANONYMOUS` ＝お客様がログインなしで使える設定）／`oauthScopes` 5件。
>
> **このまま `clasp push -f` すると、Meetが付かず・お客様がアクセスできないシステムが公開される。**
> `clasp create` の直後、`clasp push` の前に、キットの `appsscript.json` を**必ず書き戻す**：
>
> **Mac / Linux**（キットが git clone したものなら）
> ```
> git checkout -- appsscript.json
> ```
> git を使っていない場合は、Zip や別の控えから `gas/appsscript.json` を上書きコピーする。
>
> 書き戻せたかの確認（この4つが全部あればOK）：
> ```
> grep -c "Asia/Tokyo\|enabledAdvancedServices\|ANYONE_ANONYMOUS\|oauthScopes" appsscript.json
> ```
> → `4` と出れば正しい。`0` なら上書きされたままなので書き戻す。

- 上記を直したうえで `clasp push -f` すると、`Code.gs` と `appsscript.json` の2ファイルが push される
- `clasp` v3 では `Code.gs` はそのまま push される（`cp Code.gs Code.js` の回避策は不要。v2 を使っている場合のみ必要）

### 5-3. 初期設定と権限の許可（画面）
```
clasp open-script
```
（`clasp open` は v3 で廃止された。v2 を使っている場合のみ `clasp open`）

→ GASエディタが開く。ここからはブラウザ操作（使えなければ担当者に案内）：

> ⚠️ **「実行する関数」ドロップダウンは AI が自動操作できない**（2026-09-08 実測）。
> ref クリック・JSクリック・キーボード操作のどれでも選択が反映されない。
> したがって **`applyDefaultConfig` / `selfCheck` / `installReminderTrigger` の3つの実行は担当者にやってもらう**。
> 担当者に頼むときの言い方 → 「画面の上の方に関数名が出ているプルダウンがあります。そこから `applyDefaultConfig` を選んで、
> 左の『▶ 実行』を押してください」
>
> 担当者がすぐ動けない場合は、`applyDefaultConfig` を飛ばして次の 3. に進んでよい。
> `Code.gs` は全項目にコード側の初期値を持っているので、**手で入れるのは下の表の4つ＋（昼休みを使うなら）`LUNCH_START`/`LUNCH_END` だけ**で同じ状態になる
> （`applyDefaultConfig` を実行しない場合、昼休みだけは「なし」が初期値になるため）。
> ただし **`installReminderTrigger` を実行しないと前日リマインドは動かない**ので、これは必ず担当者にやってもらう。

1. 関数選択で **`applyDefaultConfig`** を選び「実行」→ 初回は権限の許可画面が出るので**担当者に許可してもらう**（「詳細」→「（安全ではないページ）に移動」→「許可」）
2. 実行ログに「手で入れる必要がある項目: CALENDAR_ID, SHEET_ID, LINE_CHANNEL_ACCESS_TOKEN, HOST_NAME」と出る
3. 左端の歯車「**プロジェクトの設定**」→ 下へスクロールしてセクション「**スクリプト プロパティ**」→
   「**スクリプト プロパティを追加**」で行を増やし、入れ終わったら「**スクリプト プロパティを保存**」を押す
   （保存されるとボタンが「スクリプト プロパティを編集」に変わる。これが保存できた合図）。
   **トークン以外はあなたが入力**、トークンの値だけ担当者に貼ってもらう
   - `CALENDAR_ID` = STEP 3 の値
   - `SHEET_ID` = STEP 3 の値
   - `HOST_NAME` = 担当者の名前（聞く）
   - `LINE_CHANNEL_ACCESS_TOKEN` = ← 担当者が貼る（STEP 4 で保留なら後で）
   - 任意：`ADMIN_LINE_USER_ID`
4. 営業時間などを変えたいか担当者に聞く（`BUSINESS_START` / `BUSINESS_END` / `WEEKDAYS` など。初期値は平日10〜18時・60分枠・昼休み12〜13時）
5. **オンライン相談のツールを担当者に聞く**（「Google Meet と Zoom、どちらで相談されていますか？」）
   - **Google Meet** → 何もしない（既定。予約ごとにMeetのURLを自動発行する）
   - **Zoom** → `MEETING_TOOL` = `zoom`、`ZOOM_URL` = 担当者のZoom固定URL（`https://us06web.zoom.us/j/…` の形）を入れる。
     Zoom側の設定変更やAPI連携は不要。1枠1予約なので固定URLで問題ないが、気になる場合はZoomの待機室をONにしてもらう
   - **どちらでもない／あとで手動で送る** → `MEETING_TOOL` = `none`
   - Zoom や none にした場合は、`frontend/config.js` の `SERVICE_NOTE`（初期値「Google Meet でのオンライン相談です」）も
     合わせて書き換える

> ⚠️ **スクリプトプロパティは「行の追加」はできても「既存の値の書き換え」が自動操作で通らない**（2026-09-08 実測）。
> 新しい行を足して保存するのは問題ないが、**すでにある行の値を変える必要が出たら担当者に頼むこと**
> （「編集」→ 値を書き換え →「スクリプト プロパティを保存」）。
6. 関数選択で **`selfCheck`** を実行 → ログに「カレンダー: OK」「スプレッドシート: OK」「LINEトークン: 設定あり」を確認
   - `MEETING_TOOL` を `zoom` にした場合は「会議ツール: Zoom（固定URL） OK」も出る。`NG ZOOM_URL が未設定です` なら値を入れ忘れている
7. 関数選択で **`installReminderTrigger`** を実行（前日リマインドの自動実行を登録）

### 5-4. デプロイ
```
clasp deploy --description "v1"
```
→ 表示される **Deployment ID**（`AKfycb…`）から、ウェブアプリURLを組み立てる：
```
https://script.google.com/macros/s/【Deployment ID】/exec
```
これを **【API_URL】** とする。

> 🔴 **デプロイした直後に一度、ブラウザで【API_URL】を開く**（2026-09-08 実測・飛ばすと動かない）
>
> スクリプトの権限をまだ一度も許可していない状態でデプロイすると、Webアプリが認可待ちのままになる。
> このとき `curl` からは JSON ではなく HTML が返り、中身は
> **「アクセスが拒否されました / ドライブ アクセス権が必要です」**という、
> 一見デプロイ設定のミスに見える別のメッセージになる（`webapp.access` を疑っても直らない）。
>
> 直し方：ブラウザで `【API_URL】?action=ping` を開くと **「Authorization needed」** と出る。
> **REVIEW PERMISSIONS** → 「このアプリは Google で確認されていません」→ **詳細** →
> 「**（このプロジェクト名）（安全ではないページ）に移動**」→ 権限一覧で **「すべて選択」** → 続行。
> `Authorization successful.` と出れば完了（この許可操作は担当者に頼む）。
> ※ 5-3 で担当者が `applyDefaultConfig` などを実行して許可済みなら、この手順は不要。

確認：
```
curl -sL "【API_URL】?action=ping"
```
`{"ok":true,"now":"..."}` が返ればOK（Windows は `Invoke-WebRequest -Uri "…" | Select-Object -Expand Content`）。
続けて空き枠も確認する：
```
curl -sL "【API_URL】?action=slots&from=<今日>&to=<7日後>"
```
`{"ok":true,"days":{...}}` に平日の時刻が並び、昼休みの時刻が抜けていれば設定が効いている。

> ⚠️ 予約の POST を `curl` で試すときは **`--post302` などを付けない**（リダイレクト先が 405 を返す）。
> `curl -sL -H "Content-Type: application/json" -d '{...}' "【API_URL】"` の形にする。
> なお **405 が返っても予約自体は成立している**ことがあるので、失敗と決めつけて再送しない（二重予約になる）。

> `clasp deploy` が使えない場合は、`clasp open-script` で開いたエディタから「デプロイ」→「新しいデプロイ」→ ウェブアプリ／自分として実行／全員 でデプロイし、URLを読み取る。

> 🔴 **2回目以降のデプロイは、必ず `-i` で同じ Deployment ID を指定する**（2026-09-08 実測）
> ```
> clasp deploy -i 【Deployment ID】 --description "v2"
> ```
> `-i` を付けずに `clasp deploy` すると、**別の Deployment ID（＝別のURL）が新しく作られる**。
> 既に `config.js` や LIFF に設定済みのURLは古いコードのままになり、
> 「直したはずなのに動きが変わらない」という状態になる。
> 現在のデプロイ一覧は `clasp list-deployments` で確認できる。

## STEP 6｜予約画面を公開する（あなたが実行）

> 「予約画面を Vercel に公開します。Vercel のログインをお願いします。進めてよいですか？」

1. `frontend/config.js` を編集：`LIFF_ID`【LIFF_ID】、`API_URL`【API_URL】、`HOST_NAME`、必要なら `TOPICS` / `ACCENT`（担当者に希望を聞く）。編集結果を見せて確認してもらう

> 💡 **公開の前にローカルで動作確認できる**（2026-09-08 実測・おすすめ）
> `LIFF_ID` が空でも、予約画面は LINE を経由せず空き枠の取得まで動く（`index.html` がその分岐を持っている）。
> `API_URL` と `HOST_NAME` だけ入れた状態で：
> ```
> cd "<このキットのパス>/frontend" && python3 -m http.server 8777
> ```
> ブラウザで `http://localhost:8777/index.html?src=story` を開く。
> カレンダーが出て、日付を選ぶと空き時間が並べば **GAS との疎通は完成している**（CORSも問題なし）。
> ここで出なければ、LINE や Vercel ではなく STEP 5 側の問題だと切り分けられる。確認できたらサーバーは止める。

2. 公開：
   ```
   npm install -g vercel
   vercel login            ← 担当者がログイン
   cd "<このキットのパス>/frontend"
   vercel --prod --yes
   ```
   プロジェクト名は `soudan-yoyaku`。`vercel --prod` の質問はすべて Enter（既定値）でよい。

   > ⚠️ **`vercel login` は「デバイスコード方式」に変わっている**（Vercel CLI 59.11.7 で実測。2026-09-08）
   > 対話プロンプト（GitHub/GitLab/Email を矢印キーで選ぶ）は**もう出ない**。代わりに
   > ```
   > Visit https://vercel.com/oauth/device?user_code=XXXX-XXXX
   > Waiting for authentication...
   > ```
   > とだけ表示されて待ち状態になる。担当者にこのURLをブラウザで開いてもらい、
   > Vercel にログイン（**「Continue with GitHub」が既定**）して承認してもらう。
   > 承認するとターミナル側が自動で先へ進む。**このログインはAIが代行しない**（担当者のアカウントにログインするため）。
   > Vercel アカウントが無い場合は、その場で Sign Up（GitHubアカウントがあれば数クリック）。

3. 🔴 **`vercel --prod` が最後に表示するURLは使わない。**
   表示されるのは `soudan-yoyaku-<ランダム>-<アカウント名>.vercel.app` という**そのデプロイ専用の固定URL**で、
   次にデプロイすると別のURLになる。これを LIFF に設定すると、更新するたびに予約画面が壊れる。
   **安定URLを取り直すこと**：
   ```
   vercel project ls
   ```
   → 表の「**Latest Production URL**」の値が安定URL（例 `https://soudan-yoyaku-ten.vercel.app`）。これを **【FRONT_URL】** とする
   - プロジェクト名 `soudan-yoyaku` は他の人が使っていると取れないため、`-ten` のような接尾辞が自動で付くことがある（実測）。
     手順書の名前と違っても問題ない
   - 公開できているかの確認：`curl -sL -o /dev/null -w "%{http_code}\n" 【FRONT_URL】` が `200` を返すこと

> ⚠️ **`config.js` を書いたまま git にコミットしない。** キットを `git clone` で取った場合、
> `config.js` には【API_URL】が入る。公開リポジトリに戻す予定があるなら、
> 記入した `config.js` はコミット対象から外すこと（テスト後は `git checkout -- frontend/config.js` で戻せる）。

## STEP 7｜LIFF のエンドポイントを差し替える（あなたが画面を進める）

LINE Developers → LINEログインチャネル → LIFF → 一覧の**右端の「＞」**で `相談予約` の詳細を開き、
「エンドポイントURL」の **編集** → **【FRONT_URL】** に変更 → **更新**（末尾 `/` なし）。
再読み込みして値が変わっていることを確認する。

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
| **担当者は開けるのに、他の人だと予約画面が開かない** | LINEログインチャネルが **「開発中」** のまま。チャネル名の横のバッジから「公開」に切り替える |
| **LINE通知だけ来ない（予約とカレンダーは動く）** | LIFFを**エルメとは別のプロバイダー**に作っていないか。userIdはプロバイダー単位なので、ずれると push が 400 になる |
| **一度は動いたのに、更新したら予約画面が開かなくなった** | LIFF のエンドポイントにデプロイ固有URL（`…-<ランダム>-….vercel.app`）を設定していないか。`vercel project ls` の Latest Production URL に直す |
| 予約画面を開いても友だち追加されない | LINEログインチャネルの「リンクされたLINE公式アカウント」が `–` のまま（自動では紐づかない） |
| **API_URL を開くと「アクセスが拒否されました／ドライブ アクセス権が必要です」** | **スクリプトが未認可**。STEP 5-4 の「デプロイした直後に一度ブラウザで開く」をやる。`webapp.access` の問題ではない |
| 「空き枠を取得できませんでした」 | まず上の「未認可」を疑う。次に `appsscript.json` の `webapp.access` が `ANYONE_ANONYMOUS` か（STEP 5-2 の書き戻しを忘れると初期値に戻っている）。`selfCheck` のログ |
| 空き枠が1日も出ない／`days` が空 | `CALENDAR_ID` の綴り。`WEEKDAYS`・`BUSINESS_START/END`・`MIN_LEAD_HOURS`（24時間以内の枠は出ない仕様） |
| LINE通知が来ない | プロパティ `LINE_CHANNEL_ACCESS_TOKEN`。GASの「実行数」画面のエラー |
| 前日リマインドが来ない | `installReminderTrigger` を実行したか（AIは実行できないので担当者がやる）。GASの「マイトリガー」に1件あるか |
| 画面が真っ白 | `config.js` の記法ミス。ブラウザのコンソール |
| Meet のURLが付かない | `appsscript.json` の `enabledAdvancedServices`（STEP 5-2 の書き戻し）。付かなくても予約は動く |
| タイムゾーンが9時間ずれる | `appsscript.json` の `timeZone` が `America/New_York` になっている＝STEP 5-2 の書き戻し漏れ |

> ✅ **STEP 8 が通ったら、担当者に次の2つを必ずやってもらう**（どちらもAIは代行できない）
> 1. **GASエディタで `installReminderTrigger` を実行**（前日リマインドの登録。やらないと**リマインドだけ静かに動かない**）
> 2. **LINEログインチャネルを「開発中」→「公開」に切り替え**（お客様が開けるようにする）

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
| 裏側の処理 | `gas/Code.gs` を直して `clasp push -f` → `clasp deploy -i 【Deployment ID】`（同じURLのまま更新。v3 の正式名は `clasp create-deployment -i`）。画面からやる場合は「デプロイ」→「デプロイを管理」→鉛筆→バージョン「新バージョン」→「デプロイ」 |
| 停止 | LIFF のエンドポイントを外す、または Vercel のプロジェクトを止める（削除は担当者の明確な指示があるときだけ） |

**Messaging APIチャネル・エルメの設定・スプレッドシート・カレンダーは消さない。**
