# my-ai-news

Xの「フォロー中」タイムラインからAI最新情報を集める Claude Code スキルの配布キット。

**解説ページ： https://ryoya9595.github.io/my-ai-news/**

## これは何

`/my-ai-news` と打つと、Claude Code が Chrome拡張（Claude in Chrome）で自分のXを開き、
「フォロー中」タイムラインを巡回して、その日のAI最新情報（新ツール・新モデル・アップデート）を
箇条書きにまとめる。拾った投稿にはその場で「いいね」を付ける。

## 配布物

- `my-ai-news-skill.zip` — スタッフに渡すZip
- `index.html` — 解説ページ（GitHub Pages）

Zipの中身：

```
my-ai-news-kit/
├── はじめにお読みください.md          （受け取った人が最初に読む）
├── 導入手順_ClaudeCodeに読ませる.md    （Claude Codeに読ませる指示書）
└── my-ai-news/
    └── SKILL.md                      （スキル本体）
```

## 導入の流れ

受け取った人が Claude Code に `導入手順_ClaudeCodeに読ませる.md` を読ませると、

1. どんなスキルかを説明する
2. 「導入してよろしいですか？（はい／いいえ）」と確認する
3. 「はい」をもらってから `~/.claude/skills/my-ai-news/` にコピーする
4. Chrome拡張が使えるか確認する

という順で進む。**確認前にインストールはされない。既存のスキルやデータも削除しない。**

Mac / Windows どちらにも対応（手順書にPowerShell用コマンドも記載）。

## 必要な環境

- Claude Code（Mac / Windows）
- Chrome拡張「Claude in Chrome」← これが無いと動かない
- 自分のXアカウント

## 更新のしかた

`my-ai-news-kit/` を編集したら Zip を作り直して push する。

```bash
cd my-ai-news
rm -f my-ai-news-skill.zip
zip -r -X my-ai-news-skill.zip my-ai-news-kit -x "*.DS_Store"
git add -A && git commit -m "update skill" && git push
```

---

## 顧客向けキット（Dacoon / 個別相談まわり）

同じ「Zipを渡して Claude Code に読ませる」形式で、顧客環境に導入してもらうキット。どちらも `はじめにお読みください.md` → `事前準備ガイド.md`（本人がアカウント設定）→ `導入手順_ClaudeCodeに読ませる.md`（Claude Code が残りを実行）の順。

| フォルダ | 何を作るか | 動く場所 |
|---|---|---|
| `soudan-yoyaku/` | **相談予約システム**。LINE内で完結する予約フォーム。Googleカレンダー登録（Meet付き）・台帳スプシ追記（流入経路つき）・LINE確認＆前日リマインド。エルメと共存 | LIFF + GAS + Vercel |
| `dm-watch/` | **DMウォッチシステム**。日本時間 10/14/17/19時に Instagram DM を確認し、要対応だけ返信案付きで LINE 通知 | Claude クラウドルーティン |

面談で見せる操作デモ：`soudan-yoyaku/demo/yoyaku-liff-demo.html`

### 顧客に渡す導入プロンプト（AIエージェントに貼るだけ）

```
https://github.com/ryoya9595/my-ai-news の「dm-watch」フォルダにある「導入手順_ClaudeCodeに読ませる.md」を読んで、その手順どおりに進めてください。リポジトリはcloneして構いません。
```
```
https://github.com/ryoya9595/my-ai-news の「soudan-yoyaku」フォルダにある「導入手順_ClaudeCodeに読ませる.md」を読んで、その手順どおりに進めてください。リポジトリはcloneして構いません。
```

AIが clone → 説明 → 確認 → 画面操作（Claude in Chrome があれば）→ 配置・公開・ルーティン作成まで進める。人がやるのはログインとトークンの貼り付けだけ。Zip で渡す場合は `dm-watch-system.zip` / `soudan-yoyaku-system.zip`。

Zipの作り直し：
```bash
rm -f dm-watch-system.zip soudan-yoyaku-system.zip
zip -r -X dm-watch-system.zip dm-watch -x "*.DS_Store" "*/__pycache__/*"
zip -r -X soudan-yoyaku-system.zip soudan-yoyaku -x "*.DS_Store"
```
