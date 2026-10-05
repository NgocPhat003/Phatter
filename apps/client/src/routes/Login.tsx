import { useState, useEffect } from "react";
import { LogIn, UserPlus, ShieldAlert, Loader2, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";

import styles from "./Login.module.css";

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check URL parameters for OAuth errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      setError(authError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your username or email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/login", {
        identifier: identifier.trim(),
        password,
      });
      onLoginSuccess(res.data.user.username);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Invalid username/email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerUsername.trim() || !registerEmail.trim()) {
      setError("Please provide both a username and an email.");
      return;
    }

    if (!registerPassword || registerPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/register", {
        username: registerUsername.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
      });
      onLoginSuccess(res.data.user.username);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Registration failed. Username or email may already be in use."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: "github" | "google") => {
    window.location.href = `http://localhost:3000/api/auth/${provider}`;
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
          <h1 className={styles.title}>Phatter</h1>
          <p className={styles.subtitle}>
            {isRegisterMode ? "Create your account" : "Connect with what's happening"}
          </p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Social Access Section (GitHub & Google) */}
        <div className={styles.socialGroup}>
          <button
            type="button"
            className={styles.socialBtn}
            onClick={() => handleSocialLogin("github")}
            disabled={loading}
          >
            {/* GitHub SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>

          <button
            type="button"
            className={styles.socialBtn}
            onClick={() => handleSocialLogin("google")}
            disabled={loading}
          >
            {/* Google SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google / Gmail</span>
          </button>
        </div>

        <div className={styles.divider}>
          <span className={styles.dividerText}>or continue with email</span>
        </div>

        {/* Form: Sign In vs Sign Up */}
        {isRegisterMode ? (
          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Username</label>
              <input
                type="text"
                className={styles.input}
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                disabled={loading}
                placeholder="e.g. alex_phatter"
                autoComplete="username"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className={styles.input}
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                disabled={loading}
                placeholder="alex@example.com"
                autoComplete="email"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${styles.input} ${styles.passwordInput}`}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  disabled={loading}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeToggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.signInBtn} disabled={loading}>
              {loading ? (
                <Loader2 size={18} className={styles.spinIcon} />
              ) : (
                <UserPlus size={18} />
              )}
              <span>{loading ? "Creating Account..." : "Create Account"}</span>
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleSignIn}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Username or Email</label>
              <input
                type="text"
                className={styles.input}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                placeholder="Enter your username or email"
                autoComplete="username"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${styles.input} ${styles.passwordInput}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeToggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.signInBtn} disabled={loading}>
              {loading ? (
                <Loader2 size={18} className={styles.spinIcon} />
              ) : (
                <LogIn size={18} />
              )}
              <span>{loading ? "Signing In..." : "Sign In"}</span>
            </button>
          </form>
        )}

        <div className={styles.divider}>
          <span className={styles.dividerText}>Instant Sandbox</span>
        </div>

        <button
          type="button"
          className={styles.guestBtn}
          onClick={handleGuestBypass}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={18} className={styles.spinIcon} />
          ) : (
            <ShieldAlert size={18} />
          )}
          <span>Guest Sign-In (Instant Sandbox)</span>
        </button>

        <p className={styles.footerText}>
          {isRegisterMode ? "Already have an account?" : "Don't have an account?"}
          <button
            type="button"
            className={styles.registerLink}
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError(null);
              setPassword("");
              setRegisterPassword("");
            }}
          >
            {isRegisterMode ? "Sign In" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
};