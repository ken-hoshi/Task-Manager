interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

// 詳細の欄の見出しと中身。ページの h1・表や帯の h2 の下に置くので h3
export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section className="space-y-1.5">
      <h3 className="m-0 text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="text-sm">{children}</div>
    </section>
  );
}
