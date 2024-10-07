"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./form.module.css";
import classNames from "classnames";
import { use, useEffect, useState } from "react";
import { login } from "../../hooks/login";

interface FormProps {
  className?: string;
}

const Form: React.FC<FormProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const { useLogin } = login();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    return () => {
      setLoading(true);
    };
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const { email, password } = formData;

    if (!loading) return;
    setLoading(false);

    const loginError = await useLogin(email, password);
    if (loginError) {
      setLoading(true);
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
        <div className={styles.backgroundImage3}>
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
          <form onSubmit={handleLogin}>
            <h4>Welcome!</h4>
            <p className={styles.message}>
              This site is only permitted for use by Lincraft employees.
            </p>

            <input
              className={styles.input}
              type="email"
              placeholder="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={handleFocus}
              autoComplete="current-password"
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
              autoComplete="current-password"
              required
            />
            <p className={styles.instruction}>Enter Password</p>
            <button type="submit" disabled={!loading}>
              {loading ? "Login" : <div className={styles.spinner}></div>}
            </button>
          </form>
          <Link href="/register">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Form;
