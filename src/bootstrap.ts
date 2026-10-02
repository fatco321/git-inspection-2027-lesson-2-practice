import { PracticeGame } from "./game/PracticeGame";
import "./styles/main.css";
const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const game = new PracticeGame(canvas);
let disposed = false;
void game.ready.catch((error) => {
  if (disposed) return;
  console.error(error);
  const note = document.createElement("p");
  note.id = "load-error";
  note.textContent = "Не удалось загрузить сцену. Обновите страницу.";
  document.body.append(note);
});
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    disposed = true;
    document.getElementById("load-error")?.remove();
    game.dispose();
  });
