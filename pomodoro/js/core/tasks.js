// ======================================================================
//  TaskStore — to-do list (saved in localStorage).
//  Each task stores its own duration in SECONDS (so it can express
//  hours / minutes / seconds), used to run a fitting pomodoro.
// ======================================================================
class TaskStore {
  static KEY = "pomodoro.tasks";

  constructor() {
    this.items = [];   // {id, text, seconds, done}
    this.load();
  }

  load() {
    try {
      const arr = JSON.parse(localStorage.getItem(TaskStore.KEY)) || [];
      // migrate older tasks that were stored in "minutes"
      this.items = arr.map((it) => (it.seconds != null)
        ? it
        : { ...it, seconds: Math.max(1, (parseInt(it.minutes, 10) || 25) * 60) });
    } catch (_) { this.items = []; }
  }

  save() {
    localStorage.setItem(TaskStore.KEY, JSON.stringify(this.items));
  }

  // add a task, return the created object (to link it with a plan)
  add(text, seconds = 1500) {
    text = (text || "").trim();
    if (!text) return null;
    const item = {
      id: Date.now() + Math.random(),
      text,
      seconds: Math.max(1, parseInt(seconds, 10) || 1500),
      done: false,
    };
    this.items.push(item);
    this.save();
    return item;
  }

  // find a task with the same name (case-insensitive) AND same duration
  findDuplicate(text, seconds) {
    const t = (text || "").trim().toLowerCase();
    return this.items.find((i) => i.text.trim().toLowerCase() === t && i.seconds === seconds) || null;
  }

  toggle(id) {
    const it = this.items.find((i) => i.id === id);
    if (it) { it.done = !it.done; this.save(); }
  }

  setDone(id, done) {
    const it = this.items.find((i) => i.id === id);
    if (it) { it.done = done; this.save(); }
  }

  setSeconds(id, seconds) {
    const it = this.items.find((i) => i.id === id);
    if (it) { it.seconds = Math.max(1, parseInt(seconds, 10) || it.seconds); this.save(); }
  }

  remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    this.save();
  }

  // reorder the list to match a sequence of ids (from drag & drop)
  reorder(ids) {
    const byId = new Map(this.items.map((i) => [String(i.id), i]));
    const next = ids.map((id) => byId.get(id)).filter(Boolean);
    if (next.length === this.items.length) { this.items = next; this.save(); }
  }

  clear() {
    this.items = [];
    this.save();
  }
}
