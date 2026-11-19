"use client";

import Select, {
  AriaLiveMessages,
  components,
  GroupBase,
  MultiValue,
  MultiValueRemoveProps,
} from "react-select";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: number;
  label: string;
}

interface MultiSelectProps {
  // ラベルの htmlFor と合わせる。react-select の入力欄の id になる
  id: string;
  options: MultiSelectOption[];
  value: MultiSelectOption[];
  onChange: (options: MultiSelectOption[]) => void;
  placeholder?: string;
  noOptionsMessage?: string;
  required?: boolean;
}

// 選んだものを外すボタン。読み上げの名前を日本語にする（既定は「Remove 〜」）
function MultiValueRemove(props: MultiValueRemoveProps<MultiSelectOption, true>) {
  return (
    <components.MultiValueRemove
      {...props}
      innerProps={{ ...props.innerProps, "aria-label": `「${props.data.label}」を外す` }}
    />
  );
}

// 読み上げの文言。既定は英語なので、既定と同じ場面で日本語を返す
const ariaLiveMessages: AriaLiveMessages<MultiSelectOption, true, GroupBase<MultiSelectOption>> = {
  guidance: ({ context, isInitialFocus }) => {
    if (context === "menu") return "上下の矢印で候補を移り、Enter で選びます。Escape で一覧を閉じます。";
    if (context === "input" && isInitialFocus)
      return "文字を打つと候補を絞り込み、下の矢印で一覧を開きます。左の矢印で、選んだものに移れます。";
    if (context === "value") return "左右の矢印で選んだものを移り、Backspace で外します。";
    return "";
  },
  onChange: ({ action, label, labels }) => {
    if (action === "select-option") return `「${label}」を選びました。`;
    if (action === "remove-value" || action === "pop-value" || action === "deselect-option")
      return `「${label}」を外しました。`;
    if (action === "clear") return "すべて外しました。";
    if (action === "initial-input-focus" && labels.length > 0) return `${labels.join("、")}を選んでいます。`;
    return "";
  },
  onFocus: ({ context, focused, options, label = "", selectValue, isDisabled, isSelected, isAppleDevice }) => {
    if (context === "value" && selectValue) {
      return `「${label}」を選んでいます。${selectValue.indexOf(focused) + 1}件目（全${selectValue.length}件）`;
    }
    // Apple 以外の端末は aria-activedescendant で候補を読むので、二重にならないよう Apple の端末だけ返す
    if (context === "menu" && isAppleDevice) {
      const state = isDisabled ? "（選べません）" : isSelected ? "（選んでいます）" : "";
      return `「${label}」${state}。${options.indexOf(focused) + 1}件目（全${options.length}件）`;
    }
    return "";
  },
  onFilter: ({ resultsMessage }) => resultsMessage,
};

// 複数を選ぶ欄。react-select を、入力欄（components/ui/input.tsx）と同じ見た目にした入れ物
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "選ぶ",
  noOptionsMessage = "選べるものはありません",
  required,
}: MultiSelectProps) {
  return (
    // 候補を開いていないときや、選べる候補が無いときの Enter は、react-select が何もしないのでフォームが送信されてしまう。
    // react-select が選ぶのに使わなかった Enter だけ、ここで止める（react-select の処理のあとに動く）
    <div
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.isDefaultPrevented()) e.preventDefault();
      }}
    >
      <Select<MultiSelectOption, true>
        isMulti
        unstyled
        inputId={id}
        instanceId={id}
        options={options}
        value={value}
        onChange={(next: MultiValue<MultiSelectOption>) => onChange([...next])}
        placeholder={placeholder}
        noOptionsMessage={() => noOptionsMessage}
        required={required}
        components={{ MultiValueRemove }}
        ariaLiveMessages={ariaLiveMessages}
        screenReaderStatus={({ count }) => `候補は ${count} 件です。`}
        classNames={{
          control: ({ isFocused }) =>
            cn(
              "min-h-8 w-full rounded-lg border border-input bg-transparent px-1.5 py-0.5 text-sm transition-colors dark:bg-input/30",
              isFocused && "border-ring ring-3 ring-ring/50"
            ),
          valueContainer: () => "gap-1 px-1",
          placeholder: () => "text-muted-foreground",
          input: () => "text-sm",
          multiValue: () => "items-center gap-1 rounded-md bg-muted py-0.5 pl-2 pr-0.5",
          multiValueLabel: () => "text-xs",
          multiValueRemove: () =>
            "rounded-sm px-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          indicatorsContainer: () => "gap-0.5 text-muted-foreground",
          clearIndicator: () => "rounded-sm p-1 hover:bg-muted hover:text-foreground",
          dropdownIndicator: () => "rounded-sm p-1 hover:text-foreground",
          indicatorSeparator: () => "my-1.5 w-px bg-border",
          menu: () => "mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md",
          menuList: () => "p-1",
          option: ({ isFocused }) =>
            cn("cursor-default rounded-md px-2 py-1.5 text-sm", isFocused && "bg-accent text-accent-foreground"),
          noOptionsMessage: () => "px-2 py-1.5 text-sm text-muted-foreground",
        }}
      />
    </div>
  );
}
