import { add, subtract, divide, isPositive, waitAndReturn } from './math';

// よくJestで使われる関数

describe('math関数のテスト', () => {
  beforeEach(() => {
    // 各テストの前に実行（必要に応じて）
  });

  test('加算（toBe）', () => {
    expect(add(1, 2)).toBe(3); // ===
  });

  test('減算（toEqual）', () => {
    expect(subtract(5, 2)).toEqual(3); // オブジェクトや配列にはこれを使う
  });

  test('0割で例外が投げられる（toThrow）', () => {
    expect(() => divide(5, 0)).toThrow('Divide by zero');
  });

  test('正の数かどうか（toBeTruthy / toBeFalsy）', () => {
    expect(isPositive(10)).toBeTruthy();
    expect(isPositive(-3)).toBeFalsy();
  });

  test('非同期関数（resolves / async-await）', async () => {
    await expect(waitAndReturn('OK')).resolves.toBe('OK');

    // または
    const result = await waitAndReturn('OK');
    expect(result).toBe('OK');
  });

  test('数値が特定範囲にある（toBeGreaterThan / LessThan）', () => {
    expect(add(2, 2)).toBeGreaterThan(3);
    expect(subtract(5, 3)).toBeLessThan(5);
  });

  test('配列やオブジェクトの比較（toEqual）', () => {
    const obj = { a: 1, b: 2 };
    expect(obj).toEqual({ a: 1, b: 2 });
  });

  test('null / undefined チェック（toBeNull / toBeDefined / toBeUndefined）', () => {
    const val = null;
    expect(val).toBeNull();

    const defined = 10;
    expect(defined).toBeDefined();

    let undef;
    expect(undef).toBeUndefined();
  });
});
