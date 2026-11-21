import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["登録", "メール確認", "ワークスペース"];

// 登録の3段階のうち、今どこにいるか。current は 0 から数える
export function SignupSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    // Safari は list-none の ol をリストとして伝えないことがあるので、role を明示する
    <ol role="list" aria-label="登録の進み具合" className="m-0 flex list-none items-start p-0">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center gap-1.5 text-center"
          >
            {index > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-3 right-1/2 h-px w-full -translate-y-1/2",
                  index <= current ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                // 次の段階の線が後ろから重ならないよう、丸を手前に出す
                "relative z-10 flex size-6 items-center justify-center rounded-full border text-xs font-medium",
                done || active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className={cn("text-xs", active ? "font-medium text-foreground" : "text-muted-foreground")}>
              {label}
              {done && <span className="sr-only">（完了）</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
