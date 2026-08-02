"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields"); return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match"); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      // ✅ register() already returns a token, so the farmer is signed
      // in immediately — no need to make them log in again.
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050c1a; font-family: 'DM Sans', sans-serif; }

        .reg-page {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          background: #050c1a;
          background-image: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 70%);
          padding: 40px 20px;
        }

        .reg-box { width: 100%; max-width: 460px; }

        .reg-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; margin-bottom: 36px;
          justify-content: center;
        }
        .reg-logo-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #0ea5e9, #22c55e);
          display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .reg-logo-text {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 18px; color: #f0f9ff;
        }

        .reg-header { text-align: center; margin-bottom: 32px; }
        .reg-tag {
          font-size: 11px; font-weight: 600; letter-spacing: 2px;
          text-transform: uppercase; color: #22c55e; margin-bottom: 10px;
        }
        .reg-title {
          font-family: 'Syne', sans-serif; font-size: 28px;
          font-weight: 800; color: #f0f9ff; letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .reg-sub { font-size: 14px; color: #475569; }

        .reg-card {
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 32px;
        }

        .form-group { margin-bottom: 16px; }
        .form-label {
          display: block; font-size: 12px; font-weight: 600;
          color: #64748b; letter-spacing: 0.5px; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .form-input-wrap { position: relative; }
        .form-input {
          width: 100%; padding: 13px 16px;
          background: rgba(5,12,26,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; color: #e2e8f0;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none; transition: all 0.2s;
        }
        .form-input:focus {
          border-color: rgba(34,197,94,0.4);
          box-shadow: 0 0 0 3px rgba(34,197,94,0.06);
        }
        .form-input::placeholder { color: #334155; }
        .form-input.has-icon { padding-right: 48px; }
        .input-icon {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          color: #475569; cursor: pointer; font-size: 16px;
          background: none; border: none; padding: 0; transition: color 0.2s;
        }
        .input-icon:hover { color: #94a3b8; }

        .form-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #fca5a5; font-size: 13px;
          padding: 10px 14px; border-radius: 10px;
          margin-bottom: 16px;
        }

        .reg-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          border: none; border-radius: 12px;
          color: white; font-size: 15px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: all 0.2s;
          margin-top: 8px;
          box-shadow: 0 4px 20px rgba(34,197,94,0.2);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .reg-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(34,197,94,0.3);
        }
        .reg-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-redirect {
          text-align: center; margin-top: 20px;
          font-size: 14px; color: #475569;
        }
        .login-redirect a {
          color: #38bdf8; text-decoration: none; font-weight: 600;
          transition: color 0.2s;
        }
        .login-redirect a:hover { color: #7dd3fc; }

        .back-home {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          color: #334155; font-size: 13px; text-decoration: none;
          margin-top: 16px; transition: color 0.2s;
        }
        .back-home:hover { color: #64748b; }
      `}</style>

      <div className="reg-page">
        <div className="reg-box">

          <Link href="/" className="reg-logo">
            <div className="reg-logo-icon">🌱</div>
            <span className="reg-logo-text">AgroSense</span>
          </Link>

          <div className="reg-header">
            <div className="reg-tag">Get started</div>
            <h2 className="reg-title">Create your account</h2>
            <p className="reg-sub">Join AgroSense and start monitoring your farm</p>
          </div>

          <div className="reg-card">
            <form onSubmit={handleRegister}>
              {error && <div className="form-error">⚠️ {error}</div>}

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="form-input has-icon"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="input-icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirm"
                  className="form-input"
                  placeholder="Re-enter your password"
                  value={form.confirm}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="reg-btn" disabled={loading}>
                {loading ? (
                  <><div className="spinner"></div> Creating account...</>
                ) : (
                  "Create Account →"
                )}
              </button>
            </form>

            <div className="login-redirect">
              Already have an account?{" "}
              <Link href="/login">Sign in here</Link>
            </div>
          </div>

          <Link href="/" className="back-home">
            ← Back to Dashboard
          </Link>

        </div>
      </div>
    </>
  );
}
