// ======================================================================
//  Scheduler — decides "what the next session is".
//  Two modes:
//   * classic : the standard loop work -> short break -> ... -> long break.
//   * plan    : runs the queue created by the CHATBOT (auto-advancing from
//               one session to the next until the plan is finished).
// ======================================================================
class Scheduler {
  constructor(settings) {
    this.s = settings;
    this.reset();
  }

  reset() {
    this.mode = "classic";   // 'classic' | 'plan'
    this.type = "work";      // current session type in classic mode
    this.completed = 0;      // number of pomodoros (work) completed
    this.plan = [];          // the plan's session queue
    this.planIndex = 0;
  }

  // current session: {type, seconds, mode, index?, total?}
  current() {
    if (this.mode === "plan") {
      const seg = this.plan[this.planIndex];
      return { ...seg, seconds: seg.minutes * 60, mode: "plan", index: this.planIndex + 1, total: this.plan.length };
    }
    return { type: this.type, seconds: this.s.secondsFor(this.type), mode: "classic" };
  }

  // user clicks a tab to choose the mode manually
  setType(type) {
    this.mode = "classic";
    this.type = type;
  }

  // move to the next session (after time is up or when Skip is pressed).
  // returns true if a session remains, false if the plan is finished.
  advance() {
    if (this.mode === "plan") {
      this.planIndex++;
      return this.planIndex < this.plan.length;
    }
    // classic mode: work -> break; every N pomodoros take a long break
    if (this.type === "work") {
      this.completed++;
      this.type = (this.completed % this.s.longBreakInterval === 0) ? "long" : "short";
    } else {
      this.type = "work";
    }
    return true;
  }

  loadPlan(segments) {
    this.mode = "plan";
    this.plan = segments;
    this.planIndex = 0;
  }

  exitPlan() {
    this.mode = "classic";
    this.type = "work";
  }
}
