import React from "react";
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
        description="元に戻せません。"
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

  it("閉じたら、開く前にフォーカスがあったボタンへ戻す", async () => {
    const Harness = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            開く
          </button>
          {open && (
            <ConfirmDialog
              title="削除しますか？"
              description="元に戻せません。"
              confirmLabel="削除する"
              onConfirm={jest.fn()}
              onCancel={() => setOpen(false)}
            />
          )}
        </>
      );
    };
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "開く" });
    opener.focus();
    fireEvent.click(opener);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    });
    // Radix は閉じたあとのフォーカスの処理を次の拍で行う
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(opener).toHaveFocus();
  });

  it("Escape で閉じると onCancel を呼ぶ", () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        title="削除しますか？"
        description="元に戻せません。"
        confirmLabel="削除する"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onCancel).toHaveBeenCalled();
  });

  it("外を押しても閉じない", async () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        title="削除しますか？"
        description="元に戻せません。"
        confirmLabel="削除する"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    // Radix は外を押したことを document の pointerdown で知る。監視は描いた次の拍から始まるので、1拍待つ
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    fireEvent.pointerDown(document.body);

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("実行している間は、Escape でも閉じない", async () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        title="削除しますか？"
        description="元に戻せません。"
        confirmLabel="削除する"
        onConfirm={() => new Promise<void>(() => {})}
        onCancel={onCancel}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onCancel).not.toHaveBeenCalled();
  });
});
