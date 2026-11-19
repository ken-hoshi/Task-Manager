"use client";

import { useId, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  label?: string;
  // 欄の下に出す注記（例：1ファイル 3MB まで）
  note?: string;
}

// 添付ファイルの欄。ドラッグ＆ドロップか「ファイルを選ぶ」で足し、一覧から取り消せる
export function FileDropzone({
  files,
  onAdd,
  onRemove,
  label = "添付ファイル",
  note,
}: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) onAdd(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground transition-colors",
          dragging && "border-primary bg-primary/5"
        )}
      >
        <Upload className="size-5" aria-hidden />
        <p className="m-0">ここにファイルをドロップするか</p>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          ファイルを選ぶ
        </Button>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-label={`${label}を選ぶ`}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) onAdd(Array.from(e.target.files));
            // 同じファイルをもう一度選べるようにする
            e.target.value = "";
          }}
        />
        {note && <p className="m-0 text-xs">{note}</p>}
      </div>
      {files.length > 0 && (
        <ul className="m-0 list-none space-y-1 p-0">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`「${file.name}」を外す`}
                onClick={() => onRemove(index)}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
