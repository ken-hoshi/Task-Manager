import styles from "./loading.module.css";

const Loading: React.FC = () => {
  return (
    <div className={styles["spinner-container"]}>
      <div className={styles.spinner}></div>
      <div className={styles.loading}>Loading...</div>
    </div>
  );
};

export default Loading;
