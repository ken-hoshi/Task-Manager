import { fireEvent, render, screen } from "@testing-library/react";
import { DateRangeField } from "@/components/date-range-field";

describe("DateRangeField", () => {
  it("カレンダーを日本語で出し、開始日と終了日を選べる", () => {
    const onChange = jest.fn();
    render(
      <DateRangeField id="period" start={new Date(2026, 10, 20)} end={undefined} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole("textbox"));

    expect(screen.getByRole("dialog", { name: "日付を選ぶ" })).toHaveTextContent("2026年11月");
    fireEvent.click(screen.getByRole("option", { name: /2026年11月21日/ }));
    expect(onChange).toHaveBeenCalledWith([new Date(2026, 10, 20), new Date(2026, 10, 21)], expect.anything());
  });
});
