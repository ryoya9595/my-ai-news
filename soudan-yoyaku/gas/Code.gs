/**
 * 無料相談 予約フォーム — バックエンド（Google Apps Script）
 *
 * 役割
 *   GET  ?action=slots&from=YYYY-MM-DD&to=YYYY-MM-DD  → 空き枠を返す
 *   GET  ?action=ping                                → 動作確認
 *   POST {action:"book", ...}                         → 予約を作る
 *        1. Googleカレンダーに予定を作成（Google Meet付き）
 *        2. スプレッドシート（申し込み台帳）に1行追加
 *        3. LINEに確認メッセージをpush
 *   時間トリガー sendReminders                        → 前日リマインドをLINEにpush
 *
 * 設定は「プロジェクトの設定 → スクリプト プロパティ」に入れる（下の CONFIG_KEYS を参照）。
 * コードの中に秘密情報は書かない。
 */

// ====== 設定キー（スクリプト プロパティ） ======
var CONFIG_KEYS = {
  CALENDAR_ID: 'CALENDAR_ID',                       // 予約を入れるカレンダーのID（primary でもOK）
  SHEET_ID: 'SHEET_ID',                             // 申し込み台帳のスプレッドシートID
  SHEET_NAME: 'SHEET_NAME',                         // シート名（省略時 "予約台帳"）
  LINE_CHANNEL_ACCESS_TOKEN: 'LINE_CHANNEL_ACCESS_TOKEN', // Messaging API のチャネルアクセストークン
  HOST_NAME: 'HOST_NAME',                           // 例: 宮田陽子
  SERVICE_NAME: 'SERVICE_NAME',                     // 例: 無料相談（60分）
  BUSINESS_START: 'BUSINESS_START',                 // 例: 10  （開始時）
  BUSINESS_END: 'BUSINESS_END',                     // 例: 18  （この時刻に終わる枠まで。18なら17:00開始が最後）
  LUNCH_START: 'LUNCH_START',                       // 例: 12  （空欄なら休憩なし）
  LUNCH_END: 'LUNCH_END',                           // 例: 13
  SLOT_MINUTES: 'SLOT_MINUTES',                     // 例: 60
  WEEKDAYS: 'WEEKDAYS',                             // 例: 1,2,3,4,5 （0=日 … 6=土）
  DAYS_AHEAD: 'DAYS_AHEAD',                         // 例: 30 （何日先まで受け付けるか）
  MIN_LEAD_HOURS: 'MIN_LEAD_HOURS',                 // 例: 24 （何時間前まで受け付けるか）
  REMINDER_HOUR: 'REMINDER_HOUR',                   // 例: 18 （前日リマインドを送る時刻）
  ADMIN_LINE_USER_ID: 'ADMIN_LINE_USER_ID'          // 任意: 予約が入ったら管理者にも通知する場合のLINE userId
};

var SHEET_HEADERS = [
  '受付日時', '予約日', '開始', '終了', 'お名前', 'LINE表示名', 'LINE userId',
  '経由', 'ご相談内容', 'メモ', 'MeetURL', 'カレンダーイベントID', 'ステータス', 'リマインド送信'
];

var ROUTE_LABELS = {
  story: 'Instagram ストーリーズ',
  profile: 'Instagram プロフィール',
  line: 'LINE公式 リッチメニュー',
  other: 'その他'
};

// ====== 設定の読み込み ======
function cfg(key, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (v === null || v === '') return fallback;
  return v;
}
function cfgInt(key, fallback) {
  var v = cfg(key, null);
  if (v === null) return fallback;
  var n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}
function settings() {
  var wd = cfg(CONFIG_KEYS.WEEKDAYS, '1,2,3,4,5').split(',').map(function (s) { return parseInt(s.trim(), 10); });
  return {
    calendarId: cfg(CONFIG_KEYS.CALENDAR_ID, 'primary'),
    sheetId: cfg(CONFIG_KEYS.SHEET_ID, ''),
    sheetName: cfg(CONFIG_KEYS.SHEET_NAME, '予約台帳'),
    lineToken: cfg(CONFIG_KEYS.LINE_CHANNEL_ACCESS_TOKEN, ''),
    hostName: cfg(CONFIG_KEYS.HOST_NAME, ''),
    serviceName: cfg(CONFIG_KEYS.SERVICE_NAME, '無料相談（60分）'),
    businessStart: cfgInt(CONFIG_KEYS.BUSINESS_START, 10),
    businessEnd: cfgInt(CONFIG_KEYS.BUSINESS_END, 18),
    lunchStart: cfgInt(CONFIG_KEYS.LUNCH_START, -1),
    lunchEnd: cfgInt(CONFIG_KEYS.LUNCH_END, -1),
    slotMinutes: cfgInt(CONFIG_KEYS.SLOT_MINUTES, 60),
    weekdays: wd,
    daysAhead: cfgInt(CONFIG_KEYS.DAYS_AHEAD, 30),
    minLeadHours: cfgInt(CONFIG_KEYS.MIN_LEAD_HOURS, 24),
    reminderHour: cfgInt(CONFIG_KEYS.REMINDER_HOUR, 18),
    adminLineUserId: cfg(CONFIG_KEYS.ADMIN_LINE_USER_ID, '')
  };
}

