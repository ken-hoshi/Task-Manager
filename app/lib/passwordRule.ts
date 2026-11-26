// パスワードの規則。登録とパスワードの変更で同じものを使う。
// 英字と数字を両方含む8文字以上。記号も使える（空白と全角は使えない。半角の印字できる文字 ! 〜 ~ だけ）
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[!-~]{8,}$/;

export const PASSWORD_HINT = "英字と数字を両方含む8文字以上（記号も使えます）";
export const PASSWORD_ERROR = "パスワードは、英字と数字を両方含む8文字以上にしてください。空白と全角の文字は使えません。";

export const isValidPassword = (password: string) => PASSWORD_PATTERN.test(password);
