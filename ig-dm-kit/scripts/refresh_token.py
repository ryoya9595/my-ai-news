#!/usr/bin/env python3
"""
Instagram の長期アクセストークン（有効期限 約60日）を更新する。
発行から24時間以上経ったトークンなら、期限内はいつでも更新できる。

使い方（自分のPCで）:
  IG_ACCESS_TOKEN="今のトークン" python3 refresh_token.py

出力: 新しいトークンと有効期限。新しいトークンを Claude 環境の API credentials に登録し直す。
"""
import datetime as dt
import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

HOST = os.environ.get("IG_GRAPH_HOST", "graph.instagram.com")


def main():
    token = os.environ.get("IG_ACCESS_TOKEN", "").strip()
    if not token:
        print("IG_ACCESS_TOKEN が設定されていません。例: IG_ACCESS_TOKEN=xxxx python3 refresh_token.py")
        sys.exit(2)
    url = f"https://{HOST}/refresh_access_token?" + urllib.parse.urlencode({"grant_type": "ig_refresh_token", "access_token": token})
    ctx = ssl.create_default_context()
    ca = os.environ.get("SSL_CERT_FILE")
    if ca and os.path.exists(ca):
        try:
            ctx.load_verify_locations(ca)
        except Exception:
            pass
    try:
        with urllib.request.urlopen(urllib.request.Request(url), timeout=30, context=ctx) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("更新に失敗しました:", e.code, e.read().decode("utf-8", "replace")[:300])
        print("ヒント: 発行から24時間未満、または既に期限切れの可能性があります。期限切れなら Meta の画面で再発行してください。")
        sys.exit(3)
    exp = data.get("expires_in")
    when = (dt.datetime.now() + dt.timedelta(seconds=int(exp))).strftime("%Y-%m-%d") if exp else "不明"
    print("新しいトークン（Claude 環境の API credentials に登録し直してください）:")
    print(data.get("access_token", ""))
    print(f"有効期限: {when} まで")


if __name__ == "__main__":
    main()
