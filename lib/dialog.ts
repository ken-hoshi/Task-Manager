// ダイアログの中で候補の一覧やカレンダーを開いているときの Escape は、それを閉じるだけにする。
// Radix の Dialog は Escape を document の capture 段階で先に受けるので、何もしないとダイアログごと閉じて入力が消える。
// DialogContent の onEscapeKeyDown に渡す
export function keepDialogOpenWhilePopupOpen(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  // react-select の入力欄は、候補の一覧を開いている間 aria-expanded="true" になる
  const selectMenuOpen = target?.getAttribute("aria-expanded") === "true";
  // react-datepicker は、カレンダーを開いている間だけ popper を描く
  const calendarOpen = document.querySelector(".react-datepicker-popper") !== null;
  if (selectMenuOpen || calendarOpen) event.preventDefault();
}
