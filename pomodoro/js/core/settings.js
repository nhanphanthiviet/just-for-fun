// ======================================================================
//  Settings — save & load user configuration (localStorage)
// ======================================================================
class Settings {
  static KEY = "pomodoro.settings";

  constructor() {
    // default values — each duration has a value + unit ('m' | 'h' | 's')
    this.work = 25;  this.workUnit = "m";   // focus
    this.short = 5;  this.shortUnit = "m";  // short break
    this.long = 15;  this.longUnit = "m";   // long break
    this.longBreakInterval = 4;   // how many pomodoros before a long break
    this.autoStart = true;        // auto-start the next session
    this.soundOn = true;          // sound alert when time is up
    this.notifyOn = true;         // on-screen notification
    this.language = "en";         // 'vi' | 'en'
    this.background = "dark";     // 'dark' | 'light' | 'custom'
    this.bgCustom = "#1b2a4a";    // background color when background==='custom'
    this.load();
  }

  // seconds for a given session type (value × its unit)
  secondsFor(type) {
    const pick = { work: [this.work, this.workUnit], long: [this.long, this.longUnit] }[type]
      || [this.short, this.shortUnit];
    const factor = pick[1] === "h" ? 3600 : pick[1] === "s" ? 1 : 60;
    return Math.max(1, Math.round((parseFloat(pick[0]) || 1) * factor));
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(Settings.KEY));
      if (data) Object.assign(this, data);
    } catch (_) { /* ignore corrupted data */ }
  }

  save() {
    localStorage.setItem(Settings.KEY, JSON.stringify({
      work: this.work, short: this.short, long: this.long,
      workUnit: this.workUnit, shortUnit: this.shortUnit, longUnit: this.longUnit,
      longBreakInterval: this.longBreakInterval,
      autoStart: this.autoStart, soundOn: this.soundOn, notifyOn: this.notifyOn,
      language: this.language, background: this.background, bgCustom: this.bgCustom,
    }));
  }
}
