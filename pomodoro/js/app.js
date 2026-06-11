// ======================================================================
//  Sound — plays a "beep" with Web Audio (no audio file needed)
// ======================================================================
class Sound {
  constructor() { this.ctx = null; }
  _ac() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }
  // a single soft note
  _note(freq, t, dur, peak = 0.25) {
    const ac = this._ac();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = freq;
    o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // gentle "get ready" cue when a session starts (two ascending notes)
  start() {
    const t = this._ac().currentTime;
    this._note(523.25, t, 0.16);          // C5
    this._note(783.99, t + 0.15, 0.24);   // G5
  }
  beep(times = 3) {
    const ac = this._ac();
    let t = ac.currentTime;
    for (let i = 0; i < times; i++) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
      t += 0.28;
    }
  }
}

// ======================================================================
//  Notifier — on-screen notifications
// ======================================================================
class Notifier {
  static request() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
  static show(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }
}

// ======================================================================
//  App — wires Settings + i18n + Timer + Scheduler + Parser + Tasks
// ======================================================================
class App {
  static RING_C = 2 * Math.PI * 130; // circumference of the progress ring (r=130)

  constructor() {
    this.settings = new Settings();
    this.i18n = new I18n(this.settings.language);
    this.scheduler = new Scheduler(this.settings);
    this.parser = new PlanParser();
    this.tasks = new TaskStore();
    this.sound = new Sound();
    this.ambient = new Ambient();
    this.ambient.setVolume(this.settings.ambientVol);
    this.activeTaskId = null;
    this._animateIds = new Set();   // task ids to play an "added" animation for
    this._flashId = null;           // task id to flash (duplicate warning)
    this.timer = new CountdownTimer({
      onTick: (left, total) => this._renderTime(left, total),
      onComplete: () => this._onComplete(),
    });

    this._cacheDom();
    this._bind();

    this.$ringFg.style.strokeDasharray = App.RING_C;
    this._applyBackground();
    this.i18n.apply();
    this._renderChips();
    this.$taskMin.value = this.settings.work;
    this.$taskUnit.value = this.settings.workUnit;
    this.$ambVol.value = Math.round(this.settings.ambientVol * 100);
    this._applyCurrent(false);
    this._renderTasks();
    this._renderTracks();
    this._updateLangBtn();
    this._updateThemeBtn();
    this._botSay(this.i18n.t("greeting"));
  }

  _cacheDom() {
    this.$time = document.getElementById("time");
    this.$phase = document.getElementById("phase-label");
    this.$planBadge = document.getElementById("plan-badge");
    this.$ringFg = document.querySelector(".ring-fg");
    this.$count = document.getElementById("count");
    this.$start = document.getElementById("btn-start");
    this.$exitPlan = document.getElementById("btn-exit-plan");
    this.$tabs = [...document.querySelectorAll(".tab")];
    this.$taskList = document.getElementById("task-list");
    this.$taskMin = document.getElementById("task-min");
    this.$taskUnit = document.getElementById("task-unit");
    this.$taskEmpty = document.getElementById("task-empty");
    this.$taskMsg = document.getElementById("task-msg");
    this.$clearTasks = document.getElementById("btn-clear-tasks");
    this.$chatLog = document.getElementById("chat-log");
    this.$chips = document.getElementById("chips");
    this.$modal = document.getElementById("settings-modal");
    this.$lang = document.getElementById("btn-lang");
    this.$theme = document.getElementById("btn-theme");
    this.$ambTracks = document.getElementById("amb-tracks");
    this.$ambVol = document.getElementById("amb-vol");
  }

