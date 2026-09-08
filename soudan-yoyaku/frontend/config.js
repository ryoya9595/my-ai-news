// ====== 予約フォームの設定（ここだけ書き換えればOK） ======
window.YOYAKU_CONFIG = {
  // LINE Developers の LINEログインチャネル → LIFF で発行される ID（例: 1234567890-AbCdEfGh）
  LIFF_ID: "",

  // GAS を「ウェブアプリ」としてデプロイしたときの URL（/exec で終わるもの）
  API_URL: "",

  // 画面に出す名前
  HOST_NAME: "",                        // お客様への確認メッセージに差出人として表示される名前
  SERVICE_NAME: "個別相談（60分・無料）",
  // オンライン相談のツールに合わせて書き換える（Zoomなら「Zoom でのオンライン相談です」など）。
  // 実際にどのURLを案内するかは GAS のスクリプトプロパティ MEETING_TOOL（meet / zoom / none）で決まります。
  SERVICE_NOTE: "Google Meet でのオンライン相談です",

  // ご相談内容の選択肢（自由に書き換え）
  TOPICS: ["商品・サービス設計", "SNS集客の相談", "LINE構築の相談", "その他"],

  // 流入経路のラベル（URLの ?src=xxx に対応。台帳にこのラベルが記録される）
  ROUTES: {
    story: "Instagram ストーリーズ",
    profile: "Instagram プロフィール",
    line: "LINE公式 リッチメニュー",
    other: "その他"
  },

  // テーマ色（好きな色に。#付きの16進）
  ACCENT: "#0E7490",

  // LINEの外（普通のブラウザ）で開かれたときの挙動
  //   true  : LINEログインを促す（本番推奨。LINE userId が取れないと通知できないため）
  //   false : ログインなしで予約だけ受ける（通知は届かない。テスト用）
  REQUIRE_LINE_LOGIN: true
};
