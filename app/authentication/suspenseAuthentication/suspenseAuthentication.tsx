"use client";

import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { SignupSteps } from "@/components/signup-steps";
import { Button } from "@/components/ui/button";

const SuspenseAuthentication: React.FC = () => {
  const router = useRouter();

  return (
    <AuthCard>
      <SignupSteps current={1} />

      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Mail className="size-6" aria-hidden />
        </span>
        <h1 className="m-0 text-2xl font-semibold tracking-tight">
          確認メールを送りました
        </h1>
        <p className="m-0 text-sm text-muted-foreground">
          登録したメールアドレス宛に認証メールを送信しました。
          <br />
          メール内の認証が完了したらワークスペース登録に進んでください。
        </p>
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={() => router.push("/createWorkspace?atSignUp=true")}
      >
        ワークスペース登録へ
      </Button>
    </AuthCard>
  );
};

export default SuspenseAuthentication;
