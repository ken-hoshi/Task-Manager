import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  // ラベルを付ける欄の id
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

// 欄のラベルと中身。必須なら、見た目は「*」、読み上げでは「（必須）」と伝える
export function FormField({ label, htmlFor, required, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only">（必須）</span>}
      </Label>
      {children}
    </div>
  );
}

// ポップアップの見出しの下に置く、必須の印の説明
export function RequiredNote() {
  return (
    <>
      <span aria-hidden>
        <span className="text-destructive">*</span> の付いた欄は必須です。
      </span>
      <span className="sr-only">（必須）の欄は入力が必要です。</span>
    </>
  );
}
