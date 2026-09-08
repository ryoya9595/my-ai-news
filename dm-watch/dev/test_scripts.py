#!/usr/bin/env python3
"""dm-watch のスクリプトを、Instagram/LINE に接続せずに検証する（納品物ではない）。

    python3 dm-watch/dev/test_scripts.py

ネットワークを使わない部分（LINE本文の分割・通知済みIDの2段階記録）だけを見る。
`scripts/` を編集したら、push する前にこれと `python3 -m py_compile` を実行すること。
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.normpath(os.path.join(HERE, "..", "scripts"))

_ng = 0


def load(name):
    path = os.path.join(SCRIPTS, name + ".py")
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def chk(cond, label):
    global _ng
    print(("  ✅ " if cond else "  ❌ ") + label)
    if not cond:
        _ng += 1


def test_split_text():
    print("=== send_line: 本文の分割 ===")
    sl = load("send_line")
    n = sl.MAX_LEN
    long_line = "あ" * (n * 2 + 5)
    chunks = sl.split_text(long_line)
    chk(all(len(c) <= n for c in chunks), "1行が上限の2倍でも全チャンクが上限以下")
    chk("".join(chunks).replace("\n", "") == long_line, "強制分割しても文字が欠けない")
    short = "行1\n行2\n行3"
    chk(sl.split_text(short) == [short], "短文は1チャンクのまま")
    many = "\n".join(["x" * 100 for _ in range(200)])
    chk(all(len(c) <= n for c in sl.split_text(many)), "多数の短い行も上限以下に収まる")
    chk(sl.split_text("") == [""], "空文字は空1チャンク")


def test_state():
    print("=== fetch_dms: 通知済みIDの2段階記録 ===")
    fd = load("fetch_dms")
    p = os.path.join(tempfile.mkdtemp(), "st.json")

    chk(fd.load_state(p) == {"seen": [], "pending": []}, "ファイル無しは空のstate")

    st = fd.load_state(p)
    st["pending"] = ["m1", "m2"]
    fd.save_state(p, st)
    st = fd.load_state(p)
    chk(st["seen"] == [] and st["pending"] == ["m1", "m2"],
        "取得直後は seen が空のまま（まだ通知済みにしない）")
    chk(fd.load_state(p)["seen"] == [], "送信失敗時は seen に入らない＝次回再通知される")

    moved = fd.commit_state(p)
    st = fd.load_state(p)
    chk(moved == 2 and st["seen"] == ["m1", "m2"] and st["pending"] == [],
        "commit で pending が seen に移る")

    st["pending"] = ["m2", "m3"]
    fd.save_state(p, st)
    fd.commit_state(p)
    chk(fd.load_state(p)["seen"] == ["m1", "m2", "m3"], "既に seen にあるIDは重複追加されない")

    with open(p, "w", encoding="utf-8") as f:
        json.dump({"seen": ["old1"]}, f)
    st = fd.load_state(p)
    chk(st["seen"] == ["old1"] and st["pending"] == [], "旧形式のstateファイルも壊れず読める")

    r = subprocess.run([sys.executable, os.path.join(SCRIPTS, "fetch_dms.py"), "--commit-state"],
                       capture_output=True)
    chk(r.returncode == 2, "--commit-state 単体は終了コード2で落ちる")


def main():
    test_split_text()
    test_state()
    print()
    print("✅ 全パス" if _ng == 0 else "❌ %d 件 失敗" % _ng)
    sys.exit(1 if _ng else 0)


if __name__ == "__main__":
    main()
