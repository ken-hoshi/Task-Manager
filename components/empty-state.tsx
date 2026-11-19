import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

// 一覧が0件のときの表示。画面ごとに形をそろえる（UI 台帳 決定7）
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-10 text-center",
        className
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="m-0 text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="m-0 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
