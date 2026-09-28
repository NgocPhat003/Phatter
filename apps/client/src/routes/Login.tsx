import { useState } from "react";
import { LogIn, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";
import styles from "./Login.module.css";

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/login", {
        identifier,
        password,
      });
      onLoginSuccess(res.data.user.username);
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestBypass = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/guest");
      onLoginSuccess(res.data.user.username);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to initialize guest session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Odinum</h1>
          <p className={styles.subtitle}>Connect with the Realm</p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form className={styles.form} onSubmit={handleStandardSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Username or Email</label>
            <input
              type="text"
              className={styles.input}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              placeholder=""
              autoComplete="username"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder=""
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={styles.signInBtn}
            disabled={loading}
          >
            <LogIn size={18} />
            <span>{loading ? "Signing In..." : "Sign In"}</span>
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>Social Access</span>
        </div>

        <button
          type="button"
          className={styles.socialBtn}
          onClick={() => alert("GitHub OAuth integration")}
        >
          Continue with GitHub
        </button>

        <div className={styles.divider}>
          <span className={styles.dividerText}>Recruiter Access</span>
        </div>

        <button
          type="button"
          className={styles.guestBtn}
          onClick={handleGuestBypass}
          disabled={loading}
        >
          <ShieldAlert size={18} />
          <span>Guest Sign-In (Instant Bypass)</span>
        </button>

        <p className={styles.footerText}>
          Don't have an account?
          <span className={styles.registerLink}>Register</span>
        </p>
      </div>
    </div>
  );
};