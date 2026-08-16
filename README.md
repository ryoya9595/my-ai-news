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
