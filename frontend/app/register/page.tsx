"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  // 3D Canvas Background Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: { x: number; y: number; vx: number; vy: number; radius: number; color: string }[] = [];
    const count = 40;
    const colors = ["rgba(16, 185, 129, ", "rgba(6, 182, 212, ", "rgba(52, 211, 153, "];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        ctx.fillStyle = `${p1.color}0.6)`;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < count; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - dist / 110) * 0.25})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg-dark: #05080e;
          --bg-panel: rgba(12, 18, 30, 0.85);
          --bg-card: rgba(16, 25, 42, 0.78);
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

        .reg-page {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
          padding: 50px 20px;
          background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(16, 185, 129, 0.12), transparent 70%),
                      radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.08), transparent 50%);
        }
        .reg-canvas {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 1; opacity: 0.7;
        }
        .reg-box {
          width: 100%; max-width: 480px; position: relative; z-index: 2;
        }

        .reg-logo {
          display: flex; align-items: center; gap: 12px; text-decoration: none;
          margin-bottom: 32px; justify-content: center;
        }
        .reg-logo-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
        .reg-logo-text {
          font-size: 22px; font-weight: 900; letter-spacing: -0.5px;
          color: var(--text-white);
        }
        .reg-logo-badge {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          padding: 2px 7px; border-radius: 6px;
          background: rgba(16, 185, 129, 0.15); color: var(--mint);
          border: 1px solid rgba(16, 185, 129, 0.3);
          margin-left: 6px;
        }

        .reg-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 24px; padding: 38px 34px; backdrop-filter: blur(25px);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .reg-header {
          text-align: center; margin-bottom: 26px;
        }
        .reg-tag {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700;
          color: var(--mint); text-transform: uppercase; letter-spacing: 1.5px;
          margin-bottom: 8px;
        }
        .reg-title {
          font-size: 26px; font-weight: 900; letter-spacing: -0.6px;
          color: var(--text-white); margin-bottom: 6px;
        }
        .reg-sub {
          font-size: 14px; color: var(--text-muted);
        }

        .form-error {
          background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5; padding: 12px 14px; border-radius: 12px;
          font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
        }

        .form-group {
          margin-bottom: 18px;
        }
        .form-label {
          display: block; font-size: 11.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-main);
          margin-bottom: 7px;
        }
        .form-input-wrap {
          position: relative; width: 100%;
        }
        .form-input {
          width: 100%; padding: 12px 16px; border-radius: 12px;
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

        .reg-btn {
          width: 100%; padding: 14px 20px; border-radius: 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none; color: #fff; font-size: 15px; font-weight: 800;
          cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 22px;
        }
        .reg-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(16, 185, 129, 0.45);
        }
        .reg-btn:disabled {
          opacity: 0.6; cursor: not-allowed;
        }

        .signin-box {
          margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border);
          text-align: center; font-size: 13.5px; color: var(--text-sub);
        }
        .signin-link {
          color: var(--mint); font-weight: 700; text-decoration: none; margin-left: 6px;
        }
        .signin-link:hover { text-decoration: underline; }

        @media(max-width: 480px) {
          .reg-card { padding: 26px 20px; border-radius: 18px; }
          .reg-title { font-size: 22px; }
        }
      `}</style>

      <div className="reg-page">
        <canvas ref={canvasRef} className="reg-canvas" />

        <div className="reg-box">
          <Link href="/" className="reg-logo">
            <div className="reg-logo-icon">🌱</div>
            <div>
              <span className="reg-logo-text">SMART FARM</span>
              <span className="reg-logo-badge">IoT Core</span>
            </div>
          </Link>

          <div className="reg-card">
            <div className="reg-header">
              <div className="reg-tag">New Registration</div>
              <h1 className="reg-title">Join SMART FARM</h1>
              <p className="reg-sub">Create your account to start managing smart irrigation</p>
            </div>

            <form onSubmit={handleRegister}>
              {error && <div className="form-error">⚠️ {error}</div>}

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="form-input-wrap">
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="e.g. Divyanshu Kumawat"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="form-input-wrap">
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password (min 6 characters)</label>
                <div className="form-input-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="form-input has-icon"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={handleChange}
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
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="form-input-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirm"
                    className="form-input"
                    placeholder="Re-enter your password"
                    value={form.confirm}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="reg-btn">
                {loading ? "Creating Account..." : "Register Farm Account ➔"}
              </button>
            </form>

            <div className="signin-box">
              Already have an account?
              <Link href="/login" className="signin-link">
                Sign In ➔
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
