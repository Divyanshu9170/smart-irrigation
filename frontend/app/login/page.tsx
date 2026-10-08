"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";

export default function Login() {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot / Reset password state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please fill in both email and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !newPassword || !confirmPassword) {
      setResetError("Please fill in all fields");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      return;
    }
    setResetError("");
    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim(), newPassword);
      setResetSuccess("Password reset successfully! Redirecting...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Password reset failed");
      setResetLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050c1a; font-family: 'DM Sans', sans-serif; }

        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #050c1a;
        }
        @media(max-width: 768px) {
          .login-page { grid-template-columns: 1fr; }
          .login-left { display: none; }
        }

        /* LEFT PANEL */
        .login-left {
          background: radial-gradient(ellipse 80% 80% at 30% 50%, rgba(56,189,248,0.08) 0%, transparent 70%),
                      radial-gradient(ellipse 60% 60% at 80% 20%, rgba(34,197,94,0.05) 0%, transparent 60%);
          border-right: 1px solid rgba(255,255,255,0.04);
          display: flex; flex-direction: column;
          justify-content: center; align-items: flex-start;
          padding: 64px;
          position: relative; overflow: hidden;
        }
        .left-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 64px; }
        .left-logo-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #0ea5e9, #22c55e);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
        }
        .left-logo-text {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 20px; color: #f0f9ff;
        }
        .left-title {
          font-family: 'Syne', sans-serif; font-size: 42px;
          font-weight: 800; line-height: 1.15; letter-spacing: -1px;
          background: linear-gradient(135deg, #f0f9ff 0%, #7dd3fc 50%, #22c55e 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 20px;
        }
        .left-sub {
          font-size: 15px; color: #475569; line-height: 1.8;
          max-width: 380px; margin-bottom: 48px;
        }
        .left-features { display: flex; flex-direction: column; gap: 16px; }
        .left-feature {
          display: flex; align-items: center; gap: 12px;
          font-size: 14px; color: #64748b;
        }
        .feature-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: linear-gradient(135deg, #38bdf8, #22c55e);
          flex-shrink: 0;
        }
        .left-glow {
          position: absolute; bottom: -100px; right: -100px;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%);
          pointer-events: none;
        }

        /* RIGHT PANEL */
        .login-right {
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 48px 32px;
          background: #050c1a;
        }
        @media(max-width: 480px) {
          .login-right { padding: 32px 18px; }
          .login-title { font-size: 25px; }
          .modal-card { padding: 22px 16px; border-radius: 16px; }
        }
        .login-box {
          width: 100%; max-width: 420px;
        }
        .login-header { margin-bottom: 36px; }
        .login-tag {
          font-size: 11px; font-weight: 600; letter-spacing: 2px;
          text-transform: uppercase; color: #38bdf8; margin-bottom: 10px;
        }
        .login-title {
          font-family: 'Syne', sans-serif; font-size: 30px;
          font-weight: 800; color: #f0f9ff; letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .login-sub { font-size: 14px; color: #475569; }

        /* FORM */
        .form-group { margin-bottom: 18px; }
        .form-label {
          display: block; font-size: 12px; font-weight: 600;
          color: #64748b; letter-spacing: 0.5px; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .form-input-wrap { position: relative; }
        .form-input {
          width: 100%; padding: 14px 16px;
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; color: #e2e8f0;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none; transition: all 0.2s;
        }
        .form-input:focus {
          border-color: rgba(56,189,248,0.4);
          background: rgba(15,23,42,1);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.06);
        }
        .form-input::placeholder { color: #334155; }
        .form-input.has-icon { padding-right: 48px; }

        .input-icon {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          color: #475569; cursor: pointer; font-size: 16px;
          background: none; border: none; padding: 0;
          transition: color 0.2s;
        }
        .input-icon:hover { color: #94a3b8; }

        .form-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #fca5a5; font-size: 13px;
          padding: 10px 14px; border-radius: 10px;
          margin-bottom: 18px;
        }
        .form-success {
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.3);
          color: #86efac; font-size: 13px;
          padding: 12px 14px; border-radius: 10px;
          margin-bottom: 18px;
        }

        .forgot-link-btn {
          display: block; margin-left: auto;
          font-size: 12px; color: #38bdf8;
          background: none; border: none; cursor: pointer;
          margin-top: 8px; font-family: 'DM Sans', sans-serif;
          transition: color 0.2s;
        }
        .forgot-link-btn:hover { color: #7dd3fc; text-decoration: underline; }

        .login-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #0ea5e9, #0284c7);
          border: none; border-radius: 12px;
          color: white; font-size: 15px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: all 0.2s;
          margin-top: 8px;
          box-shadow: 0 4px 20px rgba(14,165,233,0.25);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(14,165,233,0.35);
        }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .register-box {
          text-align: center; margin-top: 28px;
          padding: 20px;
          background: rgba(15,23,42,0.5);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
        }
        .register-text { font-size: 14px; color: #475569; margin-bottom: 12px; }
        .register-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 24px; border-radius: 10px;
          border: 1px solid rgba(56,189,248,0.2);
          background: rgba(56,189,248,0.06);
          color: #38bdf8; font-size: 14px; font-weight: 600;
          text-decoration: none; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .register-btn:hover {
          background: rgba(56,189,248,0.12);
          border-color: rgba(56,189,248,0.4);
          transform: translateY(-1px);
        }

        .back-home {
          display: flex; align-items: center; gap: 6px;
          color: #334155; font-size: 13px; text-decoration: none;
          margin-bottom: 32px; transition: color 0.2s;
        }
        .back-home:hover { color: #64748b; }

        /* MODAL STYLES */
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(3, 7, 18, 0.85);
          backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal-card {
          background: #0b1329;
          border: 1px solid rgba(56, 189, 248, 0.25);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.12);
          border-radius: 20px;
          max-width: 440px; width: 100%;
          padding: 32px; position: relative;
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-close-btn {
          position: absolute; top: 20px; right: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8; width: 32px; height: 32px;
          border-radius: 8px; display: flex; align-items: center;
          justify-content: center; font-size: 16px; cursor: pointer;
          transition: all 0.2s;
        }
        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #f8fafc;
        }
      `}</style>

      <div className="login-page">

        {/* LEFT PANEL */}
        <div className="login-left">
          <div className="left-logo">
            <div className="left-logo-icon">🌱</div>
            <span className="left-logo-text">AgroSense</span>
          </div>
          <h1 className="left-title">Smart Farming<br />Starts Here</h1>
          <p className="left-sub">
            Monitor your greenhouse in real-time, detect plant diseases with AI,
            and automate irrigation — all from one dashboard.
          </p>
          <div className="left-features">
            {[
              "Real-time sensor monitoring (Temp, Humidity, NPK)",
              "AI-powered plant disease detection via Gemini",
              "Automated irrigation based on soil moisture",
              "100+ greenhouse crops database",
            ].map((f, i) => (
              <div className="left-feature" key={i}>
                <div className="feature-dot"></div>
                {f}
              </div>
            ))}
          </div>
          <div className="left-glow"></div>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-right">
          <div className="login-box">

            <Link href="/" className="back-home">
              ← Back to Dashboard
            </Link>

            <div className="login-header">
              <div className="login-tag">Welcome back</div>
              <h2 className="login-title">Sign in to AgroSense</h2>
              <p className="login-sub">Enter your credentials to access your farm dashboard</p>
            </div>

            <form onSubmit={handleLogin}>
              {error && <div className="form-error">⚠️ {error}</div>}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="form-input-wrap">
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-input has-icon"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-icon"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <button
                  type="button"
                  className="forgot-link-btn"
                  onClick={() => {
                    setResetEmail(email);
                    setNewPassword("");
                    setConfirmPassword("");
                    setResetError("");
                    setResetSuccess("");
                    setShowResetModal(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? (
                  <><div className="spinner"></div> Signing in...</>
                ) : (
                  "Sign In →"
                )}
              </button>
            </form>

            {/* REGISTER LINK */}
            <div className="register-box">
              <div className="register-text">Do not have an account yet?</div>
              <Link href="/register" className="register-btn">
                Create new account →
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showResetModal && (
        <div className="modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowResetModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div style={{ marginBottom: 24 }}>
              <div className="login-tag">Account Recovery</div>
              <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 700, color: "#f0f9ff", marginBottom: 6 }}>
                Reset Your Password
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                Enter your registered farm account email and choose a new password.
              </p>
            </div>

            {resetError && <div className="form-error">⚠️ {resetError}</div>}
            {resetSuccess && <div className="form-success">✅ {resetSuccess}</div>}

            <form onSubmit={handleReset}>
              <div className="form-group">
                <label className="form-label">Registered Email</label>
                <div className="form-input-wrap">
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Password (min 6 characters)</label>
                <div className="form-input-wrap">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    className="form-input has-icon"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-icon"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                  >
                    {showResetPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="form-input-wrap">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    className="form-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={resetLoading || !!resetSuccess}
              >
                {resetLoading ? (
                  <><div className="spinner"></div> Updating Password...</>
                ) : (
                  "Reset Password & Sign In →"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