  _bind() {
    this.$start.addEventListener("click", () => {
      Notifier.request();
      this.timer.toggle();
      if (this.timer.running) this._playStart();
      this._renderButtons();
    });
    document.getElementById("btn-reset").addEventListener("click", () => {
      this.timer.reset(); this._renderButtons();
    });
    document.getElementById("btn-skip").addEventListener("click", () => this._skip());
    this.$exitPlan.addEventListener("click", () => {
      this.scheduler.exitPlan(); this._applyCurrent(false);
      this._botSay(this.i18n.t("plan_exited"));
    });

    this.$tabs.forEach((tab) => tab.addEventListener("click", () => {
      this.scheduler.setType(tab.dataset.type);
      this._applyCurrent(false);
    }));

    // to-do list
    document.getElementById("task-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("task-input");
      const text = input.value.trim();
      if (!text) return;
      const secs = this._toSeconds(this.$taskMin.value, this.$taskUnit.value) || this.settings.work * 60;
      const dup = this.tasks.findDuplicate(text, secs);
      if (dup) {                              // same name + same duration already exists
        this._taskMsg(this.i18n.t("dup_task"));
        this._flashId = dup.id;
        this._renderTasks();
        return;
      }
      const item = this.tasks.add(text, secs);
      if (item) this._animateIds.add(item.id);
      input.value = "";
      this.$taskMsg.classList.add("hidden");
      this._renderTasks();
    });
    this.$clearTasks.addEventListener("click", () => {
      if (confirm(this.i18n.t("confirm_clear"))) {
        this.tasks.clear(); this.activeTaskId = null; this._renderTasks();
      }
    });

    // drag & drop to reorder tasks (delegated to the list, set up once)
    this.$taskList.addEventListener("dragstart", (e) => {
      const li = e.target.closest(".task-item");
      if (!li) return;
      li.classList.add("dragging");
      this._dropped = false;
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", li.dataset.id); } catch (_) { /* Firefox needs setData */ }
    });
    this.$taskList.addEventListener("dragover", (e) => {
      const dragging = this.$taskList.querySelector(".dragging");
      if (!dragging) return;
      e.preventDefault();
      const after = this._dragAfterElement(e.clientY);
      if (after == null) this.$taskList.appendChild(dragging);
      else this.$taskList.insertBefore(dragging, after);
    });
    this.$taskList.addEventListener("drop", (e) => { e.preventDefault(); this._dropped = true; });
    this.$taskList.addEventListener("dragend", (e) => {
      const li = e.target.closest(".task-item");
      if (li) li.classList.remove("dragging");
      // dropped on the list -> save the new order; cancelled (Esc/outside) -> restore
      if (this._dropped) this._commitTaskOrder();
      else this._renderTasks();
    });

