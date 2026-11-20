interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
  // 見出しの段。表や帯の見出し（h2）の下なら3、ジャンルの見出し（h3）の下なら4
  level?: 3 | 4;
}

// 詳細の欄の見出しと中身
export function DetailSection({ title, children, level = 3 }: DetailSectionProps) {
  const Heading = level === 4 ? "h4" : "h3";
  return (
    <section className="space-y-1.5">
      <Heading className="m-0 text-xs font-medium text-muted-foreground">{title}</Heading>
      <div className="text-sm">{children}</div>
    </section>
  );
}
