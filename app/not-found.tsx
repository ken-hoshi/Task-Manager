import Image from "next/image";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";

// 無いページを開いたときの画面。入口と同じカードに置く
const NotFound = () => {
  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative h-32 w-44">
          <Image src="/img/dog.png" alt="" fill sizes="176px" className="object-contain" priority />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">ページが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          お探しのページは、移動したか削除された可能性があります。
        </p>
      </div>
      <Button asChild className="w-full">
        <Link href="/">
          トップへ戻る
        </Link>
      </Button>
    </AuthCard>
  );
};

export default NotFound;
