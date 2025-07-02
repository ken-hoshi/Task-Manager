"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./form.module.css";
import classNames from "classnames";
import { useState } from "react";
import { login } from "../../hooks/login";
import { useNotificationContext } from "@/app/provider/notificationProvider";

interface FormProps {
  className?: string;
}

const Form: React.FC<FormProps> = ({ className }) => {
  const [loading, setLoading] = useState(false);
  const { useLogin } = login();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { setNotificationValue } = useNotificationContext();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const { email, password } = formData;

    if (loading) return;
    setLoading(true);

    const loginError = await useLogin(email, password);
    if (loginError) {
      setNotificationValue({
        message: "Password or Email address is wrong.",
        color: 1,
      });
      setLoading(false);
    }
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  return (
    <div className={classNames(styles[`form-area`], className)}>
      <div className={styles[`form-board`]}>
        <div className={styles[`background-image-container`]}>
          <Image
            className={styles[`background-image3`]}
            src="/img/background-image3.jpeg"
            alt="background-image3"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={true}
          />
        </div>
        <div className={styles[`login-area`]}>
          <form role="form" onSubmit={handleLogin}>
            <h4>Welcome!</h4>
            <p className={styles.message}>
              This site may only be used by employees of the designated company.
            </p>

            <input
              className={styles.input}
              type="email"
              placeholder="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={handleFocus}
              autoComplete="on"
              required
            />
            <p className={styles.instruction}>Enter your Email Address</p>
            <input
              className={styles.input}
              type="password"
              placeholder="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onFocus={handleFocus}
              autoComplete="off"
              required
            />
            <p className={styles.instruction}>Enter Password</p>
            <button role="button" type="submit" disabled={loading}>
              {loading ? <div className={styles.spinner}></div> : "Login"}
            </button>
          </form>
          <Link href="/register">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Form;
