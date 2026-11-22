interface FieldNoteProps {
  id: string;
  error?: string;
  hint?: string;
}

// 入力欄の下の説明とエラー。key を分けて要素ごと入れ替える（既存の要素に role="alert" を足すだけだと読み上げられない環境がある）
export function FieldNote({ id, error, hint }: FieldNoteProps) {
  if (error) {
    return (
      <p key="error" id={id} role="alert" className="m-0 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p key="hint" id={id} className="m-0 text-sm text-muted-foreground">
        {hint}
      </p>
    );
  }
  return null;
}
