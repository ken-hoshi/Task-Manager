import { act, fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "@/components/confirm-dialog";

describe("ConfirmDialog", () => {
  it("題名と説明を出し、「キャンセル」で onCancel を呼ぶ", () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        title="「画面」を削除しますか？"
        description="元に戻せません。"
        confirmLabel="削除する"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole("dialog", { name: "「画面」を削除しますか？" })).toHaveAccessibleDescription(
      "元に戻せません。"
    );
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("実行している間はボタンを押せなくし、二重に実行しない", async () => {
    let finish: () => void = () => {};
    const onConfirm = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(
      <ConfirmDialog
        title="削除しますか？"
        confirmLabel="削除する"
        pendingLabel="削除中"
        destructive
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    });
    const pending = screen.getByRole("button", { name: "削除中" });
    expect(pending).toBeDisabled();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();
    fireEvent.click(pending);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
    });
    expect(screen.getByRole("button", { name: "削除する" })).not.toBeDisabled();
  });

  it("Escape で閉じると onCancel を呼ぶ", () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog title="削除しますか？" confirmLabel="削除する" onConfirm={jest.fn()} onCancel={onCancel} />
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onCancel).toHaveBeenCalled();
  });
});
