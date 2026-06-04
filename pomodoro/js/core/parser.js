// ======================================================================
//  PlanParser — offline "CHATBOT" (no network, no API key).
//  Reads one Vietnamese/English sentence -> extracts: work minutes, break
//  minutes, long-break minutes, number of sets -> builds a list of sessions
//  (segments) for the Scheduler to run automatically.
//
//  Understood examples:
//   "làm 50 phút nghỉ 10 phút 4 hiệp, nghỉ dài 20 phút"
//   "học 25 nghỉ 5 x3"
//   "work 90 min break 15, 2 sessions"
//   "làm 1 giờ nghỉ 15 phút 3 hiệp"      (hours)
//   "nửa tiếng làm, nghỉ 5"               (half an hour)
//   "50/10 x4"  /  "25-5, 4 sets"         (shorthand work/break)
// ======================================================================
class PlanParser {
  parse(text) {
    let t = (text || "").toLowerCase().trim();

    // 0) normalize common spoken durations -> explicit minutes
    t = t
      .replace(/n[uử]a\s*(?:ti[ếe]ng|gi[ờo])/g, "30 phút")
      .replace(/(?:m[ộo]t|1)\s*(?:ti[ếe]ng|gi[ờo])\s*r[uư][ởỡ]i/g, "90 phút")
      .replace(/(?:ti[ếe]ng|gi[ờo])\s*r[uư][ởỡ]i/g, "90 phút");

    // read the number following one of the keywords, with an optional time
    // unit, and return it in MINUTES (hours/seconds converted). null if absent.
    const dur = (str, keywords) => {
      const re = new RegExp(
        "(?:" + keywords + ")[^\\d]{0,14}(\\d+(?:[.,]\\d+)?)\\s*" +
        "(giờ|gio|tiếng|tieng|hours?|h|phút|phut|minutes?|min|m|giây|giay|seconds?|sec|s)?",
        "i"
      );
      const m = str.match(re);
      if (!m) return null;
      let v = parseFloat(m[1].replace(",", "."));
      const u = (m[2] || "").toLowerCase();
      if (/^(giờ|gio|tiếng|tieng|hour|h)/.test(u)) v *= 60;        // hours -> minutes
      else if (/^(giây|giay|second|sec|s)$/.test(u)) v /= 60;      // seconds -> minutes
      return v;
    };

    // 1) long break first, then strip its phrase so "break"/"nghỉ" inside
    //    "long break" / "nghỉ dài" doesn't pollute the short-break value.
    let longBrk = dur(t, "nghỉ dài|nghi dai|nghỉ lớn|long break");
    const tShort = t.replace(
      /(nghỉ dài|nghi dai|nghỉ lớn|long break)[^\d]{0,14}\d+(?:[.,]\d+)?\s*[a-zà-ỹ]*/g, " ");

    // 2) work + short break (short break read from the cleaned text)
    let work = dur(t, "làm|lam|học|hoc|focus|work|tập trung|tap trung|pomodoro|pomo");
    let brk = dur(tShort, "nghỉ ngắn|nghi ngan|nghỉ|nghi|break|rest|giải lao|giai lao");

    // 3) shorthand "50/10" or "25-5" (work / break)
    const sh = t.match(/(\d+)\s*[\/-]\s*(\d+)/);
    if (sh) {
      if (work == null) work = parseInt(sh[1], 10);
      if (brk == null) brk = parseInt(sh[2], 10);
    }

    // 4) number of sets / repetitions
    let rep = (() => {
      let m = t.match(/(\d+)\s*(?:hiệp|hiep|lần|lan|sets?|sessions?|chu kỳ|chu ky|vòng|vong|pomodoros?)/);
      if (m) return parseInt(m[1], 10);
      m = t.match(/x\s*(\d+)/) || t.match(/(\d+)\s*x\b/);
      return m ? parseInt(m[1], 10) : null;
    })();

    // nothing recognized at all -> let the caller show "not understood"
    if (work == null && brk == null && longBrk == null && rep == null && !sh) {
      return { segments: [], work: 25, brk: 5, longBrk: null, repeat: 1, totalMin: 0, summary: "" };
    }

    work = Math.max(1, Math.round(work == null ? 25 : work));
    brk = Math.max(1, Math.round(brk == null ? 5 : brk));
    if (longBrk != null) longBrk = Math.max(1, Math.round(longBrk));
    const repeat = rep != null ? Math.max(1, Math.min(rep, 20)) : 1;

    // build sessions: each set = 1 work + 1 break; the last set uses the long
    // break if the user mentioned one, otherwise a short break.
    const segments = [];
    for (let i = 0; i < repeat; i++) {
      segments.push({ type: "work", minutes: work });
      const isLast = i === repeat - 1;
      if (isLast && longBrk != null) segments.push({ type: "long", minutes: longBrk });
      else segments.push({ type: "short", minutes: brk });
    }

    const totalMin = segments.reduce((s, seg) => s + seg.minutes, 0);
    const summary =
      `Plan: ${repeat} sets × (focus ${work}′ + break ${brk}′)` +
      (longBrk != null ? `, long break ${longBrk}′ at the end` : "") +
      `.\nTotal ≈ ${totalMin} min (${segments.length} sessions).`;

    return { segments, work, brk, longBrk, repeat, totalMin, summary };
  }
}
