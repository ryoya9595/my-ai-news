# 【Claude Codeへの指示】AIニュースリサーチ・スキルの導入

このファイルを読んだAIへ。以下の手順で進めてください。

> ⚠️ **重要①：確認を取る前に、勝手にインストールしないこと。**
> ステップ2で担当者から明確な「はい」をもらうまで、ファイルのコピーや設定変更は一切しないでください。
>
> ⚠️ **重要②：既存のデータ・既存のスキルを絶対に消さないこと。**
> この導入で行う変更は「`~/.claude/skills/my-ai-news/` フォルダを新しく1つ作って、SKILL.mdを1つ置く」だけです。
> - `rm` / `rm -rf` / `mv` は**一切使わない**（`mkdir -p` と `cp` だけで完結します）
> - `~/.claude/skills/` の中にある**他のスキルフォルダには一切触らない**（中身を見る必要もありません）
> - `~/.claude/settings.json`・`CLAUDE.md`・メモリ等、既存の設定ファイルは**書き換えない**
> - `~/.claude/skills/my-ai-news/` が**すでに存在した場合**は、上書きせずに担当者に
>   「同名のスキルがすでにあります。上書きしますか？（既存の内容は消えます）」と確認してから進めること

> 💻 **Mac / Windows 共通で使えます。** コマンドはOSごとに書き分けてあるので、担当者の環境に合う方を使ってください。
> - **Mac / Linux**、または Windows で **Git Bash** が使える場合 → 「Mac / Linux」の欄
> - **Windows で PowerShell** の場合 → 「Windows」の欄
> - 迷ったら、まず「Mac / Linux」の欄を実行してみて、`command not found` 等で失敗したら Windows 欄に切り替える

---

## ステップ0：Zipのまま渡された場合（解凍済みなら飛ばす）

担当者が **`my-ai-news-skill.zip` をそのまま渡してきた**場合は、先に解凍します。

1. 担当者に「Zipを解凍してよいですか？」と確認する
2. **Zipと同じ場所に**解凍する（既存フォルダを上書きしないよう、解凍先は必ず新しいフォルダにする）

   **Mac / Linux**
   ```
   unzip "<zipのパス>" -d "<zipがあるフォルダ>"
   ```
   **Windows（PowerShell）**
   ```
   Expand-Archive -Path "<zipのパス>" -DestinationPath "<zipがあるフォルダ>"
   ```
3. 出てきた `my-ai-news-kit` フォルダの中の、このファイル（`導入手順_ClaudeCodeに読ませる.md`）の場所を控えて、ステップ1へ進む

---

## ステップ1：まず内容を説明する（インストールはまだしない）

担当者に、これから入れるものを次の内容で説明してください。

> 「AIニュースリサーチ」というスキルを導入できます。
>
> **やること**：Chrome拡張（Claude in Chrome）であなたのXアカウントを開き、「フォロー中」タイムラインを巡回して、その日のAI最新情報（新ツール・新モデル・アップデート）を箇条書きにまとめます。拾った投稿にはその場で「いいね」を付けます。
>
> **入る場所**：`~/.claude/skills/my-ai-news/`（ファイルが1つ増えるだけです）
>
> **使うときの合図**：`/my-ai-news` または「AIニュース調べて」
>
> **必要なもの**：
> - Claude in Chrome（Chrome拡張）が有効になっていること
> - あなた自身のXアカウントでログインできること
>
> **このスキルが自動でやること／やらないこと**：
> - やる：タイムラインを読む／AI関連の投稿に「いいね」を押す
> - やらない：ポスト・リポスト・返信・DM・フォロー解除（フォロー追加は必ず確認してから）
> - Xのログイン情報をAIが入力することはありません

## ステップ2：導入してよいか確認を取る

上の説明のあと、こう聞いてください：

> 「このスキルを `~/.claude/skills/my-ai-news/` に導入してよろしいですか？（はい／いいえ）」

- **「はい」以外**（いいえ・保留・質問だけ）の場合は、**導入せずに待つ**。質問には答えてよいが、勝手に進めない
- 「はい」をもらったらステップ3へ

## ステップ3：導入する

「はい」をもらってから、以下を実行してください。やることは「**一覧を見る → フォルダを1つ作る → ファイルを1つコピーする**」の3つだけ。削除・移動系のコマンドは使いません。

※ `<このキットのパス>` は、担当者がZipを解凍した場所（`my-ai-news-kit` フォルダ）に読み替えてください。

### 3-0. 同名スキルがすでにないか確認する

