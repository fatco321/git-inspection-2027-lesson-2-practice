export const COMPANY = {
  name: "ООО «Маяк»",
  inn: "0000000001",
  year: "2027",
  number: "УЧ-2027-017",
};
export const TASKS = [
  {
    title: "Ограждение площадки",
    requirement:
      "Восстановить отсутствующую секцию ограждения. На фото должна быть видна вся площадка и непрерывное ограждение.",
    observation:
      "На краю площадки отсутствует секция ограждения. Нужно восстановить защиту по всей открытой стороне.",
    estimate:
      "Нужно изготовить секцию, доставить и закрепить её. На материалы и монтаж потребуется 30 000 ₽, на работы — 2 дня.",
    result:
      "Секция установлена. Ограждение непрерывно, открытого края больше нет.",
    days: 2,
    cost: 30000,
  },
  {
    title: "Шкаф средств защиты",
    requirement:
      "Укомплектовать шкаф средствами защиты. На фото должны быть видны шкаф целиком и заполненные полки.",
    observation:
      "Полки шкафа пусты. Средства защиты необходимо заказать и разместить в шкафу.",
    estimate:
      "Подготовим комплект средств защиты, дождёмся поставки и заполним полки. Это займёт 3 дня и обойдётся в 15 000 ₽.",
    result:
      "Средства защиты размещены в шкафу. Полки заполнены, комплекты доступны.",
    days: 3,
    cost: 15000,
  },
  {
    title: "Проход у склада",
    requirement:
      "Освободить проход и восстановить его разметку. На фото нужен весь проход: без ящиков, с непрерывной разметкой.",
    observation:
      "Проход занят ящиками, разметка нарушена. Недостаточно убрать один ящик: нужно освободить весь проход и восстановить разметку.",
    estimate:
      "Потребуется организовать перенос груза и восстановить разметку. С учётом подготовки и выполнения — 7 дней, расходы — 25 000 ₽.",
    result:
      "Ящики убраны. Проход свободен по всей длине, разметка восстановлена.",
    days: 7,
    cost: 25000,
  },
] as const;
export const PLAN = [
  "Осмотреть нарушения и получить оценки",
  "Составить план мероприятий",
  "Согласовать бюджет",
  "При необходимости запросить продление срока исполнения предписания",
  "Устранить нарушения, принять работы и сделать фото",
  "Отправить отчёты согласованным способом",
  "Проверить ответы инспектора",
] as const;
export type Photo = {
  id: number;
  task: number;
  complete: boolean;
  url: string;
};
export type Job = {
  surveyed: boolean;
  estimated: boolean;
  received: boolean;
  status: "pending" | "working" | "ready" | "review" | "returned" | "accepted";
  finish: number;
  reviewAt: number;
  validReport: boolean;
  feedback: string;
};
export class PracticeState {
  found = false;
  inspected = false;
  planned = false;
  planDraft: number[] = [];
  budget = false;
  day = 0;
  deadline = 12;
  extension: "none" | "pending" | "approved" = "none";
  extensionAt = 0;
  jobs: Job[] = TASKS.map(() => ({
    surveyed: false,
    estimated: false,
    received: false,
    status: "pending",
    finish: 0,
    reviewAt: 0,
    validReport: false,
    feedback: "",
  }));
  photos: Photo[] = [];
  get estimatesComplete() {
    return this.jobs.every((job) => job.estimated);
  }
  survey(id: number) {
    const job = this.jobs[id];
    if (!this.inspected || !job) return "Сначала прочитайте предписание.";
    job.surveyed = true;
    return "";
  }
  estimate(id: number) {
    const job = this.jobs[id];
    if (!job?.surveyed) return "Сначала осмотрите нарушение на месте.";
    job.estimated = true;
    return "";
  }
  receive(id: number) {
    const job = this.jobs[id];
    if (!job || job.status !== "ready")
      return "Работы ещё не готовы к приёмке.";
    job.received = true;
    return "";
  }
  get complete() {
    return this.jobs.every((j) => j.status === "accepted");
  }
  get overdue() {
    return this.day > this.deadline && !this.complete;
  }
  advance() {
    this.day++;
    if (this.day > this.deadline) return;
    if (this.extension === "pending" && this.day >= this.extensionAt) {
      this.extension = "approved";
      this.deadline = 20;
    }
    for (const job of this.jobs) {
      if (job.status === "working" && this.day >= job.finish)
        job.status = "ready";
      if (job.status === "review" && this.day >= job.reviewAt) {
        job.status = job.validReport ? "accepted" : "returned";
        job.feedback = job.validReport
          ? "Инспектор принял подтверждение. Статус пункта обновлён."
          : "Документы возвращены: нужен общий вид именно этого объекта после выполнения работ. Сделайте подходящий снимок и отправьте отчёт повторно.";
      }
    }
  }
  plan(order: number[]) {
    if (!this.inspected)
      return "Сначала прочитайте перечень нарушений в карточке КНМ.";
    if (!this.estimatesComplete)
      return "Осмотрите все три нарушения и получите оценки исполнителей.";
    if (this.planned) return "План уже составлен.";
    if (order.length !== PLAN.length || order.some((step, i) => step !== i))
      return "Проверьте порядок: сначала подготовьте работы, затем выполните их и подтвердите результат. После отправки отчётов нужно получить ответы инспектора.";
    this.planDraft = [...order];
    this.planned = true;
    this.advance();
    return "";
  }
  planProgress() {
    const photographed = this.jobs.filter(
      (j, i) =>
        j.received && this.photos.some((p) => p.task === i && p.complete),
    ).length;
    const submitted = this.jobs.filter(
      (j) => j.status === "review" || j.status === "accepted",
    ).length;
    const accepted = this.jobs.filter((j) => j.status === "accepted").length;
    const returned = this.jobs.filter((j) => j.status === "returned").length;
    return [
      {
        done: this.estimatesComplete,
        detail: `${this.jobs.filter((j) => j.estimated).length}/3 оценок`,
      },
      {
        done: this.planned,
        detail: this.planned ? "План составлен" : "План не составлен",
      },
      {
        done: this.budget,
        detail: this.budget ? "Согласован" : "Ожидает согласования",
      },
      {
        done: this.extension === "approved",
        detail:
          this.extension === "approved"
            ? `Одобрено до дня ${this.deadline}`
            : this.extension === "pending"
              ? "Ожидается ответ · действует прежний срок"
              : "При необходимости",
      },
      {
        done: photographed === this.jobs.length,
        detail: `${photographed}/3 работ приняты и сняты`,
      },
      {
        done: submitted === this.jobs.length,
        detail: `${submitted}/3 отчётов отправлены${returned ? ` · исправить: ${returned}` : ""}`,
      },
      { done: this.complete, detail: `${accepted}/3 пунктов подтверждены` },
    ];
  }
  approveBudget() {
    if (!this.planned)
      return "Для согласования расходов сначала нужен план мероприятий.";
    if (this.budget) return "Бюджет уже согласован.";
    this.budget = true;
    this.advance();
    return "";
  }
  requestExtension(reason: string) {
    if (!this.planned) return "Сначала составьте план, чтобы оценить сроки.";
    if (this.extension !== "none") return "Ходатайство уже направлено.";
    if (reason !== "duration")
      return "Обоснуйте запрос: длительные работы и время на подтверждение результата не укладываются в текущий срок.";
    if (this.day + 2 > this.deadline)
      return "Для этого сценария уже не осталось времени получить ответ до срока.";
    this.extension = "pending";
    this.extensionAt = this.day + 2;
    this.advance();
    return "";
  }
  start(id: number) {
    const job = this.jobs[id];
    if (!job || job.status !== "pending")
      return "Работы по этому пункту уже запущены.";
    if (!job.estimated || !this.planned || !this.budget)
      return "Исполнитель ждёт утверждённый план и согласованный бюджет.";
    job.status = "working";
    job.finish = this.day + TASKS[id].days;
    this.advance();
    return "";
  }
  addPhoto(task: number, complete: boolean, url: string) {
    if (
      !this.jobs[task]?.received ||
      !["ready", "returned"].includes(this.jobs[task]?.status)
    )
      return;
    this.photos.push({
      id: (this.photos.at(-1)?.id ?? 0) + 1,
      task,
      complete,
      url,
    });
    if (this.photos.length > 12) this.photos.shift();
  }
  report(task: number, photoId: number, channel: string) {
    const job = this.jobs[task];
    if (!job || !["ready", "returned"].includes(job.status))
      return "Сначала выполните мероприятие.";
    if (!job.received)
      return "Сначала осмотрите и примите выполненные работы на месте.";
    if (channel !== "gos")
      return "В этом предписании инспектор указал переписку через Госуслуги. Используйте этот канал; при недоступности сервиса способ нужно согласовать.";
    const photo = this.photos.find((p) => p.id === photoId);
    if (!photo) return "Приложите фотографию результата.";
    job.validReport = photo.task === task && photo.complete;
    job.status = "review";
    job.reviewAt = this.day + 2;
    job.feedback = "";
    this.advance();
    return "";
  }
  objective() {
    if (!this.found) return "Найдите назначенную проверку по ИНН организации";
    if (!this.inspected)
      return "Откройте карточку КНМ и прочитайте предписание";
    if (!this.estimatesComplete)
      return `Осмотрите нарушения и соберите оценки: ${this.jobs.filter((j) => j.estimated).length}/3`;
    if (!this.planned) return "Составьте план на доске у администрации";
    if (!this.budget) return "Согласуйте бюджет в администрации";
    if (this.jobs.some((j) => j.status === "returned"))
      return "Исправьте отчёт по замечанию инспектора";
    if (this.complete) return "Все пункты подтверждены — поговорите с Андреем";
    if (this.jobs.some((j) => j.status === "ready" && !j.received))
      return "Осмотрите и примите готовые работы на месте";
    return "Организуйте работы и отправляйте подтверждения по мере готовности";
  }
  hint() {
    if (this.complete)
      return "В плане больше нет открытых пунктов. Возвращайся ко мне — подведём итоги.";
    if (this.overdue)
      return "Времени на ответ уже не осталось. При новой попытке подумай, какой работе опаснее всего долго ждать своей очереди.";
    if (!this.found)
      return "Отсутствие письма ещё не означает отсутствия проверки. У организации есть более точный ориентир, чем её название, — он поможет найти нужную запись.";
    if (!this.inspected)
      return "Номер проверки у нас есть. Но из него не узнать, что именно потребуется изменить и когда результат будут ждать. Где это должно быть записано?";
    if (!this.estimatesComplete) {
      const id = this.jobs.findIndex((j) => !j.estimated);
      return this.jobs[id].surveyed
        ? `По пункту «${TASKS[id].title}» ты уже увидел проблему. Но для плана одного наблюдения мало: кто сможет объяснить, во что обойдётся исправление и сколько придётся ждать?`
        : `В пункте «${TASKS[id].title}» пока есть только требование на бумаге. Я бы не обещал ни срок, ни сумму, ещё не увидев, с чем предстоит работать.`;
    }
    if (!this.planned) return this.draftHint();
    if (!this.budget)
      return "В твоём плане подготовка уже отмечена. Но цифры в смете пока лишь предложение: кто на предприятии может разрешить эти расходы?";

    const hasPhoto = (id: number) =>
      this.photos.some((p) => p.task === id && p.complete);
    const returned = this.jobs.findIndex((j) => j.status === "returned");
    if (returned !== -1)
      return `По пункту «${TASKS[returned].title}» цепочка дошла до ответа, но не до подтверждения. Подумай, чего не увидел получатель: самого результата или доказательства именно по этому пункту. В его замечании есть зацепка.`;
    const ready = this.jobs.findIndex((j) => j.status === "ready");
    if (ready !== -1) {
      const title = TASKS[ready].title;
      if (!this.jobs[ready].received)
        return `По пункту «${title}» исполнитель закончил. Но отметка о завершении и твоя уверенность в результате — не одно и то же. В плане между работой и отчётом есть важная проверка на месте.`;
      return hasPhoto(ready)
        ? `По пункту «${title}» у тебя уже есть и результат, и его изображение. Теперь подумай, как это увидит тот, кто выдал предписание. Нужный способ общения был указан в начале.`
        : `Результат по пункту «${title}» ты видел своими глазами. А человек, который будет решать, закрывать ли пункт, рядом не стоял. Что позволит ему увидеть то же самое?`;
    }
    const pending = this.jobs
      .map((job, id) => ({ job, id }))
      .filter(({ job }) => job.status === "pending")
      .sort((a, b) => TASKS[b.id].days - TASKS[a.id].days);
    if (pending.length) {
      const id = pending[0].id;
      if (
        this.extension === "none" &&
        this.day + TASKS[id].days + pending.length + 2 > this.deadline
      )
        return "Сравни оставшееся время с самой долгой работой в плане. Последний день монтажа — ещё не день подтверждения. Для такой ситуации у тебя предусмотрен отдельный шаг, и о нём лучше вспомнить заранее.";
      if (this.extension === "pending")
        return "Просьба уже отправлена, но календарь сам от этого не изменился. Пока ждёшь ответ, подумай, какие согласованные работы не обязаны ждать вместе с тобой.";
      return "Смета согласована, но некоторые пункты всё ещё только на бумаге. Если всем дать старт по очереди, короткие работы могут задержать самую долгую. С какой опаснее тянуть?";
    }
    const working = this.jobs.some((j) => j.status === "working");
    const reviewing = this.jobs.some((j) => j.status === "review");
    if (working && reviewing)
      return "Сейчас план движется сразу в двух местах: на площадке и на стороне инспектора. Следующая полезная новость появится с течением времени — важно потом заметить, что именно изменилось.";
    if (working)
      return "Все поручения уже приняты. Повторный разговор не ускорит работу. Дай пройти времени, а затем сравни состояние объектов с отметками в плане.";
    if (reviewing)
      return "В твоём плане есть шаг после отправки. Квитанция говорит, что сообщение ушло, но не отвечает на главный вопрос: согласился ли получатель с результатом?";
    return "Сопоставь отметки на доске с тем, что действительно произошло. Где действие уже выполнено, но его результат ещё никто не подтвердил?";
  }
  private draftHint() {
    const clues = [
      "Прежде чем обещать результат, нужно понять исходное состояние. Откуда в обоснованном плане вообще берутся сроки и суммы?",
      "Сведения о каждом объекте уже собраны. По отдельности они ещё не подсказывают, как организовать всю работу. Что должно связать их в общую последовательность?",
      "Последовательность придумана, но исполнители не могут потратить деньги только потому, что сумма записана на доске. Чьего решения не хватает?",
      "Даже согласованная смета не добавляет дней в календаре. Какой возможный риск стоит предусмотреть до начала долгих работ?",
      "Подготовительные вопросы учтены. Но ни план, ни переписка сами по себе не меняют площадку. Что должно появиться прежде, чем будет о чём отчитываться?",
      "Результат получен и зафиксирован. Пока он известен только тебе. Как сведения попадут к тому, кто ждёт исполнения?",
      "Сообщение может быть доставлено, а пункт всё ещё оставаться открытым. Как убедиться, что история действительно закончилась?",
    ];
    const wrong = this.planDraft.findIndex((id, index) => id !== index);
    if (wrong !== -1)
      return `В твоей последовательности шаг «${PLAN[this.planDraft[wrong]]}» появился раньше своей предпосылки. ${clues[wrong]}`;
    if (this.planDraft.length === PLAN.length)
      return "В цепочке есть и подготовка, и результат, и обратная связь. Теперь важно проверить её целиком — просто заполненная доска ещё не запускает работы.";
    const previous = this.planDraft.at(-1);
    return (
      (previous === undefined
        ? "На доске пока нет последовательности. "
        : `Последним ты выбрал «${PLAN[previous]}». `) +
      clues[this.planDraft.length]
    );
  }
}

export function formatDays(value: number): string {
  const n = Math.max(0, Math.ceil(value)),
    last = n % 10,
    lastTwo = n % 100;
  return `${n} ${last === 1 && lastTwo !== 11 ? "день" : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? "дня" : "дней"}`;
}
