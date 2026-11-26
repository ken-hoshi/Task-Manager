import { readFileSync } from "fs";
import { join } from "path";
import { EMAIL_NOT_ALLOWED, isAllowedEmail } from "@/app/lib/isAllowedEmail";

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

  // 登録の画面は、登録前フックが返す文と比べてメールの欄に出す。片方だけ直すと、断られても一般のエラーに戻る
  it("登録前フック（supabase/schema.sql）が、画面と同じ文で断る", () => {
    const schema = readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8");
    const hook = schema.slice(schema.indexOf("create function public.hook_restrict_signup_by_email_domain"));
    expect(hook).toContain(`'message', '${EMAIL_NOT_ALLOWED}'`);
  });
});
