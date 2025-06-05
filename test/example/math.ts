export const add = (a: number, b: number) => a + b;

export const subtract = (a: number, b: number) => a - b;

export const divide = (a: number, b: number) => {
  if (b === 0) throw new Error('Divide by zero');
  return a / b;
};

export const isPositive = (n: number) => n > 0;

export const waitAndReturn = async (value: string) => {
  return new Promise<string>((resolve) => {
    setTimeout(() => resolve(value), 100);
  });
};
