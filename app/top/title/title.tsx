"use client";

import Image from "next/image";
import styles from "./title.module.css";
import classNames from "classnames";

interface TitleProps {
  onClick: () => void;
  className?: string;
}

const Title: React.FC<TitleProps> = ({ onClick, className }) => {
  return (
    <div className={classNames(styles[`title-area`], className)}>
      <div className={styles.backgroundImage1} onClick={onClick}>
        <Image
          src="/img/background-image1.jpeg"
          alt="background-image1"
          layout="fill"
          className={styles[`background-image1`]}
          priority={true}
        />
        <h1>Task Manager</h1>
        <h2>Click me</h2>
      </div>
    </div>
  );
};

export default Title;
