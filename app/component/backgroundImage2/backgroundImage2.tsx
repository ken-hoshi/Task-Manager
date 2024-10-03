import Image from "next/image";
import styles from "./backgroundImage2.module.css";

const BackgroundImage2: React.FC = () => {
  return (
    <div className={styles[`img-container`]}>
      <Image
        src="/img/background-image2.jpeg"
        alt="background-image2"
        className={styles[`background-image2`]}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={true}
      />
    </div>
  );
};

export default BackgroundImage2;
