# 🍅 Personal Pomodoro

A simple Pomodoro timer that runs 100% in the browser — **no install, no server**.
It also has a chatbot that turns one sentence into an auto-running pomodoro plan.

🔗 **Live demo:** https://nhanphanthiviet.github.io/just-for-fun/pomodoro/

## How to run

**Easiest:** open the `pomodoro/` folder and double-click `index.html`.

**Or via localhost** (better for desktop notifications):

```bash
# run inside the pomodoro/ folder
npx serve -l 8000
```

Then open **http://localhost:8000**.

## Features

- 3 modes: **Focus / Short break / Long break**
- Accurate countdown (uses real clock time, no drift in background tabs)
- Auto-advance between sessions, with a long break every few rounds
- To-do list saved in your browser (localStorage)
- Sound + desktop notification when time is up
- 🎵 **Relaxing playlist** (rain / ocean / wind chimes / soft pad) — click a track to play a gentle looping soundscape, click again to stop; smooth fade in/out and a volume slider
- 💬 **Chatbot**: type e.g. `work 50 min break 10 min 4 sessions` → it builds the plan
- Tip: press **Space** to start/pause

## Project structure

```
pomodoro/
├─ index.html              # markup
├─ assets/                 # icons (favicon, …)
├─ css/
│  └─ style.css            # all styles
└─ js/
   ├─ app.js               # UI controller — wires everything together
   ├─ i18n.js              # translations (vi / en)
   └─ core/                # pure logic (no DOM)
      ├─ settings.js       # save/load settings
      ├─ timer.js          # countdown clock
      ├─ ambient.js        # background soundscapes (white noise / rain / café)
      ├─ scheduler.js      # work/break loop + plan queue
      ├─ parser.js         # chatbot: text → plan (offline)
      └─ tasks.js          # to-do list
```

The `js/core/` modules contain plain logic and never touch the DOM; `app.js`
is the only file that reads/writes the page.
