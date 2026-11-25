"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  title: string;
  // 何が起きるかの説明（例：元に戻せません。）。ダイアログの説明として読み上げる
  description: string;
  // 実行のボタンの文言（例：削除する）
  confirmLabel: string;
  // 実行中のボタンの文言（例：削除中）
  pendingLabel?: string;
  // 削除のような取り返しのつかない操作なら true。実行のボタンを赤にする
  destructive?: boolean;
  // 失敗したときの通知は呼び出す側で行う（ここでは失敗を受け止めない）
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

// 「本当に〜しますか」と確かめるダイアログ。出している間だけ描く（呼び出す側が条件付きで描く）。
// 実行中はボタンを押せなくし、二重に実行しないようにする
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  // 開く前にフォーカスがあった要素。呼び出す側が DialogTrigger を使わないので、Radix は閉じたあとここへ戻せない
  const [returnFocusTo] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)
  );

  const handleConfirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-sm"
        // 以前の確認と同じく、外を押しても閉じない
        onInteractOutside={(e) => e.preventDefault()}
        // 閉じたら、開く前の要素へフォーカスを戻す。消えていたら（削除できた行のボタンなど）呼び出す側に任せる
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (returnFocusTo?.isConnected) returnFocusTo.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            キャンセル
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {pending ? pendingLabel ?? confirmLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
