// ======================================================================
//  i18n — multi-language (Vietnamese / English)
//  Use [data-i18n] for text, [data-i18n-ph] for placeholder,
//  [data-i18n-title] for tooltip. t(key, {vars}) for dynamic strings.
// ======================================================================
const I18N = {
  vi: {
    app_title: "🍅 Pomodoro",
    tab_work: "Tập trung", tab_short: "Nghỉ ngắn", tab_long: "Nghỉ dài",
    btn_start: "Bắt đầu", btn_pause: "Tạm dừng", reset: "Đặt lại", skip: "Bỏ qua",
    counter_pre: "Đã hoàn thành", counter_post: "pomodoro",
    hint_pre: "Mẹo: nhấn", hint_post: "để bắt đầu / tạm dừng",
    exit_plan: "✕ Thoát kế hoạch",
    tasks_title: "📋 Việc cần làm", clear_all: "Xóa hết", add: "Thêm",
    task_ph: "Bạn sẽ tập trung làm gì?", min_title: "Số phút",
    empty_hint: "Chưa có việc nào. Thêm việc hoặc tạo kế hoạch bằng chatbot bên dưới 👇",
    run_title: "Bắt đầu việc này", text_title: "Bấm để đánh dấu xong",
    min_edit_title: "Đổi số phút", del_title: "Xóa",
    chat_title: "💬 Trợ lý tạo kế hoạch", chat_ph: "VD: làm 50 phút nghỉ 10 phút 4 hiệp", send: "Gửi",
    settings_title: "Cài đặt",
    set_work: "Tập trung", set_short: "Nghỉ ngắn", set_long: "Nghỉ dài",
    set_interval: "Nghỉ dài sau mỗi (pomodoro)",
    set_auto: "Tự động bắt đầu phiên tiếp theo", set_sound: "Âm báo khi hết giờ", set_notify: "Thông báo trên màn hình",
    set_lang: "Ngôn ngữ", set_bg: "Màu nền", set_bg_custom: "Màu tùy chọn",
    bg_dark: "Tối", bg_light: "Sáng", bg_custom: "Tùy chọn",
    save: "Lưu", cancel: "Hủy", close: "Đóng",
    greeting: "Chào bạn! Gõ kế hoạch của bạn, ví dụ: “làm 50 phút nghỉ 10 phút 4 hiệp”. Mình sẽ thêm vào checklist và chạy tự động.",
    plan_summary: "Đã tạo kế hoạch: {repeat} hiệp × (làm {work}′ + nghỉ {brk}′){long}.\nTổng cộng ≈ {total} phút ({n} phiên).",
    plan_summary_long: ", nghỉ dài {longBrk}′ ở cuối",
    plan_added: "\nĐã thêm {n} việc vào checklist. Bấm ▶ Bắt đầu để chạy tự động.",
    not_understood: "Mình chưa hiểu. Thử: “làm 50 phút nghỉ 10 phút 4 hiệp”.",
    plan_complete: "🎉 Bạn đã hoàn thành toàn bộ kế hoạch. Làm tốt lắm!",
    plan_exited: "Đã thoát kế hoạch, quay về chế độ thường.",
    plan_skipped: "Đã thoát kế hoạch.",
    plan_badge: "Kế hoạch {i}/{total}",
    plan_task: "Hiệp {i} · Tập trung {min}′",
    notify_title: "🍅 Hết giờ!", notify_break: "Nghỉ một chút nhé.", notify_focus: "Quay lại tập trung thôi!",
    confirm_clear: "Xóa toàn bộ việc cần làm?",
    prompt_minutes: 'Thời lượng cho "{name}" (vd: 25m, 2h, 90s):',
    unit_min: "phút", unit_hour: "giờ", unit_sec: "giây", unit_title: "Đơn vị",
    dup_task: "Việc này đã có rồi (trùng tên và thời lượng).",
    chips: [
      { label: "làm 50' nghỉ 10' × 4", text: "làm 50 phút nghỉ 10 phút 4 hiệp, nghỉ dài 20 phút" },
      { label: "học 25' nghỉ 5' × 3", text: "học 25 phút nghỉ 5 phút 3 lần" },
      { label: "90' × 2", text: "tập trung 90 phút nghỉ 15 phút 2 hiệp" },
    ],
  },
  en: {
    app_title: "🍅 Pomodoro",
    tab_work: "Focus", tab_short: "Short break", tab_long: "Long break",
    btn_start: "Start", btn_pause: "Pause", reset: "Reset", skip: "Skip",
    counter_pre: "Completed", counter_post: "pomodoros",
    hint_pre: "Tip: press", hint_post: "to start / pause",
    exit_plan: "✕ Exit plan",
    tasks_title: "Tasks", clear_all: "Clear all", add: "Add",
    task_ph: "What will you focus on?", min_title: "Minutes",
    empty_hint: "No tasks yet. Add one above, or use the assistant to generate a plan.",
    run_title: "Start this task", text_title: "Mark as done",
    min_edit_title: "Edit duration", del_title: "Delete",
    chat_title: "Plan assistant", chat_ph: "e.g. work 50 min break 10 min 4 sessions", send: "Send",
    settings_title: "Settings",
    set_work: "Focus", set_short: "Short break", set_long: "Long break",
    set_interval: "Long break after every (pomodoros)",
    set_auto: "Auto-start next session", set_sound: "Sound when time is up", set_notify: "Desktop notifications",
    set_lang: "Language", set_bg: "Background", set_bg_custom: "Custom color",
    bg_dark: "Dark", bg_light: "Light", bg_custom: "Custom",
    save: "Save", cancel: "Cancel", close: "Close",
    greeting: "Describe your session plan and it will be built automatically. Example: “work 50 min break 10 min 4 sessions”.",
    plan_summary: "Plan created: {repeat} sets × (focus {work}′ + break {brk}′){long}.\nTotal ≈ {total} min ({n} sessions).",
    plan_summary_long: ", long break {longBrk}′ at the end",
    plan_added: "\nAdded {n} task(s). Press Start to begin.",
    not_understood: "Couldn't parse that. Try: “work 50 min break 10 min 4 sessions”.",
    plan_complete: "Plan complete — all sessions finished.",
    plan_exited: "Plan closed. Back to standard mode.",
    plan_skipped: "Plan closed.",
    plan_badge: "Plan {i}/{total}",
    plan_task: "Set {i} · Focus {min}′",
    notify_title: "Time's up", notify_break: "Time for a break.", notify_focus: "Back to focus.",
    confirm_clear: "Clear all tasks?",
    prompt_minutes: 'Duration for "{name}" (e.g. 25m, 2h, 90s):',
    unit_min: "min", unit_hour: "hr", unit_sec: "sec", unit_title: "Unit",
    dup_task: "This task already exists (same name and duration).",
    chips: [
      { label: "work 50' break 10' × 4", text: "work 50 min break 10 min 4 sessions, long break 20 min" },
      { label: "focus 25' break 5' × 3", text: "focus 25 min break 5 min 3 sessions" },
      { label: "90' × 2", text: "focus 90 min break 15 min 2 sessions" },
    ],
  },
};

class I18n {
  constructor(lang) { this.setLang(lang); }

  setLang(lang) { this.lang = I18N[lang] ? lang : "vi"; }

  t(key, vars) {
    let s = (I18N[this.lang] && I18N[this.lang][key]);
    if (s == null) s = key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  }

  chips() { return I18N[this.lang].chips || []; }

  // apply all static strings to the DOM
  apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = this.t(el.getAttribute("data-i18n")); });
    root.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = this.t(el.getAttribute("data-i18n-ph")); });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = this.t(el.getAttribute("data-i18n-title")); });
  }
}
