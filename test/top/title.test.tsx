import { render, screen, fireEvent } from "@testing-library/react";
import Title from "@/app/top/title/title";

describe("Title コンポーネント", () => {
  it("① Title コンポーネントがデフォルトの内容で正しくレンダリングされる", () => {
    render(<Title onClick={jest.fn()} />);

    expect(screen.getByText("Task Manager")).toBeInTheDocument();
    expect(screen.getByText("Click me")).toBeInTheDocument();

    const image = screen.getByAltText("background-image1");
    expect(image).toBeInTheDocument();

    // src属性に期待するパスの一部が含まれていることを確認
    expect(image).toHaveAttribute(
      "src",
      expect.stringContaining("background-image1.jpeg")
    );
  });

  it("② 背景画像コンテナがクリックされたときに onClick が呼び出される", () => {
    const handleClick = jest.fn();
    render(<Title onClick={handleClick} />);

    // 背景画像コンテナをクリック
    const container = screen.getByText("Click me").parentElement;
    fireEvent.click(container!);

    // onClick が呼び出されたことを確認
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("③ 渡された className が正しく適用される", () => {
    const customClass = "custom-class";
    render(<Title onClick={jest.fn()} className={customClass} />);

    // className が正しく適用されていることを確認
    const container =
      screen.getByText("Task Manager").parentElement?.parentElement;
    expect(container).toHaveClass(customClass);
  });
});
