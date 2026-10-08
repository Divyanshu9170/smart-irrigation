"use client";

import { useEffect, useRef, useState } from "react";
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

  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // 3D Canvas Mesh Engine for Login Left Panel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 800);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    const nodes: { x: number; y: number; vx: number; vy: number; radius: number }[] = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2.5 + 1.5,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count; i++) {
        const n1 = nodes[i];
        n1.x += n1.vx;
        n1.y += n1.vy;

        if (n1.x < 0 || n1.x > width) n1.vx *= -1;
        if (n1.y < 0 || n1.y > height) n1.vy *= -1;

        ctx.fillStyle = "rgba(52, 211, 153, 0.7)";
        ctx.beginPath();
        ctx.arc(n1.x, n1.y, n1.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < count; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - dist / 120) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 3D Card Hover Perspective Handler
  const handleCardTilt = (e: React.MouseEvent<HTMLElement>) => {
    if (typeof window !== "undefined" && (window.innerWidth < 768 || !window.matchMedia("(hover: hover)").matches)) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -6;
    const ry = ((x - cx) / cx) * 6;
    el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-3px)`;
  };

  const handleCardReset = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg-dark: #05080e;
          --bg-panel: rgba(12, 18, 30, 0.85);
          --bg-card: rgba(16, 25, 42, 0.75);
          --border: rgba(255, 255, 255, 0.08);
          --border-glow: rgba(16, 185, 129, 0.4);
          --primary-emerald: #10b981;
          --mint: #34d399;
          --cyan: #06b6d4;
          --amber: #f59e0b;
          --text-white: #ffffff;
          --text-main: #f1f5f9;
          --text-muted: #94a3b8;
          --text-sub: #64748b;
          --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        body {
          background-color: var(--bg-dark);
          color: var(--text-main);
          font-family: var(--font-sans);
          min-height: 100vh;
        }

        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          background: var(--bg-dark);
        }

        @media(max-width: 900px) {
          .login-page { grid-template-columns: 1fr; }
          .login-left { display: none; }
        }

        /* LEFT PANEL */
        .login-left {
          position: relative;
          background: linear-gradient(135deg, rgba(8, 15, 28, 0.95) 0%, rgba(5, 8, 14, 1) 100%);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          justify-content: center; align-items: flex-start;
          padding: 64px 54px;
          overflow: hidden;
        }
        .login-canvas {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 1; opacity: 0.65;
        }
        .left-content {
          position: relative; z-index: 2; max-width: 520px;
        }
        .left-logo {
          display: flex; align-items: center; gap: 12px; margin-bottom: 48px;
          text-decoration: none;
        }
        .left-logo-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
        .left-logo-text {
          font-size: 22px; font-weight: 900; letter-spacing: -0.5px;
          color: var(--text-white);
        }
        .left-logo-badge {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          padding: 2px 7px; border-radius: 6px;
          background: rgba(16, 185, 129, 0.15); color: var(--mint);
          border: 1px solid rgba(16, 185, 129, 0.3);
          margin-left: 6px;
        }

        .left-tag {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 14px; border-radius: 100px;
          background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--mint); font-size: 12px; font-weight: 700;
          margin-bottom: 20px;
        }
        .left-title {
          font-size: clamp(34px, 4vw, 46px); font-weight: 900;
          line-height: 1.15; letter-spacing: -1.2px; color: var(--text-white);
          margin-bottom: 18px;
        }
        .left-title span {
          background: linear-gradient(135deg, #34d399 0%, #06b6d4 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .left-sub {
          font-size: 15.5px; color: var(--text-muted); line-height: 1.6;
          margin-bottom: 36px;
        }

        .left-features {
          display: flex; flex-direction: column; gap: 12px; width: 100%;
        }
        .left-feature-card {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; border-radius: 14px;
          background: var(--bg-card); border: 1px solid var(--border);
          backdrop-filter: blur(15px); transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .left-feature-card:hover {
          border-color: var(--border-glow);
        }
        .left-feat-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .left-feat-text {
          font-size: 13.5px; font-weight: 600; color: var(--text-main);
        }

        /* RIGHT PANEL */
        .login-right {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px 32px;
          background-image:
            radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.08), transparent 50%),
            radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.06), transparent 50%);
        }
        .login-box {
          width: 100%; max-width: 440px;
        }
        .back-home {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--text-sub); text-decoration: none; font-size: 13px; font-weight: 600;
          margin-bottom: 32px; transition: color 0.2s;
        }
        .back-home:hover { color: var(--mint); }

        .login-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 22px; padding: 36px 32px; backdrop-filter: blur(25px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        }
        .login-header {
          margin-bottom: 28px;
        }
        .login-tag {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700;
          color: var(--mint); text-transform: uppercase; letter-spacing: 1.5px;
          margin-bottom: 8px;
        }
        .login-title {
          font-size: 26px; font-weight: 900; letter-spacing: -0.6px;
          color: var(--text-white); margin-bottom: 8px;
        }
        .login-sub {
          font-size: 14px; color: var(--text-muted); line-height: 1.5;
        }

        .form-error {
          background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5; padding: 12px 14px; border-radius: 12px;
          font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
        }
        .form-success {
          background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--mint); padding: 12px 14px; border-radius: 12px;
          font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
        }

        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block; font-size: 11.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-main);
          margin-bottom: 8px;
        }
        .form-input-wrap {
          position: relative; width: 100%;
        }
        .form-input {
          width: 100%; padding: 13px 16px; border-radius: 12px;
          background: rgba(8, 14, 25, 0.85); border: 1px solid var(--border);
          color: var(--text-white); font-family: var(--font-sans); font-size: 14px;
          outline: none; transition: all 0.2s;
        }
        .form-input:focus {
          border-color: var(--mint);
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
          background: rgba(10, 18, 32, 0.95);
        }
        .form-input.has-icon {
          padding-right: 46px;
        }
        .input-icon {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; font-size: 16px; cursor: pointer;
          color: var(--text-sub); padding: 4px; border-radius: 6px;
        }
        .input-icon:hover { color: var(--text-main); }

        .forgot-link-btn {
          background: none; border: none; color: var(--text-sub); font-size: 12px;
          font-weight: 600; cursor: pointer; margin-top: 8px; display: inline-block;
          transition: color 0.2s;
        }
        .forgot-link-btn:hover { color: var(--mint); text-decoration: underline; }

        .login-btn {
          width: 100%; padding: 14px 20px; border-radius: 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none; color: #fff; font-size: 15px; font-weight: 800;
          cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 10px;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(16, 185, 129, 0.45);
        }
        .login-btn:disabled {
          opacity: 0.6; cursor: not-allowed;
        }

        .register-box {
          margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border);
          text-align: center;
        }
        .register-text {
          font-size: 13px; color: var(--text-sub); margin-bottom: 8px;
        }
        .register-btn {
          color: var(--mint); font-size: 13.5px; font-weight: 700;
          text-decoration: none; transition: all 0.2s;
        }
        .register-btn:hover { text-decoration: underline; }

        /* MODAL */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(6px); z-index: 999;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .modal-card {
          background: rgba(12, 18, 30, 0.96); border: 1px solid var(--border);
          border-radius: 22px; padding: 36px 32px; width: 100%; max-width: 440px;
          position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        }
        .modal-close-btn {
          position: absolute; top: 18px; right: 18px;
          background: rgba(255,255,255,0.06); border: 1px solid var(--border);
          color: var(--text-muted); width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px; transition: all 0.2s;
        }
        .modal-close-btn:hover {
          background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3);
        }
      `}</style>

      <div className="login-page">

        {/* LEFT PANEL */}
        <div className="login-left">
          <canvas ref={canvasRef} className="login-canvas" />

          <div className="left-content">
            <Link href="/" className="left-logo">
              <div className="left-logo-icon">🌱</div>
              <div>
                <span className="left-logo-text">SMART FARM</span>
                <span className="left-logo-badge">IoT Core</span>
              </div>
            </Link>

            <div className="left-tag">⚡ Precision Agriculture Ecosystem</div>
            <h1 className="left-title">
              Intelligent Farming<br />Starts with <span>SMART FARM</span>
            </h1>
            <p className="left-sub">
              Access real-time telemetry from your soil probes, command 6-channel irrigation actuators,
              and run leaf pathology diagnostics powered by Google Gemini AI.
            </p>

            <div className="left-features">
              {[
                { icon: "📡", title: "Real-time Telemetry Probing (Temp, Humidity, NPK)" },
                { icon: "🤖", title: "Gemini 2.5 Flash Leaf Disease Vision" },
                { icon: "💧", title: "Automated 6-Channel Drip Actuation" },
                { icon: "🌾", title: "100 Indian Crops Agronomic Thresholds" },
              ].map((feat, i) => (
                <div
                  key={i}
                  className="left-feature-card"
                  onMouseMove={handleCardTilt}
                  onMouseLeave={handleCardReset}
                >
                  <div className="left-feat-icon">{feat.icon}</div>
                  <div className="left-feat-text">{feat.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-right">
          <div className="login-box">

            <Link href="/" className="back-home">
              ← Return to Dashboard
            </Link>

            <div className="login-card">
              <div className="login-header">
                <div className="login-tag">Farmer Authentication</div>
                <h2 className="login-title">Sign in to SMART FARM</h2>
                <p className="login-sub">Enter your credentials to securely manage your field devices</p>
              </div>

              <form onSubmit={handleLogin}>
                {error && <div className="form-error">⚠️ {error}</div>}

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="form-input-wrap">
                    <input
                      type="email"
                      className="form-input"
                      placeholder="divyanshukumawat9170@gmail.com"
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
                      placeholder="Enter password"
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
                  {loading ? "Authenticating..." : "Sign in to Dashboard ➔"}
                </button>
              </form>

              <div className="register-box">
                <div className="register-text">New to SMART FARM?</div>
                <Link href="/register" className="register-btn">
                  Create a new farm account ➔
                </Link>
              </div>
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
              <div className="login-tag">Security & Recovery</div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6, letterSpacing: -0.4 }}>
                Reset Farm Password
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Enter your registered farm email and choose your new password.
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
                    placeholder="divyanshukumawat9170@gmail.com"
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
                {resetLoading ? "Updating Password..." : "Update Password & Sign In ➔"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