// ====== Webアプリのエントリポイント ======
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'ping') return json({ ok: true, now: fmtDateTime(new Date()) });
    if (p.action === 'slots') {
      var s = settings();
      var from = p.from ? parseDate(p.from) : startOfDay(new Date());
      var to = p.to ? parseDate(p.to) : addDays(from, s.daysAhead);
      return json({ ok: true, days: availableSlots(from, to, s), settings: publicSettings(s) });
    }
    return json({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json({ ok: false, error: 'invalid json' }); }
  try {
    if (body.action === 'book') return json(createBooking(body));
    return json({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function publicSettings(s) {
  return {
    hostName: s.hostName, serviceName: s.serviceName, slotMinutes: s.slotMinutes,
    daysAhead: s.daysAhead, minLeadHours: s.minLeadHours
  };
}

// ====== 空き枠の計算 ======
/**
 * from〜to の各日について、営業時間内で既存予定と重ならない開始時刻の一覧を返す。
 * 返り値: { "2026-09-10": ["10:00","11:00",...], ... }  （受付不可の日は含めない）
 */
function availableSlots(from, to, s) {
  var cal = CalendarApp.getCalendarById(s.calendarId);
  if (!cal) throw new Error('カレンダーが見つかりません: ' + s.calendarId);
  var events = cal.getEvents(from, addDays(to, 1));
  var busy = events.filter(function (ev) { return !ev.isAllDayEvent() && ev.getMyStatus && ev.getMyStatus() !== CalendarApp.GuestStatus.NO; })
    .map(function (ev) { return [ev.getStartTime().getTime(), ev.getEndTime().getTime()]; });
  var minStart = new Date().getTime() + s.minLeadHours * 3600 * 1000;
  var result = {};
  for (var d = startOfDay(from); d.getTime() <= to.getTime(); d = addDays(d, 1)) {
    if (s.weekdays.indexOf(d.getDay()) < 0) continue;
    var slots = [];
    for (var h = s.businessStart; h + s.slotMinutes / 60 <= s.businessEnd + 1e-9; h += s.slotMinutes / 60) {
      if (s.lunchStart >= 0 && h < s.lunchEnd && h + s.slotMinutes / 60 > s.lunchStart) continue;
      var st = new Date(d.getTime()); st.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
      var en = new Date(st.getTime() + s.slotMinutes * 60000);
      if (st.getTime() < minStart) continue;
      var clash = busy.some(function (b) { return st.getTime() < b[1] && en.getTime() > b[0]; });
      if (!clash) slots.push(fmtTime(st));
    }
    if (slots.length) result[fmtDate(d)] = slots;
  }
  return result;
}

// ====== 予約の作成 ======
function createBooking(b) {
  var s = settings();
  var name = String(b.name || '').trim();
  var date = String(b.date || '').trim();
  var time = String(b.time || '').trim();
  if (!name) return { ok: false, error: 'お名前を入力してください' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: '日時の形式が正しくありません' };

  var start = parseDate(date); start.setHours(parseInt(time.slice(0, 2), 10), parseInt(time.slice(3, 5), 10), 0, 0);
  var end = new Date(start.getTime() + s.slotMinutes * 60000);

  // 同時アクセスでの二重予約を防ぐ
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var avail = availableSlots(startOfDay(start), startOfDay(start), s);
    var todays = avail[date] || [];
    if (todays.indexOf(time) < 0) return { ok: false, error: 'その時間は埋まってしまいました。別の時間をお選びください', code: 'slot_taken' };

    var route = ROUTE_LABELS[b.src] || (b.src ? String(b.src) : ROUTE_LABELS.other);
    var topic = String(b.topic || '').trim();
    var note = String(b.note || '').trim();
    var lineUserId = String(b.lineUserId || '').trim();
    var displayName = String(b.displayName || '').trim();

    // 1. カレンダー（Google Meet 付き）
    var ev = createCalendarEvent(s, {
      title: s.serviceName + '｜' + name + 'さま',
      start: start, end: end,
      description: ['お名前: ' + name, '経由: ' + route, 'ご相談: ' + topic, 'メモ: ' + note, 'LINE userId: ' + lineUserId].join('\n')
    });

    // 2. 台帳
    appendToSheet(s, [
      fmtDateTime(new Date()), date, time, fmtTime(end), name, displayName, lineUserId,
      route, topic, note, ev.meetUrl || '', ev.id || '', '予約済', ''
    ]);

    // 3. LINE 確認メッセージ
    var msg = confirmMessage(s, { name: name, start: start, end: end, meetUrl: ev.meetUrl });
    var pushed = false;
    if (lineUserId && s.lineToken) pushed = linePush(s, lineUserId, msg);
    if (s.adminLineUserId && s.lineToken) {
      linePush(s, s.adminLineUserId, '【新規予約】' + fmtJa(start) + ' ' + fmtTime(start) + '〜\n' + name + 'さま／' + route + '\n' + topic);
    }

    return { ok: true, eventId: ev.id, meetUrl: ev.meetUrl || '', start: fmtJa(start) + ' ' + fmtTime(start), end: fmtTime(end), linePushed: pushed };
  } finally {
    lock.releaseLock();
  }
}

/** Google Meet 付きで予定を作る。Advanced Calendar Service が無効な場合は Meet なしで作る。 */
function createCalendarEvent(s, ev) {
  try {
    var resource = {
      summary: ev.title,
      description: ev.description,
      start: { dateTime: ev.start.toISOString() },
      end: { dateTime: ev.end.toISOString() },
      conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
    };
    var created = Calendar.Events.insert(resource, s.calendarId, { conferenceDataVersion: 1 });
    var meet = created.hangoutLink || '';
    if (!meet && created.conferenceData && created.conferenceData.entryPoints) {
      var ep = created.conferenceData.entryPoints.filter(function (p) { return p.entryPointType === 'video'; })[0];
      if (ep) meet = ep.uri;
    }
    return { id: created.id, meetUrl: meet };
  } catch (err) {
    // Meet が作れない環境（Advanced Service 未有効など）はここに落ちる。予定だけは必ず作る。
    var cal = CalendarApp.getCalendarById(s.calendarId);
    var e2 = cal.createEvent(ev.title, ev.start, ev.end, { description: ev.description + '\n\n(Meetリンクは手動で追加してください)' });
    return { id: e2.getId(), meetUrl: '' };
  }
}

// ====== 台帳（スプレッドシート） ======
function getSheet(s) {
  if (!s.sheetId) throw new Error('SHEET_ID が設定されていません');
  var ss = SpreadsheetApp.openById(s.sheetId);
  var sh = ss.getSheetByName(s.sheetName);
  if (!sh) {
    sh = ss.insertSheet(s.sheetName);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(SHEET_HEADERS);
    sh.getRange(1, 1, 1, SHEET_HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function appendToSheet(s, row) {
  getSheet(s).appendRow(row);
}

// ====== LINE ======
function linePush(s, to, text) {
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + s.lineToken },
    payload: JSON.stringify({ to: to, messages: [{ type: 'text', text: text }] }),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code !== 200) {
    console.error('LINE push failed: ' + code + ' ' + res.getContentText());
    return false;
  }
  return true;
}

function confirmMessage(s, b) {
  var lines = [
    b.name + 'さま、ご予約ありがとうございます。',
    '',
    '■ 日時',
    fmtJa(b.start) + ' ' + fmtTime(b.start) + '〜' + fmtTime(b.end),
    '',
    '■ 参加方法',
    b.meetUrl ? 'Google Meet\n' + b.meetUrl : 'Google Meet（URLは前日にお送りします）',
    '',
    '前日にもリマインドをお送りします。',
    '日程の変更やご質問は、このトークにそのまま返信してください。'
  ];
  if (s.hostName) lines.push('', s.hostName);
  return lines.join('\n');
}

// ====== 前日リマインド（時間トリガーで毎日実行） ======
function sendReminders() {
  var s = settings();
  if (!s.lineToken) return;
  var sh = getSheet(s);
  var last = sh.getLastRow();
  if (last < 2) return;
  var tomorrow = fmtDate(addDays(startOfDay(new Date()), 1));
  var col = colIndex();
  var rows = sh.getRange(2, 1, last - 1, SHEET_HEADERS.length).getValues();
  rows.forEach(function (r, i) {
    var date = r[col['予約日']] instanceof Date ? fmtDate(r[col['予約日']]) : String(r[col['予約日']]);
    if (date !== tomorrow) return;
    if (String(r[col['ステータス']]) !== '予約済') return;
    if (String(r[col['リマインド送信']])) return;
    var to = String(r[col['LINE userId']]);
    if (!to) return;
    var startStr = r[col['開始']] instanceof Date ? fmtTime(r[col['開始']]) : String(r[col['開始']]);
    var endStr = r[col['終了']] instanceof Date ? fmtTime(r[col['終了']]) : String(r[col['終了']]);
    var meet = String(r[col['MeetURL']] || '');
    var text = [
      r[col['お名前']] + 'さま、明日のご相談のリマインドです。',
      '',
      '■ 日時',
      fmtJa(parseDate(date)) + ' ' + startStr + '〜' + endStr,
      '',
      '■ 参加方法',
      meet ? 'Google Meet\n' + meet : 'Google Meet（URLは別途お送りします）',
      '',
      'ご都合が悪くなった場合は、このトークに返信してください。'
    ].join('\n');
    if (linePush(s, to, text)) {
      sh.getRange(i + 2, col['リマインド送信'] + 1).setValue(fmtDateTime(new Date()));
    }
  });
}

/** リマインド用の時間トリガーを作る（一度だけ実行。既にあれば作り直す） */
function installReminderTrigger() {
  var s = settings();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendReminders').timeBased().everyDays(1).atHour(s.reminderHour).create();
  return 'sendReminders を毎日 ' + s.reminderHour + '時 に実行するトリガーを作成しました';
}

/**
 * 秘密情報以外の設定に初期値を入れる（未設定のものだけ。既存の値は上書きしない）。
 * clasp で置いた直後に一度実行すると、手で入れるのは CALENDAR_ID / SHEET_ID / LINE_CHANNEL_ACCESS_TOKEN / HOST_NAME だけで済む。
 */
function applyDefaultConfig() {
  var defaults = {
    SERVICE_NAME: '無料相談（60分）', BUSINESS_START: '10', BUSINESS_END: '18', LUNCH_START: '12', LUNCH_END: '13',
    SLOT_MINUTES: '60', WEEKDAYS: '1,2,3,4,5', DAYS_AHEAD: '30', MIN_LEAD_HOURS: '24', REMINDER_HOUR: '18', SHEET_NAME: '予約台帳'
  };
  var props = PropertiesService.getScriptProperties();
  var set = [];
  Object.keys(defaults).forEach(function (k) {
    if (!props.getProperty(k)) { props.setProperty(k, defaults[k]); set.push(k); }
  });
  var missing = ['CALENDAR_ID', 'SHEET_ID', 'LINE_CHANNEL_ACCESS_TOKEN', 'HOST_NAME'].filter(function (k) { return !props.getProperty(k); });
  var msg = '初期値を入れた項目: ' + (set.join(', ') || 'なし') + '\n手で入れる必要がある項目: ' + (missing.join(', ') || 'なし（すべて設定済み）');
  Logger.log(msg);
  return msg;
}

/** 設定とカレンダー・シート・LINEの疎通を一度に確認する（エディタから実行） */
function selfCheck() {
  var s = settings();
  var out = [];
  try { CalendarApp.getCalendarById(s.calendarId).getName(); out.push('カレンダー: OK'); } catch (e) { out.push('カレンダー: NG ' + e.message); }
  try { getSheet(s).getName(); out.push('スプレッドシート: OK'); } catch (e) { out.push('スプレッドシート: NG ' + e.message); }
  out.push('LINEトークン: ' + (s.lineToken ? '設定あり' : 'NG 未設定'));
  try { Calendar.Calendars.get(s.calendarId); out.push('Google Meet 自動発行: OK（Advanced Calendar Service 有効）'); } catch (e) { out.push('Google Meet 自動発行: 使えません（予定はMeetなしで作られます）'); }
  var next = availableSlots(startOfDay(new Date()), addDays(new Date(), 7), s);
  out.push('直近7日の空き枠: ' + Object.keys(next).length + '日分');
  Logger.log(out.join('\n'));
  return out.join('\n');
}

// ====== ユーティリティ ======
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function colIndex() {
  var m = {}; SHEET_HEADERS.forEach(function (h, i) { m[h] = i; }); return m;
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function parseDate(ymd) { var p = ymd.split('-'); return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 0, 0, 0, 0); }
function startOfDay(d) { var x = new Date(d.getTime()); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function fmtTime(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function fmtDateTime(d) { return fmtDate(d) + ' ' + fmtTime(d); }
function fmtJa(d) { var w = ['日', '月', '火', '水', '木', '金', '土']; return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + w[d.getDay()] + '）'; }
