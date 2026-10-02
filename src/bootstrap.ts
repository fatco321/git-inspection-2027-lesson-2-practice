import { PracticeGame } from './game/PracticeGame';
import './styles/main.css';
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const game = new PracticeGame(canvas);
let disposed = false;
export const ready = game.ready.catch(error => {
  game.dispose();
  if (!disposed) throw error;
});
if (import.meta.hot) import.meta.hot.dispose(() => {
  disposed = true;
  game.dispose();
});
