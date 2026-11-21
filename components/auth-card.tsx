import { ListTodo } from "lucide-react";

// 入口の画面（登録・メール確認・ワークスペースの作成と参加など）の共通の枠。背景は無地で、中央にカードを置く
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-base text-foreground">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ListTodo className="size-4" aria-hidden />
          </span>
          Task Manager
        </div>
        {children}
      </div>
    </main>
  );
}
