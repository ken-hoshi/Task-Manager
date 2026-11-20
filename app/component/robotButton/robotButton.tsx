import Image from "next/image";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AiChatArea from "../aiChatArea/aiChatArea";

// AI チャットを開くボタン。チャットは画面の右から出す
const RobotButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="AI に質問する"
          className="relative size-10 rounded-full outline-none transition-transform hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Image src="/img/robot.png" alt="" fill sizes="40px" className="object-contain" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        {/* Sheet は閉じると中身を描かないので、閉じるとやり取りは消える（以前と同じ） */}
        <AiChatArea />
      </SheetContent>
    </Sheet>
  );
};

export default RobotButton;
