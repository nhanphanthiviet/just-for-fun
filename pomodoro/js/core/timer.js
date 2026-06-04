// ======================================================================
//  CountdownTimer — countdown clock.
//  Computed from real wall-clock time (Date.now) so it doesn't drift or lose
//  seconds even when the browser throttles setInterval in a background tab.
// ======================================================================
class CountdownTimer {
  constructor({ onTick, onComplete } = {}) {
    this.onTick = onTick;          // (secondsLeft, secondsTotal) => ...
    this.onComplete = onComplete;  // called when it reaches 0
    this.totalMs = 0;
    this.remainingMs = 0;
    this.endAt = 0;                // end timestamp while running
    this.handle = null;
  }

  get running() { return this.handle !== null; }

  // load a new session (seconds) and stop the clock
  load(seconds) {
    this.stop();
    this.totalMs = seconds * 1000;
    this.remainingMs = this.totalMs;
    this._emit();
  }

  start() {
    if (this.running || this.remainingMs <= 0) return;
    this.endAt = Date.now() + this.remainingMs;
    this.handle = setInterval(() => this._tick(), 250);
    this._emit();
  }

  pause() {
    if (!this.running) return;
    this.remainingMs = Math.max(0, this.endAt - Date.now());
    this.stop();
    this._emit();
  }

  toggle() { this.running ? this.pause() : this.start(); }

  reset() {
    this.stop();
    this.remainingMs = this.totalMs;
    this._emit();
  }

  stop() {
    if (this.handle !== null) { clearInterval(this.handle); this.handle = null; }
  }

  _tick() {
    this.remainingMs = Math.max(0, this.endAt - Date.now());
    this._emit();
    if (this.remainingMs <= 0) {
      this.stop();
      this.onComplete && this.onComplete();
    }
  }

  _emit() {
    const left = Math.ceil(this.remainingMs / 1000);
    const total = Math.round(this.totalMs / 1000);
    this.onTick && this.onTick(left, total);
  }
}
