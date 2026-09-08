/**
 * Code.gs を Node 上で実行して検証する（Apps Script の API をスタブ化）。
 *   node soudan-yoyaku/dev/test_gas.cjs
 * 本番では使わない。開発用。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0, checks = 0;
function ok(cond, label, extra) {
  checks++;
  if (cond) { console.log('  ✅ ' + label); }
  else { failures++; console.log('  ❌ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ---------- Apps Script スタブ ----------
function makeEnv(opts) {
  opts = opts || {};
  const props = Object.assign({}, opts.props);
  const state = { events: (opts.events || []).slice(), sheetRows: [], pushes: [], triggers: [], logs: [], nextId: 1 };

  const GuestStatus = { NO: 'NO', YES: 'YES', MAYBE: 'MAYBE', INVITED: 'INVITED' };

  function mkEvent(e) {
    return {
      _e: e,
      isAllDayEvent: () => !!e.allDay,
      getMyStatus: () => e.myStatus || GuestStatus.YES,
      getStartTime: () => new Date(e.start),
      getEndTime: () => new Date(e.end),
      getId: () => e.id
    };
  }

  const calendar = {
    getName: () => 'テストカレンダー',
    getEvents: (from, to) => state.events
      .filter(e => new Date(e.start) < to && new Date(e.end) > from)
      .map(mkEvent),
    createEvent: (title, start, end, o) => {
      const id = 'evt_' + (state.nextId++);
      state.events.push({ id, title, start: +start, end: +end, description: (o || {}).description });
      return { getId: () => id };
    }
  };

  const sheet = {
    _name: props.SHEET_NAME || '予約台帳',
    getName() { return this._name; },
    getLastRow: () => state.sheetRows.length,
    appendRow: r => state.sheetRows.push(r.slice()),
    getRange: (row, col, numRows, numCols) => ({
      setFontWeight: () => {},
      setValue: v => { state.sheetRows[row - 1][col - 1] = v; },
      getValues: () => state.sheetRows.slice(row - 1, row - 1 + numRows).map(r => r.slice(col - 1, col - 1 + numCols))
    }),
    setFrozenRows: () => {}
  };

  const sandbox = {
    console,
    Logger: { log: m => state.logs.push(String(m)) },
    Utilities: { getUuid: () => 'uuid-' + (state.nextId++) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = v; }
      })
    },
    CalendarApp: {
      getCalendarById: id => (opts.badCalendar ? null : calendar),
      GuestStatus
    },
    Calendar: opts.advancedCalendar === false ? undefined : {
      Calendars: { get: () => ({ id: 'cal' }) },
      Events: {
        insert: (res, calId, params) => {
          if (opts.meetFails) throw new Error('conferenceData not supported');
          const id = 'evt_' + (state.nextId++);
          state.events.push({ id, title: res.summary, start: +new Date(res.start.dateTime), end: +new Date(res.end.dateTime), description: res.description });
          return { id, hangoutLink: 'https://meet.google.com/abc-defg-hij' };
        }
      }
    },
    SpreadsheetApp: {
      openById: id => ({
        getSheetByName: n => (n === sheet._name ? sheet : null),
        insertSheet: n => { sheet._name = n; return sheet; }
      })
    },
    UrlFetchApp: {
      fetch: (url, params) => {
        state.pushes.push({ url, payload: JSON.parse(params.payload), auth: (params.headers || {}).Authorization });
        const code = opts.lineFails ? 401 : 200;
        return { getResponseCode: () => code, getContentText: () => (code === 200 ? '{}' : '{"message":"Invalid token"}') };
      }
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
    },
    ScriptApp: {
      getProjectTriggers: () => state.triggers.slice(),
      deleteTrigger: t => { state.triggers = state.triggers.filter(x => x !== t); },
      newTrigger: fn => ({
        timeBased: () => ({
          everyDays: () => ({
            atHour: h => ({ create: () => { state.triggers.push({ getHandlerFunction: () => fn, hour: h }); } })
          })
        })
      })
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: s => ({ setMimeType: () => ({ _json: JSON.parse(s) }) })
    }
  };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(__dirname, '..', 'gas', 'Code.gs'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'Code.gs' });
  return { s: sandbox, state, props };
}

const D = (y, m, d, h, mi) => +new Date(y, m - 1, d, h || 0, mi || 0, 0, 0);
const ymd = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');

// 実行日に依存しないよう、常に「次の平日」を基準日にする
function nextWeekday(offsetDays) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (offsetDays || 2));
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

const BASE_PROPS = {
  CALENDAR_ID: 'primary', SHEET_ID: 'sheet1', LINE_CHANNEL_ACCESS_TOKEN: 'TOKEN',
  HOST_NAME: '宮田陽子', SERVICE_NAME: '無料相談（60分）',
  BUSINESS_START: '10', BUSINESS_END: '18', LUNCH_START: '12', LUNCH_END: '13',
  SLOT_MINUTES: '60', WEEKDAYS: '1,2,3,4,5', DAYS_AHEAD: '30',
  MIN_LEAD_HOURS: '24', REMINDER_HOUR: '18'
};

// ---------- 1. applyDefaultConfig ----------
section('applyDefaultConfig');
{
  const { s, props } = makeEnv({ props: {} });
  const msg = s.applyDefaultConfig();
  ok(props.BUSINESS_START === '10', '未設定の項目に初期値が入る');
  ok(/CALENDAR_ID/.test(msg) && /SHEET_ID/.test(msg), '手入力が必要な項目を列挙する', msg);
  const { s: s2, props: p2 } = makeEnv({ props: { BUSINESS_START: '9', CALENDAR_ID: 'x', SHEET_ID: 'y', LINE_CHANNEL_ACCESS_TOKEN: 'z', HOST_NAME: 'w' } });
  const msg2 = s2.applyDefaultConfig();
  ok(p2.BUSINESS_START === '9', '既存の値は上書きしない');
  ok(/なし（すべて設定済み）/.test(msg2), 'すべて揃っていればその旨を返す', msg2);
}

// ---------- 2. availableSlots ----------
section('availableSlots（空き枠の計算）');
{
  const day = nextWeekday(3);
  const { s } = makeEnv({ props: BASE_PROPS, events: [] });
  const set = s.settings();
  const all = s.availableSlots(day, day, set);
  const slots = all[ymd(day)] || [];
  ok(JSON.stringify(slots) === JSON.stringify(['10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']),
    '営業10-18時・昼休み12-13時 → 7枠（12時が抜ける）', slots);

  // 既存予定と重なる枠が消える
  const y = day.getFullYear(), m = day.getMonth() + 1, d = day.getDate();
  const { s: s2 } = makeEnv({ props: BASE_PROPS, events: [{ id: 'e1', start: D(y, m, d, 14), end: D(y, m, d, 15) }] });
  const slots2 = s2.availableSlots(day, day, s2.settings())[ymd(day)] || [];
  ok(!slots2.includes('14:00') && slots2.includes('15:00'), '既存予定14-15時 → 14:00だけ消える', slots2);

  // 部分的な重なりも除外される（14:30-15:30 は 14:00 と 15:00 の両方に掛かる）
  const { s: s3 } = makeEnv({ props: BASE_PROPS, events: [{ id: 'e2', start: D(y, m, d, 14, 30), end: D(y, m, d, 15, 30) }] });
  const slots3 = s3.availableSlots(day, day, s3.settings())[ymd(day)] || [];
  ok(!slots3.includes('14:00') && !slots3.includes('15:00') && slots3.includes('16:00'),
    '14:30-15:30 の予定 → 14:00と15:00が消える', slots3);

  // 終日予定は無視
  const { s: s4 } = makeEnv({ props: BASE_PROPS, events: [{ id: 'e3', allDay: true, start: D(y, m, d, 0), end: D(y, m, d + 1, 0) }] });
  const slots4 = s4.availableSlots(day, day, s4.settings())[ymd(day)] || [];
  ok(slots4.length === 7, '終日予定は空き枠に影響しない', slots4.length);

  // 欠席(NO)の予定は無視
  const { s: s5 } = makeEnv({ props: BASE_PROPS, events: [{ id: 'e4', myStatus: 'NO', start: D(y, m, d, 14), end: D(y, m, d, 15) }] });
  const slots5 = s5.availableSlots(day, day, s5.settings())[ymd(day)] || [];
  ok(slots5.includes('14:00'), '「欠席」にした予定は空き扱い', slots5);

  // 土日は出ない
  const sat = new Date(day); while (sat.getDay() !== 6) sat.setDate(sat.getDate() + 1);
  const { s: s6 } = makeEnv({ props: BASE_PROPS });
  ok(!(ymd(sat) in s6.availableSlots(sat, sat, s6.settings())), '土曜は受付対象外');

  // 直近24時間は出ない
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { s: s7 } = makeEnv({ props: BASE_PROPS });
  const near = s7.availableSlots(today, today, s7.settings());
  ok(!(ymd(today) in near) || (near[ymd(today)] || []).length === 0, '当日は MIN_LEAD_HOURS により表示されない');

  // 30分枠
  const { s: s8 } = makeEnv({ props: Object.assign({}, BASE_PROPS, { SLOT_MINUTES: '30' }) });
  const slots8 = s8.availableSlots(day, day, s8.settings())[ymd(day)] || [];
  ok(slots8.includes('10:30') && slots8.includes('17:30') && !slots8.includes('12:30'),
    '30分枠設定で 10:30・17:30 が出て 12:30 は出ない', slots8.slice(0, 4).concat(['…']));

  // 昼休みなし
  const { s: s9 } = makeEnv({ props: Object.assign({}, BASE_PROPS, { LUNCH_START: '', LUNCH_END: '' }) });
  const slots9 = s9.availableSlots(day, day, s9.settings())[ymd(day)] || [];
  ok(slots9.includes('12:00') && slots9.length === 8, '昼休みなし設定で12:00も出る', slots9.length);
}

// ---------- 3. doGet ----------
section('doGet（API）');
{
  const { s } = makeEnv({ props: BASE_PROPS });
  ok(s.doGet({ parameter: { action: 'ping' } })._json.ok === true, 'ping が ok を返す');
  const r = s.doGet({ parameter: { action: 'slots' } })._json;
  ok(r.ok === true && typeof r.days === 'object', 'slots が日付ごとの空き枠を返す');
  ok(r.settings && r.settings.slotMinutes === 60 && !('lineToken' in r.settings), 'settings にトークンが混ざらない', r.settings);
  ok(s.doGet({ parameter: { action: 'nope' } })._json.ok === false, '未知の action はエラーを返す');
  const { s: sBad } = makeEnv({ props: BASE_PROPS, badCalendar: true });
  const rb = sBad.doGet({ parameter: { action: 'slots' } })._json;
  ok(rb.ok === false && /カレンダー/.test(rb.error), 'カレンダー不正時に例外ではなくエラーJSONを返す', rb);
}

// ---------- 4. 予約作成 ----------
section('doPost / createBooking');
{
  const day = nextWeekday(3);
  const iso = ymd(day);
  const env = makeEnv({ props: BASE_PROPS });
  const post = body => env.s.doPost({ postData: { contents: JSON.stringify(body) } })._json;

  const res = post({ action: 'book', date: iso, time: '14:00', name: '山田 花子', topic: 'SNS集客の相談', note: 'テスト', src: 'story', lineUserId: 'U123', displayName: 'はなこ' });
  ok(res.ok === true, '予約が成功する', res);
  ok(!!res.meetUrl, 'Google Meet の URL が返る', res.meetUrl);
  ok(env.state.events.length === 1, 'カレンダーに1件だけ作られる', env.state.events.length);

  ok(env.state.sheetRows.length === 2, '台帳に見出し＋1行が入る', env.state.sheetRows.length);
  const head = env.state.sheetRows[0], row = env.state.sheetRows[1];
  ok(head[0] === '受付日時' && head.length === 14, '見出しが14列', head.length);
  ok(row[head.indexOf('経由')] === 'Instagram ストーリーズ', 'src=story が日本語ラベルで記録される', row[head.indexOf('経由')]);
  ok(row[head.indexOf('予約日')] === iso && row[head.indexOf('開始')] === '14:00' && row[head.indexOf('終了')] === '15:00', '日付・開始・終了が正しい', row.slice(1, 4));
  ok(row[head.indexOf('LINE userId')] === 'U123' && row[head.indexOf('ステータス')] === '予約済', 'userId とステータスが入る');

  ok(env.state.pushes.length === 1, 'LINE push が1回', env.state.pushes.length);
  const push = env.state.pushes[0];
  ok(push.payload.to === 'U123', '宛先が予約者');
  ok(push.auth === 'Bearer TOKEN', 'Bearer トークンが付く');
  ok(/山田 花子さま/.test(push.payload.messages[0].text), '本文に名前が入る');
  ok(push.payload.messages[0].text.includes(res.meetUrl), '本文に Meet URL が入る');
  ok(res.linePushed === true, 'linePushed が true');

  // 二重予約
  const dup = post({ action: 'book', date: iso, time: '14:00', name: '別の人', lineUserId: 'U999' });
  ok(dup.ok === false && dup.code === 'slot_taken', '同じ枠の二重予約は slot_taken で拒否', dup);
  ok(env.state.events.length === 1, '拒否時にカレンダーが増えない');
  ok(env.state.sheetRows.length === 2, '拒否時に台帳が増えない');

  // 別の枠は取れる
  ok(post({ action: 'book', date: iso, time: '15:00', name: '佐藤', lineUserId: 'U2' }).ok === true, '別の時間なら予約できる');

  // 入力チェック
  ok(post({ action: 'book', date: iso, time: '16:00', name: '  ' }).ok === false, '名前が空なら拒否');
  ok(post({ action: 'book', date: '2026/09/10', time: '16:00', name: 'A' }).ok === false, '日付の形式が違えば拒否');
  ok(post({ action: 'book', date: iso, time: '16時', name: 'A' }).ok === false, '時刻の形式が違えば拒否');
  ok(env.s.doPost({ postData: { contents: '{{' } })._json.ok === false, '壊れたJSONでも例外にならない');

  // 管理者通知
  const env2 = makeEnv({ props: Object.assign({}, BASE_PROPS, { ADMIN_LINE_USER_ID: 'Uadmin' }) });
  env2.s.doPost({ postData: { contents: JSON.stringify({ action: 'book', date: iso, time: '11:00', name: '客', lineUserId: 'U5' }) } });
  ok(env2.state.pushes.length === 2 && env2.state.pushes[1].payload.to === 'Uadmin', '管理者にも通知が飛ぶ', env2.state.pushes.map(p => p.payload.to));

  // LINE userId 無し（LINE外からの予約）でも予約自体は通る
  const env3 = makeEnv({ props: BASE_PROPS });
  const r3 = env3.s.doPost({ postData: { contents: JSON.stringify({ action: 'book', date: iso, time: '11:00', name: '匿名' }) } })._json;
  ok(r3.ok === true && r3.linePushed === false, 'userId なしでも予約は成立し、通知はスキップ', r3.linePushed);
  ok(env3.state.pushes.length === 0, 'userId なしなら push しない');

  // LINE が落ちていても予約は残る
  const env4 = makeEnv({ props: BASE_PROPS, lineFails: true });
  const r4 = env4.s.doPost({ postData: { contents: JSON.stringify({ action: 'book', date: iso, time: '11:00', name: '客', lineUserId: 'U7' }) } })._json;
  ok(r4.ok === true && r4.linePushed === false, 'LINE送信が失敗しても予約は成功扱い', r4);
  ok(env4.state.events.length === 1 && env4.state.sheetRows.length === 2, 'LINE失敗時もカレンダーと台帳には残る');

  // Meet が作れない環境
  const env5 = makeEnv({ props: BASE_PROPS, meetFails: true });
  const r5 = env5.s.doPost({ postData: { contents: JSON.stringify({ action: 'book', date: iso, time: '11:00', name: '客', lineUserId: 'U8' }) } })._json;
  ok(r5.ok === true && r5.meetUrl === '', 'Meet が作れなくても予約は成立', r5.meetUrl);
  ok(env5.state.events.length === 1, 'フォールバックでカレンダー予定は作られる');
}

// ---------- 5. リマインド ----------
section('sendReminders（前日リマインド）');
{
  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = ymd(tomorrow);
  const env = makeEnv({ props: Object.assign({}, BASE_PROPS, { MIN_LEAD_HOURS: '0', WEEKDAYS: '0,1,2,3,4,5,6' }) });
  env.s.doPost({ postData: { contents: JSON.stringify({ action: 'book', date: iso, time: '14:00', name: '明日の人', lineUserId: 'Utomorrow' }) } });
  const pushesAfterBook = env.state.pushes.length;

  env.s.sendReminders();
  ok(env.state.pushes.length === pushesAfterBook + 1, '明日の予約にリマインドが1通', env.state.pushes.length - pushesAfterBook);
  const rem = env.state.pushes[env.state.pushes.length - 1];
  ok(rem.payload.to === 'Utomorrow' && /明日/.test(rem.payload.messages[0].text), '宛先と本文が正しい');

  env.s.sendReminders();
  ok(env.state.pushes.length === pushesAfterBook + 1, '2回実行しても重複送信しない', env.state.pushes.length - pushesAfterBook);

  const head = env.state.sheetRows[0];
  ok(!!env.state.sheetRows[1][head.indexOf('リマインド送信')], '送信済みの記録が台帳に入る');

  // 明後日の予約には送らない
  const env2 = makeEnv({ props: Object.assign({}, BASE_PROPS, { MIN_LEAD_HOURS: '0', WEEKDAYS: '0,1,2,3,4,5,6' }) });
  const d2 = new Date(); d2.setHours(0, 0, 0, 0); d2.setDate(d2.getDate() + 2);
  env2.s.doPost({ postData: { contents: JSON.stringify({ action: 'book', date: ymd(d2), time: '14:00', name: '明後日', lineUserId: 'U2' }) } });
  const before = env2.state.pushes.length;
  env2.s.sendReminders();
  ok(env2.state.pushes.length === before, '明後日の予約にはまだ送らない');
}

// ---------- 6. トリガー / selfCheck ----------
section('installReminderTrigger / selfCheck');
{
  const env = makeEnv({ props: BASE_PROPS });
  env.s.installReminderTrigger();
  ok(env.state.triggers.length === 1 && env.state.triggers[0].hour === 18, 'トリガーが18時で1件作られる');
  env.s.installReminderTrigger();
  ok(env.state.triggers.length === 1, '再実行しても重複しない', env.state.triggers.length);

  const out = env.s.selfCheck();
  ok(/カレンダー: OK/.test(out) && /スプレッドシート: OK/.test(out) && /設定あり/.test(out), 'selfCheck が3項目OKを返す', out);

  const env2 = makeEnv({ props: Object.assign({}, BASE_PROPS, { LINE_CHANNEL_ACCESS_TOKEN: '' }) });
  ok(/NG 未設定/.test(env2.s.selfCheck()), 'トークン未設定を検出する');
}

console.log('\n' + '─'.repeat(50));
console.log(failures === 0 ? `✅ 全 ${checks} 項目パス` : `❌ ${failures} / ${checks} 項目が失敗`);
process.exit(failures === 0 ? 0 : 1);
