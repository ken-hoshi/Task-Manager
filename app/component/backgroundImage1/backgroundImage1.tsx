import Image from "next/image";
import styles from "./backgroundImage1.module.css";

const BackgroundImage1: React.FC = () => {
  return (
    <div className={styles[`background-container`]}>
      <Image
        src="/img/background-image1.jpeg"
        alt="background-image1"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        style={{ objectFit: "cover", objectPosition: "top" }}
        priority={true}
      />
    </div>
  );
};

export default BackgroundImage1;