**Mac / Linux**
```
ls ~/.claude/skills/ 2>/dev/null
```
**Windows（PowerShell）**
```
Get-ChildItem "$env:USERPROFILE\.claude\skills" -ErrorAction SilentlyContinue
```

- `my-ai-news` が既にある → 「同名のスキルがすでにあります。上書きしますか？」と確認してから次へ
- 他のスキルが並んでいても**それらには一切触らない**

### 3-1. コピー先フォルダを作る（既存フォルダは消えません）

**Mac / Linux**
```
mkdir -p ~/.claude/skills/my-ai-news
```
**Windows（PowerShell）**
```
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\my-ai-news"
```

### 3-2. SKILL.md をコピーする

**Mac / Linux**
```
cp "<このキットのパス>/my-ai-news/SKILL.md" ~/.claude/skills/my-ai-news/SKILL.md
```
**Windows（PowerShell）**
```
Copy-Item "<このキットのパス>\my-ai-news\SKILL.md" "$env:USERPROFILE\.claude\skills\my-ai-news\SKILL.md"
```

### 3-3. コピーできたか確認する

**Mac / Linux**
```
ls -la ~/.claude/skills/my-ai-news/
```
**Windows（PowerShell）**
```
Get-ChildItem "$env:USERPROFILE\.claude\skills\my-ai-news"
```

### 3-4. 完了を伝える
> 「導入できました。**Claude Codeを一度再起動**してから、`/my-ai-news` と打つと使えます。」

## ステップ4：Claude in Chrome（Chrome拡張）が使えるか確認する

**このスキルはChrome拡張がないと動きません。** 導入した直後にここで確認して、足りなければ先に入れてもらいます（初回実行時に判明すると二度手間になるため）。

1. 自分が使えるツールの中に、ブラウザ操作ツール（`mcp__claude-in-chrome__*`。例：`tabs_context_mcp`, `navigate`, `read_page`）があるか確認する
2. あるようなら、実際に軽く動かして確認する：
   - `tabs_context_mcp` を呼んでタブ一覧が取れるか見る
   - 取れたら「Chrome拡張OK」と担当者に伝える
3. **ツールが見当たらない／呼んでもエラーになる場合**は、担当者にこう伝える：

   > 「ブラウザ操作（Claude in Chrome）が使えない状態です。このスキルはChromeを操作するので、先に準備が必要です。
   > ① Chromeに拡張機能『Claude in Chrome』を入れる
   > ② Chromeで拡張を有効にして、Claudeアカウントでログインする
   > ③ Claude Codeを再起動する
   > これが終わったら『Chrome入れたよ』と教えてください。もう一度確認します。」

   ※ 拡張のインストール自体はAIができないので、担当者本人にやってもらうこと。
   ※ この時点でスキル自体の導入は終わっているので、**拡張が未導入でもここで作業を巻き戻さない**。拡張が入ったら使える状態です。

## ステップ5：初回セットアップを案内する（再起動後）

再起動後にスキルを初めて動かすと、スキル側が自動で初回セットアップ（Chrome拡張の再チェック → Xログイン確認 → AI情報アカウントのフォロー提案 → まとめの提出先の確認）を案内します。担当者には「初回だけ少し質問されます」と伝えてください。

---

## うまくいかないとき

| 症状 | 対処 |
|---|---|
| `/my-ai-news` が出てこない | Claude Codeを再起動したか確認。スキルフォルダにSKILL.mdがあるか確認（Mac: `ls ~/.claude/skills/my-ai-news/` ／ Windows: `Get-ChildItem "$env:USERPROFILE\.claude\skills\my-ai-news"`） |
| ブラウザが操作できない | Claude in Chrome拡張が入っているか・有効か確認（ステップ4） |
| `mkdir`/`cp` が動かない | Windowsでbashが使えない環境。PowerShell用のコマンド（各手順の「Windows」欄）に切り替える |
| `~` のパスが見つからないと言われる | Windowsでは `~` が使えないことがある。`$env:USERPROFILE` に置き換える |
| フォロー中に投稿が流れてこない | フォロー数が足りない。SKILL.mdの「フォロー提案リスト」から追加する |

## アンインストール

担当者から**明確に「消して」と言われたときだけ**、以下を実行する。

**Mac / Linux**
```
rm -rf ~/.claude/skills/my-ai-news
```
**Windows（PowerShell）**
```
Remove-Item -Recurse "$env:USERPROFILE\.claude\skills\my-ai-news"
```

- 消してよいのは `my-ai-news` フォルダ**だけ**。`.claude/skills/` そのものや他のスキルフォルダは絶対に消さない
- 実行前に必ず「`my-ai-news` フォルダだけを削除します。よろしいですか？」と確認する
