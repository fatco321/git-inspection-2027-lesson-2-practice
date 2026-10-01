import {
  PracticeState,
  TASKS,
  PLAN,
  COMPANY,
  formatDays,
} from "./PracticeState";
import { PracticeUI, type Choice } from "../ui/practice/PracticeUI";
export class PracticeFlow {
  state = new PracticeState();
  readonly ui: PracticeUI;
  started = false;
  private ended = false;
  private busy = false;
  private disposed = false;
  constructor(
    toggle: (open: boolean) => void,
    interact: () => void,
    private readonly photograph: (id: number) => void,
    private readonly finish: () => Promise<void>,
    private readonly advanceDay: (from: number, to: number) => Promise<void>,
    private readonly examine: (
      id: number,
      result: boolean,
      done: () => void,
    ) => void,
  ) {
    this.ui = new PracticeUI(toggle, interact);
  }
  intro() {
    this.ui.show(
      "Практика второго урока",
      "Вернёмся на предприятие. Сначала найдите проверку и прочитайте предписание. Осмотрите каждое нарушение и запросите оценку исполнителя. На доске соберите общий план, согласуйте бюджет и запустите работы. Готовые работы нужно принять на месте, сфотографировать и подтвердить отчётом.\n\nСтрелки — ходить. Зажмите левую кнопку мыши и двигайте мышь — повернуть камеру; колесо — приблизить. Подойдите к объекту и нажмите Enter.\n\nВ сценарии условные сроки и расходы. Время идёт только после действий и кнопки ожидания. Если не знаешь, чем заняться дальше, подойди к Андрею и нажми Enter — он подскажет следующий этап.",
      [
        {
          text: "Начать практику",
          action: () => {
            this.started = true;
            this.ui.hud.hidden = false;
            this.ui.close();
            this.refresh();
          },
        },
      ],
    );
  }
  refresh() {
    let details = this.state.inspected
      ? `Срок: день ${this.state.deadline} · Подтверждено ${this.state.jobs.filter((j) => j.status === "accepted").length}/3`
      : `Организация: ${COMPANY.name} · ИНН ${COMPANY.inn}`;
    if (this.state.extension === "pending")
      details += "\nПродление: ожидается ответ";
    if (this.state.extension === "approved")
      details += "\nПродление одобрено: до дня 20";
    this.ui.updateHud(
      this.state.day,
      this.state.inspected ? this.state.deadline : undefined,
      this.state.objective(),
      details,
    );
  }
  private close: Choice = {
    text: "Назад",
    secondary: true,
    action: () => this.ui.close(),
  };
  private async act(action: () => string, next: () => void) {
    if (this.busy || this.disposed) return;
    const before = this.state.day;
    const error = action();
    if (error) {
      this.ui.message(error);
      return;
    }
    if (this.state.day > before) {
      this.busy = true;
      this.ui.setDayTransition(true);
      await this.advanceDay(before, this.state.day);
      if (this.disposed) return;
      this.busy = false;
      this.ui.setDayTransition(false);
    }
    this.refresh();
    if (this.state.overdue) {
      this.timeout();
      return;
    }
    next();
  }
  private timeout() {
    this.ui.show(
      "Срок пропущен",
      "Отчёты не успели пройти проверку. В этом сценарии нужно повторить исполнение: заранее оценить длительные работы и оставить время на возможную доработку.",
      [
        {
          text: "Повторить исполнение",
          action: () => {
            this.state = new PracticeState();
            this.state.found = true;
            this.state.inspected = true;
            this.refresh();
            this.ui.close();
          },
        },
      ],
    );
  }
  interact(id: string) {
    if (!this.started || this.ended || this.busy) return;
    if (id === "guide" && this.state.complete) {
      this.end();
      return;
    }
    if (id === "guide") {
      this.ui.show("Андрей Криницын", this.state.hint(), [this.close]);
      return;
    }
    if (id === "terminal") {
      this.terminal();
      return;
    }
    if (id === "plan") {
      this.plan();
      return;
    }
    if (id === "admin") {
      this.admin();
      return;
    }
    if (id.startsWith("task")) this.task(Number(id.slice(4)));
  }
  terminal() {
    if (!this.state.found) {
      this.ui.show(
        "Терминал проверок",
        `${COMPANY.name} · ИНН ${COMPANY.inn}\nНайдите назначенное мероприятие на ${COMPANY.year} год.`,
        [
          {
            text: "Уведомления на Госуслугах",
            action: () =>
              this.ui.message(
                "Новых уведомлений нет. Инспектор направляет их вручную. Для поиска в плане проверьте ЕРКНМ или сайт инспекции.",
              ),
          },
          { text: "Поиск в ЕРКНМ", action: () => this.search("ЕРКНМ") },
          {
            text: "Региональный план ГИТ",
            action: () => this.search("План ГИТ"),
          },
          this.close,
        ],
      );
      return;
    }
    const status = [
      "pending",
      "working",
      "ready",
      "review",
      "returned",
      "accepted",
    ];
    const labels = [
      "не начато",
      "работы идут",
      "готово к приёмке",
      "отчёт на проверке",
      "нужна доработка",
      "подтверждено",
    ];
    this.ui.show(
      "Карточка КНМ · " + COMPANY.number,
      `Проверка завершена. Выдано предписание.\nКанал отчёта, указанный инспектором: Госуслуги → Мои проверки → карточка КНМ → Обращение к ведомству.\n\n` +
        TASKS.map(
          (t, i) =>
            `${i + 1}. ${t.title}: ${this.state.jobs[i].status === "ready" && this.state.jobs[i].received ? "принято на месте, нужен отчёт" : this.state.jobs[i].status === "pending" ? (this.state.jobs[i].estimated ? "оценка получена" : this.state.jobs[i].surveyed ? "осмотрено, нужна оценка" : "не осмотрено") : labels[status.indexOf(this.state.jobs[i].status)]}${this.state.jobs[i].status === "working" ? ` · ещё ${formatDays(this.state.jobs[i].finish - this.state.day)}` : ""}${this.state.jobs[i].feedback ? "\n" + this.state.jobs[i].feedback : ""}`,
        ).join("\n\n"),
      [
        { text: "Прочитать предписание", action: () => this.prescription() },
        { text: "Создать обращение — отчёт", action: () => this.report() },
        { text: "Ходатайство о продлении", action: () => this.extension() },
        { text: "Дождаться следующего дня", action: () => this.wait() },
        this.close,
      ],
    );
  }
  private search(source: string) {
    this.ui.show(source, `Введите ИНН организации: ${COMPANY.inn}`, []);
    const label = document.createElement("label");
    label.textContent = "ИНН организации";
    const input = document.createElement("input");
    input.inputMode = "numeric";
    input.maxLength = 10;
    label.append(input);
    this.ui.body.append(label);
    const button = document.createElement("button");
    button.textContent = "Найти";
    button.onclick = () => {
      if (input.value.trim() !== COMPANY.inn) {
        this.ui.message(
          "Организация не найдена. Сверьте ИНН с карточкой организации.",
        );
        return;
      }
      this.ui.show(
        "Результаты поиска",
        "Сверьте организацию, год и орган контроля.",
        [
          {
            text: "ООО «Маяк» · ИНН 0000000002 · ГИТ · 2027",
            action: () =>
              this.ui.message(
                "Название совпадает, но ИНН другой. Это другая организация.",
              ),
          },
          {
            text: "ООО «Маяк» · ИНН 0000000001 · ГИТ · 2026",
            action: () =>
              this.ui.message(
                "Это мероприятие за прошлый год. Найдите запись на 2027 год.",
              ),
          },
          {
            text: "ООО «Маяк» · ИНН 0000000001 · ГИТ · 2027",
            action: () => {
              this.state.found = true;
              this.refresh();
              this.ui.show(
                "Проверка найдена",
                `Номер мероприятия: ${COMPANY.number}.\n\nПрошло время. Проверка завершилась, и организация получила предписание. Теперь нужно организовать исполнение и сообщить инспектору о результате.`,
                [
                  {
                    text: "Открыть карточку КНМ",
                    action: () => this.terminal(),
                  },
                ],
              );
            },
          },
          this.close,
        ],
      );
    };
    this.ui.body.append(button);
    input.focus();
    const back = document.createElement("button");
    back.textContent = "Назад";
    back.onclick = () => this.terminal();
    this.ui.body.append(back);
  }
  private prescription() {
    this.state.inspected = true;
    this.refresh();
    this.ui.show(
      "Предписание",
      `Срок исполнения: день ${this.state.deadline}.\n\n` +
        TASKS.map((t, i) => `${i + 1}. ${t.title}\n${t.requirement}`).join(
          "\n\n",
        ) +
        "\n\nОсмотрите каждое нарушение на месте и получите оценки исполнителей. Длительность и расходы будут сохранены в плане. Можно выполнять пункты и отчитываться по очереди. На ответ по отчёту и ходатайству в этом сценарии требуется 2 дня. Отправка отчёта занимает 1 день.",
      [{ text: "К карточке", action: () => this.terminal() }, this.close],
    );
  }
  private estimates() {
    return TASKS.map(
      (t, i) =>
        `${i + 1}. ${t.title}\n${
          this.state.jobs[i].estimated
            ? `${formatDays(t.days)} · ${t.cost.toLocaleString("ru")} ₽`
            : this.state.jobs[i].surveyed
              ? "Осмотрено · запросите оценку исполнителя"
              : "Не осмотрено"
        }`,
    ).join("\n\n");
  }
  private plan() {
    if (!this.state.inspected) {
      this.ui.show(
        "Доска мероприятий",
        "Сначала найдите проверку и прочитайте предписание в терминале.",
        [this.close],
      );
      return;
    }
    const total = TASKS.reduce((sum, task) => sum + task.cost, 0);
    const estimates =
      this.estimates() +
      (this.state.estimatesComplete
        ? `\n\nВсего: ${total.toLocaleString("ru")} ₽. Срок исполнения: день ${this.state.deadline}. Работы можно вести параллельно.`
        : "\n\nСоберите оценки всех трёх нарушений.");
    if (!this.state.estimatesComplete) {
      this.ui.show("План мероприятий", estimates, [this.close]);
      return;
    }
    if (this.state.planned) {
      const progress = this.state.planProgress();
      this.ui.show("План мероприятий", "", [this.close]);
      const list = document.createElement("ol");
      list.className = "plan-progress";
      for (const id of this.state.planDraft.length
        ? this.state.planDraft
        : PLAN.map((_, i) => i)) {
        const row = document.createElement("li");
        row.className = progress[id].done ? "done" : "pending";
        const title = document.createElement("strong");
        title.textContent = `${progress[id].done ? "✓ " : ""}${PLAN[id]}`;
        const detail = document.createElement("span");
        detail.textContent = progress[id].detail;
        row.append(title, detail);
        list.append(row);
      }
      this.ui.body.append(list);
      const works = document.createElement("p");
      works.textContent =
        TASKS.map((task, i) => {
          const job = this.state.jobs[i];
          const status =
            job.status === "pending"
              ? "Не начато"
              : job.status === "working"
                ? `В работе · ещё ${formatDays(job.finish - this.state.day)}`
                : job.status === "ready"
                  ? !job.received
                    ? "Готово к приёмке"
                    : this.state.photos.some((p) => p.task === i && p.complete)
                      ? "Фото готово · отправьте отчёт"
                      : "Принято · сделайте фото"
                  : job.status === "review"
                    ? "Отчёт на проверке"
                    : job.status === "returned"
                      ? "Отчёт возвращён · нужна доработка"
                      : "Подтверждено инспектором";
          return `${task.title} · ${formatDays(task.days)} · ${task.cost.toLocaleString("ru")} ₽\n${status}`;
        }).join("\n\n") +
        `\n\nВсего: ${total.toLocaleString("ru")} ₽ · срок: день ${this.state.deadline}`;
      this.ui.body.append(works);
      return;
    }
    const order = this.state.planDraft;
    this.ui.show(
      "Составьте план",
      order.length
        ? order.map((id, i) => `${i + 1}. ${PLAN[id]}`).join("\n")
        : "Выберите действия в правильной последовательности.",
      [
        ...[4, 1, 6, 0, 5, 3, 2]
          .filter((id) => !order.includes(id))
          .map((id) => ({
            text: PLAN[id],
            action: () => {
              order.push(id);
              this.plan();
            },
          })),
        ...(order.length === PLAN.length
          ? [
              {
                text: "Проверить и запустить план · 1 день",
                action: () =>
                  this.act(
                    () => this.state.plan(order),
                    () => this.plan(),
                  ),
              },
            ]
          : []),
        ...(order.length
          ? [
              {
                text: "Убрать последний шаг",
                secondary: true,
                action: () => {
                  order.pop();
                  this.plan();
                },
              },
              {
                text: "Составить заново",
                secondary: true,
                action: () => {
                  order.length = 0;
                  this.plan();
                },
              },
            ]
          : []),
        this.close,
      ],
    );
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Оценки работ";
    const body = document.createElement("p");
    body.textContent = estimates;
    details.append(summary, body);
    this.ui.body.append(details);
  }

