import "./practice.css";
export type Choice = { text: string; action: () => void; secondary?: boolean };
export class PracticeUI {
  readonly hud = document.createElement("div");
  private readonly hint = document.createElement("button");
  readonly panel = document.createElement("section");
  private readonly title = document.createElement("h2");
  readonly body = document.createElement("div");
  private readonly actions = document.createElement("div");
  private readonly note = document.createElement("p");
  constructor(
    private readonly toggle: (open: boolean) => void,
    interact: () => void,
  ) {
    this.hud.className = "practice-hud";
    this.hud.hidden = true;
    this.hint.className = "interaction-hint";
    this.hint.hidden = true;
    this.hint.addEventListener("click", interact);
    this.panel.className = "practice-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-modal", "true");
    this.title.id = "practice-title";
    this.panel.setAttribute("aria-labelledby", this.title.id);
    this.body.className = "practice-body";
    this.actions.className = "practice-actions";
    this.note.className = "practice-note";
    this.note.setAttribute("role", "status");
    this.panel.append(this.title, this.body, this.note, this.actions);
    document.body.append(this.hud, this.hint, this.panel);
  }
  setDayTransition(active: boolean) {
    this.panel.style.visibility = active ? "hidden" : "";
    this.panel.inert = active;
    if (active) this.hint.hidden = true;
  }
  updateHud(
    day: number,
    deadline: number | undefined,
    objective: string,
    details: string,
  ) {
    const clock = document.createElement("div");
    clock.className = "practice-clock";
    const badge = document.createElement("strong");
    badge.className = "practice-day";
    badge.textContent = `День ${day}`;
    clock.append(badge);
    if (deadline !== undefined) {
      const due = document.createElement("span");
      const remaining = deadline - day;
      due.textContent =
        remaining < 0
          ? "Срок истёк"
          : remaining === 0
            ? "Сегодня крайний срок"
            : `До срока: ${remaining} дн.`;
      due.className =
        remaining <= 2 ? "practice-deadline urgent" : "practice-deadline";
      clock.append(due);
    }
    const task = document.createElement("div");
    task.textContent = objective;
    const info = document.createElement("div");
    info.className = "practice-hud-details";
    info.textContent = details;
    this.hud.replaceChildren(clock, task, info);
  }
  get open() {
    return !this.panel.hidden;
  }
  show(title: string, text: string, choices: Choice[]) {
    this.title.textContent = title;
    this.body.replaceChildren();
    this.note.textContent = "";
    const p = document.createElement("p");
    p.textContent = text;
    this.body.append(p);
    if (title === "Андрей Криницын") {
      const portrait = document.createElement("img");
      portrait.src = `${import.meta.env.BASE_URL}images/characters/andrey-cartoon-v2.png`;
      portrait.alt = "Андрей Криницын";
      portrait.className = "practice-guide-portrait";
      this.body.prepend(portrait);
    }
    this.actions.replaceChildren();
    for (const c of choices) {
      const b = document.createElement("button");
      b.textContent = c.text;
      b.className = c.secondary ? "secondary" : "";
      b.onclick = c.action;
      this.actions.append(b);
    }
    this.panel.hidden = false;
    this.hint.hidden = true;
    this.toggle(true);
    this.panel.scrollTop = 0;
    (this.actions.querySelector("button") as HTMLButtonElement | null)?.focus();
  }
  message(text: string) {
    this.note.textContent = text;
  }
  close() {
    this.panel.hidden = true;
    this.toggle(false);
  }
  prompt(text: string) {
    this.hint.textContent = text;
    this.hint.hidden = !text || this.open;
  }
  select(label: string, items: { value: string; text: string }[]) {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const select = document.createElement("select");
    select.setAttribute("aria-label", label);
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.text;
      select.append(option);
    }
    wrapper.append(select);
    this.body.append(wrapper);
    return select;
  }
  dispose() {
    this.hud.remove();
    this.hint.remove();
    this.panel.remove();
  }
}
