"use client";

import DatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale/ja";
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
  // カレンダーを body の下の、この id の入れ物に出す。
  // 横スクロールや overflow-hidden の箱の中に置くと、カレンダーが切れたり、sticky のマスに隠れたりするため
  portalId?: string;
}

// カレンダーの月・曜日を日本語で出す
registerLocale("ja", ja);

// カレンダーの入れ物。既定の入れ物は読み上げの名前が英語（Choose Date）で固定なので差し替える
function CalendarContainer({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={className} role="dialog" aria-label="日付を選ぶ" aria-modal="true">
      {children}
    </div>
  );
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
  portalId,
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
      locale="ja"
      dateFormatCalendar="yyyy'年'M'月'"
      calendarContainer={CalendarContainer}
      chooseDayAriaLabelPrefix="選ぶ:"
      previousMonthAriaLabel="前の月"
      nextMonthAriaLabel="次の月"
      placeholderText={placeholder}
      required={required}
      autoComplete="off"
      portalId={portalId}
      // body の下に出すときは、画面の sticky のマス（z-10・z-20）より上、Sheet・Dialog（z-50）より下に置く。
      // react-datepicker の CSS は layer の外で z-index: 1 を決めているので、! で上書きする
      popperClassName={portalId ? "!z-30" : undefined}
      wrapperClassName="w-full"
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    />
  );
}
