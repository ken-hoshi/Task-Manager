"use client";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";

interface DateRangeFieldProps {
  id: string;
  start: Date | undefined;
  end: Date | undefined;
  onChange: (dates: [Date | null, Date | null]) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

// 期間（開始日と終了日）を選ぶ欄。react-datepicker を入力欄と同じ見た目にした入れ物
export function DateRangeField({
  id,
  start,
  end,
  onChange,
  required,
  placeholder = "開始日 〜 終了日",
  className,
}: DateRangeFieldProps) {
  return (
    <DatePicker
      id={id}
      selected={start}
      onChange={onChange}
      startDate={start}
      endDate={end}
      selectsRange
      dateFormat="yyyy/MM/dd"
      placeholderText={placeholder}
      required={required}
      autoComplete="off"
      wrapperClassName="w-full"
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    />
  );
}
