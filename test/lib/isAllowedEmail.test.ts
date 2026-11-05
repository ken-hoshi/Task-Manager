import { isAllowedEmail } from "@/app/lib/isAllowedEmail";

describe("isAllowedEmail", () => {
  const original = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN = original;
    }
  });

  it("ドメインが未設定なら、どのメールも通す", () => {
    delete process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;
    expect(isAllowedEmail("someone@example.org")).toBe(true);
  });

  it("ドメインを設定すると、そのドメインのメールだけを通す", () => {
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN = "example.com";
    expect(isAllowedEmail("email@example.com")).toBe(true);
    expect(isAllowedEmail("Email@EXAMPLE.COM")).toBe(true);
    expect(isAllowedEmail("invalid@example.org")).toBe(false);
    expect(isAllowedEmail("example.com@gmail.com")).toBe(false);
    expect(isAllowedEmail("a@notexample.com")).toBe(false);
  });
});