  private admin() {
    if (!this.state.planned) {
      this.ui.show(
        "Администрация",
        "Сначала осмотрите нарушения, получите оценки исполнителей и подготовьте общий план на доске. Тогда можно согласовать расходы.",
        [this.close],
      );
      return;
    }
    this.ui.show(
      "Администрация",
      this.state.budget
        ? "Бюджет согласован. Исполнители готовы начать мероприятия."
        : "По подготовленному плану требуется 70 000 ₽: ограждение — 30 000, шкаф — 15 000, проход — 25 000.\nСогласование занимает 1 день.",
      [
        ...(this.state.budget
          ? []
          : [
              {
                text: "Согласовать бюджет · 1 день",
                action: () =>
                  this.act(
                    () => this.state.approveBudget(),
                    () => this.admin(),
                  ),
              },
            ]),
        { ...this.close, text: "Завершить разговор" },
      ],
    );
  }
  private extension() {
    if (this.state.extension !== "none") {
      this.ui.show(
        "Ходатайство",
        this.state.extension === "approved"
          ? "Получен ответ: срок продлён до дня 20."
          : "Ходатайство отправлено. Ответ ожидается; прежний срок пока сохраняется.",
        [{ text: "К карточке", action: () => this.terminal() }, this.close],
      );
      return;
    }
    this.ui.show(
      "Запрос продления",
      "Оцените длительность работ и оставьте время на отчёт и возможную доработку. Ответ не приходит мгновенно.",
      [
        {
          text: "Обосновать длительными работами и сроком подготовки подтверждений",
          action: () =>
            this.act(
              () => this.state.requestExtension("duration"),
              () => this.extension(),
            ),
        },
        {
          text: "Попросить перенести срок без объяснений",
          action: () =>
            this.act(
              () => this.state.requestExtension("none"),
              () => this.extension(),
            ),
        },
        this.close,
      ],
    );
  }
  private task(id: number) {
    const task = TASKS[id],
      job = this.state.jobs[id];
    if (!this.state.inspected) {
      this.ui.show(
        task.title,
        "Требования к объекту указаны в предписании. Сначала изучите его в терминале.",
        [this.close],
      );
      return;
    }
    if (!job.surveyed) {
      this.ui.show(
        task.title,
        task.requirement +
          "\n\nОбъект ещё не осмотрен. Оценка работ пока неизвестна.",
        [
          {
            text: "Осмотреть нарушение",
            action: () => {
              this.ui.close();
              this.examine(
                id,
                false,
                () =>
                  void this.act(
                    () => this.state.survey(id),
                    () => this.task(id),
                  ),
              );
            },
          },
          this.close,
        ],
      );
      return;
    }
    if (!job.estimated) {
      this.ui.show(
        task.title + " · осмотр",
        task.observation +
          "\n\nТеперь запросите у исполнителя оценку длительности и расходов.",
        [
          {
            text: "Запросить оценку исполнителя",
            action: () =>
              this.act(
                () => this.state.estimate(id),
                () => {
                  this.ui.show(
                    "Оценка исполнителя",
                    task.estimate +
                      "\n\nОценка сохранена в общем плане на доске мероприятий.",
                    [this.close],
                  );
                },
              ),
          },
          this.close,
        ],
      );
      return;
    }
    const description =
      job.status === "working"
        ? `Исполнитель работает. До завершения: ${formatDays(job.finish - this.state.day)} (день ${job.finish}). Можно заняться другими пунктами или подождать.`
        : job.status === "pending"
          ? `Оценка исполнителя: ${formatDays(task.days)} · ${task.cost.toLocaleString("ru")} ₽. Требуются план и бюджет. Запуск — 1 день.`
          : job.status === "accepted"
            ? "Подтверждение принято инспектором."
            : job.status === "review"
              ? "Отчёт отправлен. Ожидается ответ инспектора."
              : job.received
                ? "Работа принята на месте. Зафиксируйте результат целиком и отправьте подтверждение через терминал."
                : "Исполнитель завершил работу. Осмотрите результат перед приёмкой.";
    this.ui.show(task.title, task.requirement + "\n\n" + description, [
      ...(job.status === "pending"
        ? [
            {
              text: "Поручить выполнение · 1 день",
              action: () =>
                this.act(
                  () => this.state.start(id),
                  () => this.task(id),
                ),
            },
          ]
        : []),
      ...(job.status === "ready" && !job.received
        ? [
            {
              text: "Осмотреть результат",
              action: () => {
                this.ui.close();
                this.examine(
                  id,
                  true,
                  () =>
                    void this.act(
                      () => this.state.receive(id),
                      () => this.task(id),
                    ),
                );
              },
            },
          ]
        : []),
      ...(job.received && ["ready", "returned"].includes(job.status)
        ? [
            {
              text: "Зафиксировать результат",
              action: () => {
                this.ui.close();
                this.photograph(id);
              },
            },
          ]
        : []),
      ...(job.status === "working"
        ? [
            {
              text: "Дождаться следующего дня",
              action: () => this.wait(() => this.task(id)),
            },
          ]
        : []),
      this.close,
    ]);
  }
  private report() {
    const ready = this.state.jobs
      .map((j, i) => ({ j, i }))
      .filter(
        ({ j }) => j.received && ["ready", "returned"].includes(j.status),
      );
    if (!ready.length) {
      this.ui.show(
        "Отчёт",
        "Пока нет принятых на месте работ для отчёта. Подойдите к готовому объекту, осмотрите результат и примите работу. Затем сделайте фото.",
        [{ text: "К карточке", action: () => this.terminal() }, this.close],
      );
      return;
    }
    let task: HTMLSelectElement,
      photo: HTMLSelectElement,
      channel: HTMLSelectElement;
    this.ui.show(
      "Создать обращение",
      "Соотнесите пункт предписания с фотографией. Отправляйте готовые результаты, не дожидаясь последнего дня.",
      [
        {
          text: "Отправить отчёт · 1 день",
          action: () =>
            this.act(
              () =>
                this.state.report(
                  Number(task.value),
                  Number(photo.value),
                  channel.value,
                ),
              () => this.terminal(),
            ),
        },
        this.close,
      ],
    );
    task = this.ui.select(
      "Пункт предписания",
      ready.map(({ i }) => ({ value: String(i), text: TASKS[i].title })),
    );
    photo = this.ui.select("Подтверждение", [
      { value: "", text: "Выберите снимок" },
      ...this.state.photos.map((p) => ({
        value: String(p.id),
        text: `Фото ${p.id} · ${TASKS[p.task].title}`,
      })),
    ]);
    channel = this.ui.select("Канал отправки", [
      { value: "", text: "Выберите канал" },
      {
        value: "gos",
        text: "Госуслуги → Мои проверки → Обращение к ведомству",
      },
      { value: "email", text: "Электронная почта" },
      { value: "inspector", text: "Мобильный инспектор" },
    ]);
    const gallery = document.createElement("div");
    gallery.className = "practice-gallery";
    this.state.photos.forEach((p) => {
      const figure = document.createElement("figure"),
        img = document.createElement("img"),
        caption = document.createElement("figcaption");
      img.src = p.url;
      img.alt = `Фото ${p.id}: ${TASKS[p.task].title}`;
      img.className = "practice-photo";
      caption.textContent = `Фото ${p.id}`;
      figure.append(img, caption);
      gallery.append(figure);
    });
    this.ui.body.append(gallery);
  }
  private wait(next = () => this.terminal()) {
    void this.act(() => {
      this.state.advance();
      return "";
    }, next);
  }
  private end() {
    this.ended = true;
    this.ui.show(
      "Андрей Криницын",
      "Ты нашёл проверку, организовал исполнение и довёл отчёты до подтверждения. Особенно важно: ты проверил ответ инспектора, а не остановился на отправке.\nВ следующем уроке разберём работу с «Мобильным инспектором».",
      [
        {
          text: "Завершить практику",
          action: async () => {
            if (this.busy || this.disposed) return;
            this.busy = true;
            await this.finish();
            if (this.disposed) return;
            this.busy = false;
            let saved = true;
            try {
              localStorage.setItem(
                "git-inspection-2027:lesson-2-practice",
                JSON.stringify({
                  version: 1,
                  completedAt: new Date().toISOString(),
                }),
              );
            } catch {
              saved = false;
            }
            if (!saved)
              this.ui.show(
                "Прогресс не сохранён",
                "Разрешите хранение данных для игры.",
                [],
              );
          },
        },
      ],
    );
  }
  dispose() {
    this.disposed = true;
    this.ui.dispose();
  }
}