    // chatbot popup
    this.$chatPopup = document.getElementById("chat-popup");
    document.getElementById("chat-fab").addEventListener("click", () => this.$chatPopup.classList.toggle("hidden"));
    document.getElementById("chat-close").addEventListener("click", () => this.$chatPopup.classList.add("hidden"));
    document.getElementById("chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("chat-input");
      this._onChat(input.value); input.value = "";
    });

    // quick toggles on the home screen
    this.$lang.addEventListener("click", () => this._toggleLang());
    this.$theme.addEventListener("click", () => this._toggleTheme());

    // settings
    document.getElementById("btn-settings").addEventListener("click", () => this._openSettings());
    document.getElementById("set-cancel").addEventListener("click", () => this.$modal.classList.add("hidden"));
    document.getElementById("set-save").addEventListener("click", () => this._saveSettings());
    document.getElementById("set-bg").addEventListener("change", (e) => {
      document.getElementById("bg-color-row").classList.toggle("hidden", e.target.value !== "custom");
    });

    // ambient playlist: click a track to play it (loops), click it again to stop
    this.$ambTracks.addEventListener("click", (e) => {
      const btn = e.target.closest(".track");
      if (btn) this._onTrack(btn.dataset.amb);
    });
    this.$ambVol.addEventListener("input", () => {
      const v = (parseInt(this.$ambVol.value, 10) || 0) / 100;
      this.ambient.setVolume(v);
      this.settings.ambientVol = v;
      this.settings.save();
    });

    document.addEventListener("keydown", (e) => {
      // Space toggles the timer — but only when not focused on a control,
      // so buttons/inputs/selects keep their normal keyboard behavior.
      const tag = e.target.tagName;
      if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) {
        e.preventDefault(); this.timer.toggle();
        if (this.timer.running) this._playStart();
        this._renderButtons();
      }
      if (e.code === "Escape") {
        this.$chatPopup.classList.add("hidden");
        this.$modal.classList.add("hidden");
      }
    });
  }

  // ====================================================================
  //  Background / theme (dark | light | custom)
  //  dark/light: use the color palette keyed by data-theme.
  //  custom: use the user's color as the background, auto-pick light/dark
  //  text for readability.
  // ====================================================================
  _applyBackground() {
    const body = document.body;
    body.style.removeProperty("--bg-1");
    body.style.removeProperty("--bg-2");
    const bg = this.settings.background;
    if (bg === "custom") {
      const c1 = this.settings.bgCustom;
      body.dataset.theme = this._isLight(c1) ? "light" : "dark";
      body.style.setProperty("--bg-1", c1);
      body.style.setProperty("--bg-2", this._lighten(c1, 10));
    } else {
      body.dataset.theme = bg; // 'dark' | 'light'
    }
  }

  // is this color light or dark? (to pick a fitting text palette)
  _isLight(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return false;
    const n = parseInt(m[1], 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.55;
  }

  // lighten a hex color by pct% (to build the custom background gradient)
  _lighten(hex, pct) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const mix = (c) => Math.round(c + (255 - c) * (pct / 100));
    const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ====================================================================
  //  Apply the current session to the UI
  // ====================================================================
  _applyCurrent(autostart) {
    this.activeTaskId = null;
    const seg = this.scheduler.current();
    document.body.dataset.mode = seg.type;
    this.timer.load(seg.seconds);

    this.$phase.textContent = this.i18n.t("tab_" + seg.type);
    this.$phase.title = "";
    this.$tabs.forEach((t) => t.classList.toggle("active",
      seg.mode === "classic" && t.dataset.type === seg.type));

    if (seg.mode === "plan") {
      this.$planBadge.textContent = this.i18n.t("plan_badge", { i: seg.index, total: seg.total });
      this.$planBadge.classList.remove("hidden");
      this.$exitPlan.classList.remove("hidden");
    } else {
      this.$planBadge.classList.add("hidden");
      this.$exitPlan.classList.add("hidden");
    }

    if (autostart) this.timer.start();
    this._renderButtons();
    this._renderTasks();
  }

  _runTask(item) {
    Notifier.request();
    this.scheduler.setType("work");
    this.activeTaskId = item.id;
    document.body.dataset.mode = "work";
    this.timer.load(item.seconds);
    this.$phase.textContent = this._shortLabel(item.text);
    this.$phase.title = item.text;   // full text on hover
    this.$tabs.forEach((t) => t.classList.toggle("active", t.dataset.type === "work"));
    this.$planBadge.classList.add("hidden");
    this.$exitPlan.classList.add("hidden");
    this._renderTasks();
    this._playStart();
    this.timer.start();
    this._renderButtons();
  }

  // ====================================================================
  //  Ambient playlist — a manual looping player, independent of the timer.
  //  Click a track to play it; click the active one (or "Off") to stop.
  // ====================================================================
  _onTrack(type) {
    if (type === "off" || this.ambient.type === type) this.ambient.stop();
    else this.ambient.play(type);
    this._renderTracks();
  }

  _renderTracks() {
    this.$ambTracks.querySelectorAll(".track").forEach((b) => {
      b.classList.toggle("active", b.dataset.amb === this.ambient.type);
    });
  }

  // shorten a task name so it fits in the ring: keep the first words, cut on
  // a word boundary, add "…" if trimmed (full text shown via the title tooltip)
  _shortLabel(text, max = 20) {
    const full = (text || "").trim();
    if (full.length <= max) return full;
    let cut = full.slice(0, max);
    const sp = cut.lastIndexOf(" ");
    if (sp > 8) cut = cut.slice(0, sp);   // break on a word boundary when sensible
    return cut.trimEnd() + "…";
  }

  // ====================================================================
  //  A session's time is up
  // ====================================================================
  _onComplete() {
    const finished = this.scheduler.current();
    if (this.settings.soundOn) this.sound.beep();
    if (this.settings.notifyOn) {
      Notifier.show(this.i18n.t("notify_title"),
        this.i18n.t(finished.type === "work" ? "notify_break" : "notify_focus"));
    }

    if (this.scheduler.mode === "plan") {
      if (finished.type === "work" && finished.taskId) this.tasks.setDone(finished.taskId, true);
      const more = this.scheduler.advance();
      if (!more) {
        this.scheduler.exitPlan();
        this._applyCurrent(false);
        this._botSay(this.i18n.t("plan_complete"));
        return;
      }
      this._applyCurrent(true);
    } else {
      const wasWork = finished.type === "work";
      if (wasWork && this.activeTaskId) this.tasks.setDone(this.activeTaskId, true);
      this.scheduler.advance();
      if (wasWork) this.$count.textContent = this.scheduler.completed;
      this._applyCurrent(this.settings.autoStart);
    }
  }

  _skip() {
    if (this.scheduler.mode === "plan") {
      const more = this.scheduler.advance();
      if (!more) {
        this.scheduler.exitPlan(); this._applyCurrent(false);
        this._botSay(this.i18n.t("plan_skipped"));
        return;
      }
      this._applyCurrent(true);
    } else {
      this.scheduler.advance();
      this.$count.textContent = this.scheduler.completed;
      this._applyCurrent(false);
    }
  }

  // ====================================================================
  //  Draw the time + progress ring
  // ====================================================================
  _renderTime(left, total) {
    const h = Math.floor(left / 3600);
    const mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
    const ss = String(left % 60).padStart(2, "0");
    const text = h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
    this.$time.textContent = text;
    document.title = `${text} – ${this.$phase.textContent}`;
    const progress = total ? left / total : 0;
    this.$ringFg.style.strokeDashoffset = App.RING_C * (1 - progress);
  }

  _renderButtons() {
    this.$start.textContent = this.i18n.t(this.timer.running ? "btn_pause" : "btn_start");
  }

  // "get ready" sound when a session starts (if sound is enabled)
  _playStart() {
    if (this.settings.soundOn) this.sound.start();
  }

  // ====================================================================
  //  To-do list
  // ====================================================================
  _renderTasks() {
    this.$taskList.innerHTML = "";
    const has = this.tasks.items.length > 0;
    this.$taskEmpty.classList.toggle("hidden", has);
    this.$clearTasks.classList.toggle("hidden", !has);

    this.tasks.items.forEach((it) => {
      const li = document.createElement("li");
      li.className = "task-item" +
        (it.done ? " done" : "") +
        (it.id === this.activeTaskId ? " active" : "");
      li.draggable = true;
      li.dataset.id = String(it.id);
      if (this._animateIds.has(it.id)) li.classList.add("just-added");
      if (it.id === this._flashId) li.classList.add("flash");

      const grip = document.createElement("span");
      grip.className = "t-grip"; grip.textContent = "⠿"; grip.title = this.i18n.t("drag_title");

      const run = document.createElement("button");
      run.className = "t-run"; run.textContent = "▶"; run.title = this.i18n.t("run_title");
      run.addEventListener("click", () => this._runTask(it));

      const span = document.createElement("span");
      span.className = "t-text"; span.textContent = it.text; span.title = this.i18n.t("text_title");
      span.addEventListener("click", () => { this.tasks.toggle(it.id); this._renderTasks(); });

      const min = document.createElement("button");
      min.className = "t-min"; min.textContent = this._fmtDur(it.seconds); min.title = this.i18n.t("min_edit_title");
      min.addEventListener("click", () => this._editDuration(it));

      const del = document.createElement("button");
      del.className = "t-del"; del.textContent = "🗑"; del.title = this.i18n.t("del_title");
      del.addEventListener("click", () => {
        this.tasks.remove(it.id);
        if (this.activeTaskId === it.id) this.activeTaskId = null;
        this._renderTasks();
      });

      li.append(grip, run, span, min, del);
      this.$taskList.appendChild(li);
      if (it.id === this._flashId) li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    this._animateIds.clear();
    this._flashId = null;
  }

  // which task row should the dragged item be inserted *before* (null = end)
  _dragAfterElement(y) {
    const rows = [...this.$taskList.querySelectorAll(".task-item:not(.dragging)")];
    let closest = { offset: -Infinity, el: null };
    for (const row of rows) {
      const box = row.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;   // above the row's middle?
      if (offset < 0 && offset > closest.offset) closest = { offset, el: row };
    }
    return closest.el;
  }

  // persist the new order shown in the DOM, then re-render cleanly
  _commitTaskOrder() {
    const ids = [...this.$taskList.querySelectorAll(".task-item")].map((li) => li.dataset.id);
    this.tasks.reorder(ids);
    this._renderTasks();
  }

  // brief inline notice under the task form (e.g. duplicate warning)
  _taskMsg(text) {
    this.$taskMsg.textContent = text;
    this.$taskMsg.classList.remove("hidden");
    clearTimeout(this._taskMsgT);
    this._taskMsgT = setTimeout(() => this.$taskMsg.classList.add("hidden"), 2800);
  }

  _editDuration(item) {
    const v = prompt(this.i18n.t("prompt_minutes", { name: item.text }), this._fmtDur(item.seconds));
    if (v === null) return;
    const secs = this._parseDurationStr(v);
    if (secs == null) return;
    this.tasks.setSeconds(item.id, secs);
    if (this.activeTaskId === item.id) this.timer.load(secs);
    this._renderTasks();
  }

  // format a duration (seconds) compactly: 90 -> "1m30s", 1500 -> "25m", 7200 -> "2h"
  _fmtDur(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const parts = [];
    if (h) parts.push(h + "h");
    if (m) parts.push(m + "m");
    if (s || !parts.length) parts.push(s + "s");
    return parts.join("");
  }

  // number + unit ('m' | 'h' | 's') -> seconds (null if invalid)
  _toSeconds(value, unit) {
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    const factor = unit === "h" ? 3600 : unit === "s" ? 1 : 60;
    return Math.max(1, Math.round(n * factor));
  }

  // parse "25m" / "2h" / "90s" / "25" (plain number = minutes) -> seconds
  _parseDurationStr(str) {
    const m = String(str).trim().match(/^(\d+(?:\.\d+)?)\s*([hms])?$/i);
    if (!m) return null;
    return this._toSeconds(m[1], (m[2] || "m").toLowerCase());
  }

  // ====================================================================
  //  Chatbot — create a plan + auto-add it to the checklist
  // ====================================================================
  _onChat(text) {
    text = (text || "").trim();
    if (!text) return;
    this._chatMsg(text, "user");
    const r = this.parser.parse(text);
    if (!r.segments.length) {
      this._botSay(this.i18n.t("not_understood"));
      return;
    }

    this.scheduler.loadPlan(r.segments);

    let wi = 0;
    r.segments.forEach((seg) => {
      if (seg.type === "work") {
        wi++;
        const item = this.tasks.add(this.i18n.t("plan_task", { i: wi, min: seg.minutes }), seg.minutes * 60);
        if (item) { seg.taskId = item.id; this._animateIds.add(item.id); }
      }
    });

    this._applyCurrent(false);   // also re-renders the task list (with animations)

    const longPart = r.longBrk != null ? this.i18n.t("plan_summary_long", { longBrk: r.longBrk }) : "";
    const summary = this.i18n.t("plan_summary",
      { repeat: r.repeat, work: r.work, brk: r.brk, total: r.totalMin, n: r.segments.length, long: longPart });
    this._botSay(summary + this.i18n.t("plan_added", { n: wi }));
  }

  _botSay(text) { this._chatMsg(text, "bot"); }

  _chatMsg(text, who) {
    const div = document.createElement("div");
    div.className = "msg " + who;
    div.textContent = text;
    this.$chatLog.appendChild(div);
    this.$chatLog.scrollTop = this.$chatLog.scrollHeight;
  }

  _renderChips() {
    this.$chips.innerHTML = "";
    this.i18n.chips().forEach((c) => {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = c.label;
      b.addEventListener("click", () => this._onChat(c.text));
      this.$chips.appendChild(b);
    });
  }

  // refresh the DYNAMIC labels after a language change (without resetting the clock)
  _relabel() {
    if (!this.activeTaskId) {
      const seg = this.scheduler.current();
      this.$phase.textContent = this.i18n.t("tab_" + seg.type);
      if (seg.mode === "plan") this.$planBadge.textContent = this.i18n.t("plan_badge", { i: seg.index, total: seg.total });
    }
    this._renderButtons();
    this._renderTasks();
  }

  // ====================================================================
  //  Home-screen quick toggles (language / theme)
  // ====================================================================
  _toggleLang() {
    this.settings.language = this.settings.language === "vi" ? "en" : "vi";
    this.settings.save();
    this.i18n.setLang(this.settings.language);
    this.i18n.apply();
    this._renderChips();
    this._relabel();   // language change never alters durations -> keep the clock
    this._updateLangBtn();
  }

  _updateLangBtn() {
    this.$lang.textContent = this.settings.language.toUpperCase();
  }

  // quick toggle cycles dark <-> light (custom stays available in Settings)
  _toggleTheme() {
    // base the flip on what's actually shown (handles starting from 'custom')
    const goingDark = document.body.dataset.theme === "light";
    this.settings.background = goingDark ? "dark" : "light";
    this.settings.save();
    this._applyBackground();
    this._updateThemeBtn();
  }

  _updateThemeBtn() {
    this.$theme.textContent = document.body.dataset.theme === "light" ? "☀️" : "🌙";
  }

  // ====================================================================
  //  Settings
  // ====================================================================
  _openSettings() {
    const s = this.settings;
    document.getElementById("set-work").value = s.work;
    document.getElementById("set-short").value = s.short;
    document.getElementById("set-long").value = s.long;
    document.getElementById("set-work-unit").value = s.workUnit;
    document.getElementById("set-short-unit").value = s.shortUnit;
    document.getElementById("set-long-unit").value = s.longUnit;
    document.getElementById("set-interval").value = s.longBreakInterval;
    document.getElementById("set-auto").checked = s.autoStart;
    document.getElementById("set-sound").checked = s.soundOn;
    document.getElementById("set-notify").checked = s.notifyOn;
    document.getElementById("set-lang").value = s.language;
    document.getElementById("set-bg").value = s.background;
    document.getElementById("set-bg-color").value = s.bgCustom;
    document.getElementById("bg-color-row").classList.toggle("hidden", s.background !== "custom");
    this.$modal.classList.remove("hidden");
  }

  _saveSettings() {
    const s = this.settings;
    const intVal = (id, min, max, def) => {
      const v = parseInt(document.getElementById(id).value, 10);
      return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : def;
    };
    s.work = intVal("set-work", 1, 999, 25);
    s.short = intVal("set-short", 1, 999, 5);
    s.long = intVal("set-long", 1, 999, 15);
    s.workUnit = document.getElementById("set-work-unit").value;
    s.shortUnit = document.getElementById("set-short-unit").value;
    s.longUnit = document.getElementById("set-long-unit").value;
    s.longBreakInterval = intVal("set-interval", 1, 12, 4);
    s.autoStart = document.getElementById("set-auto").checked;
    s.soundOn = document.getElementById("set-sound").checked;
    s.notifyOn = document.getElementById("set-notify").checked;
    s.language = document.getElementById("set-lang").value;
    s.background = document.getElementById("set-bg").value;
    s.bgCustom = document.getElementById("set-bg-color").value;
    s.save();
    this.$modal.classList.add("hidden");

    // apply immediately
    this.i18n.setLang(s.language);
    this._applyBackground();
    this.i18n.apply();
    this._renderChips();
    this.$taskMin.value = s.work;
    this.$taskUnit.value = s.workUnit;
    // only rebuild the timer when it's truly idle (no progress, no active task),
    // so a paused session/task isn't reset by saving settings.
    const idle = !this.timer.running && this.timer.remainingMs === this.timer.totalMs && !this.activeTaskId;
    if (this.scheduler.mode === "classic" && idle) this._applyCurrent(false);
    else this._relabel();
    this._updateLangBtn();
    this._updateThemeBtn();
    if (this.settings.notifyOn) Notifier.request();
  }
}

document.addEventListener("DOMContentLoaded", () => new App());
