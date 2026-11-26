// 登録できるメールを NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN（例: example.com）で絞る。未設定なら絞らない。
// 画面の判定は、送る前に早めに知らせるためのもの。本当に絞るのは Supabase の登録前フック
// （supabase/schema.sql の hook_restrict_signup_by_email_domain。許すドメインは private.signup_allowed_domains）
// フックが断るときも同じ文を返す
export const EMAIL_NOT_ALLOWED = "このメールアドレスは使用できません。";

export const isAllowedEmail = (email: string) => {
  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;
  return !domain || email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
};
