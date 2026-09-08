#!/usr/bin/env python3
"""
Instagram の新着DMを取得して JSON で出力する。

使い方:
  python3 fetch_dms.py --hours 4.5                 直近4.5時間の新着DM
  python3 fetch_dms.py --hours 4.5 --state state/ig_seen.json
                                                    通知済みのメッセージIDを除外して取得する。
                                                    拾ったIDは state の "pending" に置くだけで、
                                                    "seen"（通知済み）には入れない
  python3 fetch_dms.py --state state/ig_seen.json --commit-state
                                                    LINE送信が成功したあとに実行する。
                                                    "pending" を "seen" に移して確定させる
  python3 fetch_dms.py --self-test                  認証と接続だけ確認（DMは取りに行かない）

通知済みの記録を2段階にしている理由:
  取得した時点で "seen" に入れてしまうと、そのあとの LINE 送信が失敗したときに
  そのDMが二度と通知されなくなる（お客様からの問い合わせを取りこぼす）。
  送信が成功してから確定させることで、失敗時は次回もう一度通知される
  （まれに重複通知になるが、取りこぼすよりはよい）。

認証:
  1) 環境変数 IG_ACCESS_TOKEN があれば Authorization: Bearer で送る
  2) 無ければヘッダを付けずに送る（Claude Code の cloud 環境で「API credentials」に
     graph.instagram.com を登録してある場合、プロキシがトークンを付けてくれる）

出力（標準出力・JSON）:
  {
    "ok": true,
    "me": {"id": "...", "username": "..."},
    "window": {"from": "...", "to": "...", "hours": 4.5},
    "messages": [
      {"id": "...", "conversation_id": "...", "created_time": "2026-09-04T05:12:00+0000",
       "created_jst": "2026-09-04 14:12", "from": {"id": "...", "username": "..."},
       "text": "...", "attachments": 0}
    ],
    "count": 3,
    "errors": 0            会話ごとの取得に失敗した件数（0 でなければ取りこぼしの可能性あり）
  }
標準ライブラリのみ。Python 3.8+。
"""
import argparse
import datetime as dt
import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_HOST = os.environ.get("IG_GRAPH_HOST", "graph.instagram.com")
DEFAULT_VERSION = os.environ.get("IG_GRAPH_VERSION", "v21.0")
JST = dt.timezone(dt.timedelta(hours=9))


def _ssl_context():
    ctx = ssl.create_default_context()
    ca = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    if ca and os.path.exists(ca):
        try:
            ctx.load_verify_locations(ca)
        except Exception:
            pass
    return ctx


def api_get(host, version, path, params, token=None, timeout=30):
    q = dict(params or {})
    url = f"https://{host}/{version}/{path.lstrip('/')}"
    if q:
        url += "?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, method="GET")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_ssl_context()) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            err = json.loads(body).get("error", {})
            msg = f"HTTP {e.code}: {err.get('message') or body[:300]} (code={err.get('code')}, type={err.get('type')})"
        except Exception:
            msg = f"HTTP {e.code}: {body[:300]}"
        raise RuntimeError(msg) from None


def parse_time(s):
    # 例: 2026-09-04T05:12:00+0000
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z"):
        try:
            return dt.datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def load_state(path):
    """通知済み(seen)と、送信待ち(pending)を読む。古い形式（seenだけ）も読める。"""
    empty = {"seen": [], "pending": []}
    if not path or not os.path.exists(path):
        return empty
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("seen"), list):
            if not isinstance(data.get("pending"), list):
                data["pending"] = []
            return data
    except Exception:
        pass
    return empty


