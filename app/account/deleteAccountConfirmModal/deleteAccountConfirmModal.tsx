import React from "react";
import styles from "./deleteAccountConfirmModal.module.css";

interface DeleteAccountConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  closeModal: () => void;
}

const DeleteAccountConfirmModal: React.FC<DeleteAccountConfirmModalProps> = ({
  isOpen,
  onConfirm,
  closeModal,
}) => {
  return (
    <div className={styles[`modal-back-drop`]}>
      <div className={styles[`modal-content`]}>
        <p>Do you really want to delete your account?</p>
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

export default DeleteAccountConfirmModal;
