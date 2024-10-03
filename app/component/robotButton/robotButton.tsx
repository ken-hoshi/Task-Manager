import Image from "next/image";
import styles from "./robotButton.module.css";
import { useState } from "react";
import AiChatArea from "../aiChatArea/aiChatArea";

const RobotButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div className={styles[`robot-img-container`]}>
        <Image
          src="/img/robot.png"
          alt="robot"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
          className={styles[`robot-img`]}
          onClick={() => setIsOpen(true)}
        />
      </div>
      {isOpen && <AiChatArea setIsOpen={setIsOpen} />}
    </>
  );
};

export default RobotButton;