def save_state(path, state, keep=2000):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    state["seen"] = state.get("seen", [])[-keep:]
    state["pending"] = state.get("pending", [])[-keep:]
    state["updated_at"] = dt.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def commit_state(path):
    """LINE送信が成功したあとに呼ぶ。pending を seen に移して確定させる。"""
    state = load_state(path)
    moved = [i for i in state.get("pending", []) if i not in set(state.get("seen", []))]
    state["seen"] = state.get("seen", []) + moved
    state["pending"] = []
    save_state(path, state)
    return len(moved)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hours", type=float, default=float(os.environ.get("IG_WINDOW_HOURS", "4.5")), help="何時間前までのDMを拾うか")
    ap.add_argument("--state", default=os.environ.get("IG_STATE_FILE", ""), help="通知済みIDを記録するJSON（任意）")
    ap.add_argument("--host", default=DEFAULT_HOST)
    ap.add_argument("--version", default=DEFAULT_VERSION)
    ap.add_argument("--limit", type=int, default=50, help="会話の最大取得数")
    ap.add_argument("--per-conv", type=int, default=20, help="1会話あたり見るメッセージ数")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--commit-state", action="store_true",
                    help="LINE送信が成功したあとに実行し、pending を seen に確定させる")
    args = ap.parse_args()

    if args.commit_state:
        if not args.state:
            print(json.dumps({"ok": False, "error": "--commit-state には --state が必要です"}, ensure_ascii=False))
            sys.exit(2)
        moved = commit_state(args.state)
        print(json.dumps({"ok": True, "committed": moved}, ensure_ascii=False))
        return

    token = os.environ.get("IG_ACCESS_TOKEN") or None
    now = dt.datetime.now(dt.timezone.utc)
    since = now - dt.timedelta(hours=args.hours)

    try:
        me = api_get(args.host, args.version, "me", {"fields": "id,username"}, token)
    except Exception as e:
        print(json.dumps({"ok": False, "stage": "auth", "error": str(e),
                          "hint": "トークンが無効か、環境のAPI credentialsに graph.instagram.com が登録されていません"}, ensure_ascii=False))
        sys.exit(2)

    if args.self_test:
        print(json.dumps({"ok": True, "me": me, "host": args.host, "version": args.version}, ensure_ascii=False))
        return

    state = load_state(args.state) if args.state else {"seen": [], "pending": []}
    seen = set(state.get("seen", []))

    try:
        convs = api_get(args.host, args.version, "me/conversations",
                        {"platform": "instagram", "fields": "id,updated_time,participants", "limit": args.limit}, token)
    except Exception as e:
        print(json.dumps({"ok": False, "stage": "conversations", "error": str(e)}, ensure_ascii=False))
        sys.exit(3)

    messages = []
    errors = []
    for c in convs.get("data", []):
        upd = parse_time(c.get("updated_time", "") or "")
        if upd and upd < since:
            continue
        try:
            detail = api_get(args.host, args.version, c["id"],
                             {"fields": f"messages.limit({args.per_conv}){{id,created_time,from,message,attachments}}"}, token)
        except Exception as e:
            errors.append({"conversation_id": c["id"], "error": str(e)})
            continue
        for m in (detail.get("messages", {}) or {}).get("data", []):
            ct = parse_time(m.get("created_time", "") or "")
            if not ct or ct < since:
                continue
            frm = m.get("from") or {}
            if str(frm.get("id")) == str(me.get("id")):
                continue  # 自分の送信は除外
            if m.get("id") in seen:
                continue
            att = m.get("attachments", {}) or {}
            messages.append({
                "id": m.get("id"),
                "conversation_id": c["id"],
                "created_time": m.get("created_time"),
                "created_jst": ct.astimezone(JST).strftime("%Y-%m-%d %H:%M"),
                "from": {"id": frm.get("id"), "username": frm.get("username", "")},
                "text": m.get("message") or "",
                "attachments": len(att.get("data", [])) if isinstance(att, dict) else 0,
            })

    messages.sort(key=lambda x: x.get("created_time") or "")

    if args.state:
        # ここでは seen に入れない。LINE送信が成功したあと --commit-state で確定させる
        state["pending"] = [m["id"] for m in messages if m.get("id")]
        save_state(args.state, state)

    print(json.dumps({
        "ok": True,
        "me": me,
        "window": {"from": since.astimezone(JST).strftime("%Y-%m-%d %H:%M"),
                   "to": now.astimezone(JST).strftime("%Y-%m-%d %H:%M"), "hours": args.hours},
        "messages": messages,
        "count": len(messages),
        "errors": len(errors),
        "error_detail": errors,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
