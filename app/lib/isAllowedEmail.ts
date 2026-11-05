// 登録できるメールを NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN（例: example.com）で絞る。未設定なら絞らない
// shortcut: 画面側の判定だけ。本当に絞るなら Supabase 側でも判定する
export const isAllowedEmail = (email: string) => {
  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;
  return !domain || email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
};
