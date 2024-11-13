import React from "react";
import styles from "./deleteConfirmModal.module.css";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  closeModal: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onConfirm,
  closeModal,
}) => {
  return (
    <div className={styles[`modal-backdrop`]}>
      <div className={styles[`modal-content`]}>
        <p>delete it OK?</p>
        <button className={styles.cancel} onClick={closeModal}>
          No
        </button>
        <button className={styles.yes} onClick={onConfirm}>
          Yes
        </button>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
