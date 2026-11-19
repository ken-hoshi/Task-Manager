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

// 選んだ・外したときの読み上げ。既定は英語なので、要るものだけ日本語にする
const ariaLiveMessages: AriaLiveMessages<MultiSelectOption, true, GroupBase<MultiSelectOption>> = {
  guidance: () => "",
  onChange: ({ action, label }) => {
    if (action === "select-option") return `「${label}」を選びました。`;
    if (action === "remove-value" || action === "pop-value") return `「${label}」を外しました。`;
    if (action === "clear") return "すべて外しました。";
    return "";
  },
  onFocus: ({ label }) => label,
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
  );
}
