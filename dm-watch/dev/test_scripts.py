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


def test_window():
    print("=== fetch_dms: どこまで遡るか（実行間隔が空いても取りこぼさない） ===")
    import datetime as dt
    fd = load("fetch_dms")
    now = dt.datetime(2026, 9, 10, 1, 0, 0, tzinfo=dt.timezone.utc)  # JST 10:00
    fmt = lambda d: d.strftime("%Y-%m-%dT%H:%M:%S+0000")

    since, src = fd.window_start(now, 4.5, 72, None)
    chk(src == "hours" and (now - since).total_seconds() / 3600 == 4.5,
        "前回実行の記録が無ければ --hours ぶんだけ遡る")

    # 前夜19:00(JST)＝10:00 UTC 前日 に実行済み。15時間空いている
    prev = now - dt.timedelta(hours=15)
    since, src = fd.window_start(now, 4.5, 72, fmt(prev))
    chk(src == "last_run" and since == prev,
        "前回実行が --hours より前なら、そこまで遡る（夜間のDMを取りこぼさない）")

    # 直前に実行済み（1時間前）なら hours の方が広いのでそちらを使う
    since, src = fd.window_start(now, 4.5, 72, fmt(now - dt.timedelta(hours=1)))
    chk(src == "hours" and (now - since).total_seconds() / 3600 == 4.5,
        "前回実行が最近なら --hours の範囲を維持する（狭めない）")

    # 長期停止していても max_lookback で頭打ち
    since, src = fd.window_start(now, 4.5, 72, fmt(now - dt.timedelta(days=30)))
    chk(src == "max_lookback" and (now - since).total_seconds() / 3600 == 72,
        "長期間止まっていても max-lookback より前には遡らない")

    # 壊れた last_run_at は無視して hours にフォールバック
    since, src = fd.window_start(now, 4.5, 72, "こわれた値")
    chk(src == "hours", "last_run_at が壊れていても落ちずに --hours を使う")

    # commit_state が last_run_at を記録する
    import os, tempfile
    p = os.path.join(tempfile.mkdtemp(), "st.json")
    st = fd.load_state(p)
    st["pending"] = ["m1"]
    fd.save_state(p, st)
    fd.commit_state(p, now)
    saved = fd.load_state(p)
    chk(saved.get("last_run_at") == fmt(now), "commit_state が last_run_at を記録する")
    since, src = fd.window_start(now + dt.timedelta(hours=15), 4.5, 72, saved.get("last_run_at"))
    chk(src == "last_run", "記録した last_run_at が次回の遡り開始点として効く")


def main():
    test_split_text()
    test_state()
    test_window()
    print()
    print("✅ 全パス" if _ng == 0 else "❌ %d 件 失敗" % _ng)
    sys.exit(1 if _ng else 0)


if __name__ == "__main__":
    main()
