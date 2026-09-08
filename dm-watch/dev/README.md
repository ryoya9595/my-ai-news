# dev — 開発用の検証ツール（納品物ではない）

`test_scripts.py` は、Instagram / LINE に接続せずに `scripts/` のロジックを検証する。
ネットワークを使わないので誰でも実行できる。

```
python3 dm-watch/dev/test_scripts.py
```

検証している内容:
- `send_line.split_text`：本文の分割が LINE の文字数上限を超えないこと（1行が上限より長い場合の強制分割を含む）、分割しても文字が欠けないこと
- `fetch_dms` の通知済みID記録：取得時は `pending` に置くだけで `seen` に入れないこと、
  `--commit-state` で `pending` が `seen` に移ること、重複追加されないこと、旧形式のstateも読めること

`scripts/` を編集したら、push する前に次の2つを実行すること：

```
python3 -m py_compile dm-watch/scripts/*.py
python3 dm-watch/dev/test_scripts.py
```
