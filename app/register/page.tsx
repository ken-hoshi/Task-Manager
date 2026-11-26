"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { FormField } from "@/components/form-field";
import { SignupSteps } from "@/components/signup-steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormContext } from "../provider/formProvider";
import { signUp } from "../hooks/signUp";
import { useNotificationContext } from "../provider/notificationProvider";
import NotificationBanner from "../component/notificationBanner/notificationBanner";
import { EMAIL_NOT_ALLOWED, isAllowedEmail } from "../lib/isAllowedEmail";
import { isValidPassword, PASSWORD_ERROR, PASSWORD_HINT } from "../lib/passwordRule";

const Register: React.FC = () => {
  const { setBackForm } = useFormContext();
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
  const router = useRouter();
  const { useSignUp } = signUp();

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const validate = (email: string, password: string) => {
    const emailInvalid = !isAllowedEmail(email);
    const passwordInvalid = !isValidPassword(password);

    if (emailInvalid) {
      setEmailError(EMAIL_NOT_ALLOWED);
    }
    if (passwordInvalid) {
      setPasswordError(PASSWORD_ERROR);
    }
    // 同じ文言のエラーが出たままだと読み上げが起きないので、直す欄へフォーカスを移して伝える
    if (emailInvalid) {
      document.getElementById("register-email")?.focus();
    } else if (passwordInvalid) {
      document.getElementById("register-password")?.focus();
    }
    return emailInvalid || passwordInvalid;
  };

  const handleBackTop = () => {
    setBackForm(true);
    router.push("/");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, password } = formData;

    if (loading) return;
    setLoading(true);

    setEmailError("");
    setPasswordError("");
    if (validate(email, password)) {
      setLoading(false);
      return;
    }

    const signUpError = await useSignUp(name, email, password);
    if (signUpError) {
      console.error("Sign up ", signUpError);
      // 登録前フックがドメインで断ったときは、メールの欄に出して直してもらう
      if (signUpError instanceof Error && signUpError.message === EMAIL_NOT_ALLOWED) {
        setEmailError(EMAIL_NOT_ALLOWED);
        document.getElementById("register-email")?.focus();
        setLoading(false);
        return;
      }
      setNotificationValue({
        message: "登録できませんでした。",
        color: 1,
      });
      setLoading(false);
    }
  };

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}

      <AuthCard>
        <SignupSteps current={0} />

        <h1 className="m-0 text-2xl font-semibold tracking-tight">新規登録</h1>

        <form aria-label="新規登録" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="名前" htmlFor="register-name" required>
            <Input
              id="register-name"
              type="text"
              name="name"
              autoComplete="name"
              required
              value={formData.name}
              onChange={handleChange}
              onFocus={handleFocus}
            />
          </FormField>

          <FormField label="メールアドレス" htmlFor="register-email" required>
            <Input
              id="register-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "register-email-error" : undefined}
              value={formData.email}
              onChange={handleChange}
              onFocus={handleFocus}
            />
            {emailError && (
              <p id="register-email-error" role="alert" className="m-0 text-sm text-destructive">
                {emailError}
              </p>
            )}
          </FormField>

          <FormField label="パスワード" htmlFor="register-password" required>
            <Input
              id="register-password"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              aria-invalid={passwordError ? true : undefined}
              aria-describedby="register-password-note"
              value={formData.password}
              onChange={handleChange}
              onFocus={handleFocus}
            />
            {/* key を分けて要素ごと入れ替える（既存の要素に role="alert" を足すだけだと読み上げられない環境がある） */}
            {passwordError ? (
              <p key="error" id="register-password-note" role="alert" className="m-0 text-sm text-destructive">
                {passwordError}
              </p>
            ) : (
              <p key="hint" id="register-password-note" className="m-0 text-sm text-muted-foreground">
                {PASSWORD_HINT}
              </p>
            )}
          </FormField>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            登録する
          </Button>
        </form>

        <Button type="button" variant="ghost" className="self-center" onClick={handleBackTop}>
          <ArrowLeft className="size-4" aria-hidden />
          ログインへ戻る
        </Button>
      </AuthCard>
    </>
  );
};

export default Register;
