import Image from "next/image";
import styles from "./backgroundImage1.module.css";

const BackgroundImage1: React.FC = () => {
  return (
    <div className={styles.backgroundContainer}>
      <Image
        src="/img/background-image1.jpeg"
        alt="background-image1"
        layout="fill"
        objectFit="cover"
        objectPosition="top"
        priority={true}
      />
    </div>
  );
};

export default BackgroundImage1;
