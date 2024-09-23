import Image from "next/image";
import styles from "./backgroundImage2.module.css";

const BackgroundImage2: React.FC = () => {
  return (
    <Image
      src="/img/background-image2.jpeg"
      alt="background-image2"
      className={styles[`background-image2`]}
      layout="fill"
      priority={true}
    />
  );
};

export default BackgroundImage2;
