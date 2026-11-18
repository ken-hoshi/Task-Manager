"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ListTodo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "../../hooks/login";
import { useNotificationContext } from "@/app/provider/notificationProvider";

const Form: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { useLogin } = login();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { setNotificationValue } = useNotificationContext();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const { email, password } = formData;

    if (loading) return;
    setLoading(true);

    const loginError = await useLogin(email, password);
    if (loginError) {
      setNotificationValue({
        message: "メールアドレスかパスワードが違います。",
        color: 1,
      });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // 左にイラスト、右にログインの欄。イラストは入口だけに使う（台帳 決定12。本人が2通りを見比べて選んだ）
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-base text-foreground">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-xl border bg-card shadow-sm md:grid-cols-2">
        <div className="relative hidden md:block">
          <Image
            src="/img/background-image3.jpeg"
            alt=""
            fill
            sizes="(max-width: 768px) 0px, 448px"
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-col gap-6 p-8 sm:p-10">
          <div className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ListTodo className="size-4" />
            </span>
            Task Manager
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">ログイン</h1>
            <p className="text-sm text-muted-foreground">
              指定された会社の社員だけが利用できます。
            </p>
          </div>

          <form aria-label="ログイン" onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">メールアドレス</Label>
              <Input
                id="login-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">パスワード</Label>
              <Input
                id="login-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              ログイン
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            アカウントをお持ちでない方は{" "}
            <Link
              href="/register"
              className="font-medium text-primary no-underline underline-offset-4 hover:underline"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Form;
