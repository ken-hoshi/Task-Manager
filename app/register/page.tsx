"use client";

import styles from "./register.module.css";
import classNames from "classnames";
import { useRouter } from "next/navigation";
import { useFormContext } from "../provider/formProvider";
import { useState } from "react";
import { signUp } from "../hooks/signUp";
import BackgroundImage2 from "../component/backgroundImage2/backgroundImage2";
import { useNotificationContext } from "../provider/notificationProvider";
import NotificationBanner from "../component/notificationBanner/notificationBanner";

const WORD_LINCRAFT = "lincraft";

const Register: React.FC = () => {
  const { setBackForm } = useFormContext();
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
  const router = useRouter();
  const { useSignUp } = signUp();

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const validate = (email: string, password: string) => {
    let judge = false;
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if (!email.includes(WORD_LINCRAFT)) {
      setEmailError("このメールアドレスは使用できません。");
      judge = true;
    }
    if (!regex.test(password)) {
      setPasswordError(
        "パスワードは英字と数字を含む8文字以上でなければなりません。"
      );
      judge = true;
    }
    return judge;
  };

  const handleBackTop = () => {
    setBackForm(true);
    router.push("/");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, password } = formData;

    if (loading) return;
    setLoading(true);

    setEmailError("");
    setPasswordError("");
    if (validate(email, password)) {
      setLoading(false);
      return;
    }

    const signUpError = await useSignUp(name, email, password);
    if (signUpError) {
      console.error("Sign up ", signUpError);
      setNotificationValue({
        message: "Couldn't sign up.",
        color: 1,
      });
      setLoading(false);
    }
  };

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}

      <div>
        <BackgroundImage2 />

        <div className={styles[`inner-area`]}>
          <span
            className={classNames("material-symbols-outlined", styles.back)}
            onClick={handleBackTop}
          >
            arrow_back
          </span>

          <div className={styles[`progress-bar-container`]}>
            <div className={styles[`progress-bar`]}>
              <div className={`${styles.step} ${styles.active}`}>
                <div className={styles.circle}></div>
                <span className={styles.active}>Sign Up</span>
              </div>
              <div className={styles.line}></div>
              <div className={styles.step}>
                <div className={styles.circle}></div>
                <span>Email Verification</span>
              </div>
              <div className={styles.line}></div>
              <div className={styles.step}>
                <div className={styles.circle}></div>
                <span>Workspace Setup</span>
              </div>
            </div>
          </div>

          <div className={styles[`form-area`]}>
            <h1>Sign up</h1>

            <form role="form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Name"
                name="name"
                autoComplete="off"
                required
                value={formData.name}
                onChange={handleChange}
                onFocus={handleFocus}
                className={styles.input}
              />
              <p className={styles.instruction}>Enter your Name</p>

              <input
                type="email"
                placeholder="Email"
                name="email"
                autoComplete="off"
                required
                value={formData.email}
                onChange={handleChange}
                onFocus={handleFocus}
                className={styles.input}
              />
              {emailError ? (
                <p className={styles.error}>{emailError}</p>
              ) : (
                <p className={styles.instruction}>Enter your Email Address</p>
              )}

              <input
                type="password"
                placeholder="Password"
                autoComplete="off"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                onFocus={handleFocus}
                className={styles.input}
              />
              {passwordError ? (
                <p className={styles.error}>{passwordError}</p>
              ) : (
                <p className={styles.instruction}>Enter Password</p>
              )}

              <button type="submit" disabled={loading}>
                {loading ? <div className={styles.spinner}></div> : "Sign Up"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
