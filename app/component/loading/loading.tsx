import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// 画面のデータを読んでいる間の表示。サイドバーの枠の中でも、入口のカードの中でも使う
// （カードの中では className="min-h-0" で高さを詰める）
const Loading: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      role="status"
      className={cn(
        "flex min-h-[50vh] w-full items-center justify-center gap-2 text-sm text-muted-foreground",
        className
      )}
    >
      <Loader2 className="size-5 animate-spin" aria-hidden />
      読み込み中
    </div>
  );
};

export default Loading;
