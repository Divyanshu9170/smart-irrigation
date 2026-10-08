"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";

export default function Contact() {
  const { user, token, logout } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("https://smart-irrigation-1-mawh.onrender.com/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      console.error(error);
      alert("Failed to send message. Please reach out directly to divyanshukumawat9170@gmail.com.");
    } finally {
      setLoading(false);
    }
  };

  // 3D Canvas Wave & Particle Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 380);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 380;
    };
    window.addEventListener("resize", handleResize);

    const particles: { x: number; y: number; vx: number; vy: number; radius: number; baseAlpha: number }[] = [];
    const count = 45;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2.5 + 1,
        baseAlpha: Math.random() * 0.5 + 0.3,
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Connect particles with 3D glowing lines
      for (let i = 0; i < count; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        // Draw particle
        ctx.fillStyle = `rgba(52, 211, 153, ${p1.baseAlpha})`;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < count; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - dist / 110) * 0.35})`;
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

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
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
    el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
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
          --bg-panel: rgba(12, 18, 30, 0.82);
          --bg-card: rgba(16, 25, 42, 0.72);
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
          overflow-x: hidden;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.15), transparent 70%),
            radial-gradient(circle at 85% 30%, rgba(6, 182, 212, 0.08), transparent 50%),
            radial-gradient(circle at 15% 75%, rgba(16, 185, 129, 0.06), transparent 50%);
        }

        /* NAVBAR */
        .navbar {
          position: sticky; top: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 36px;
          background: rgba(5, 8, 14, 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo {
          display: flex; align-items: center; gap: 12px; text-decoration: none;
        }
        .nav-logo-icon {
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
        .nav-logo-text {
          font-size: 20px; font-weight: 900; letter-spacing: -0.5px;
          color: var(--text-white);
        }
        .nav-logo-badge {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          padding: 2px 7px; border-radius: 6px;
          background: rgba(16, 185, 129, 0.15); color: var(--mint);
          border: 1px solid rgba(16, 185, 129, 0.3);
          margin-left: 4px;
        }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-link {
          text-decoration: none; color: var(--text-muted); font-size: 14px; font-weight: 600;
          padding: 8px 16px; border-radius: 10px; transition: all 0.25s ease;
        }
        .nav-link:hover { color: var(--text-white); background: rgba(255,255,255,0.06); }
        .nav-link.active {
          color: var(--mint); background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .nav-user-pill {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.04); border: 1px solid var(--border);
          font-size: 13px; font-weight: 600; color: var(--text-main);
        }
        .nav-user-avatar {
          width: 26px; height: 26px; border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: #fff;
        }
        .nav-logout-btn {
          background: transparent; border: none; color: var(--text-sub);
          font-size: 12px; font-weight: 600; cursor: pointer; transition: color 0.2s;
        }
        .nav-logout-btn:hover { color: #ef4444; }

        .mobile-toggle {
          display: none; background: rgba(255,255,255,0.06); border: 1px solid var(--border);
          width: 40px; height: 40px; border-radius: 10px; color: #fff; font-size: 20px;
          cursor: pointer; align-items: center; justify-content: center;
        }
        .mobile-drawer {
          display: none; flex-direction: column; gap: 8px; padding: 20px;
          background: rgba(8, 14, 25, 0.98); border-bottom: 1px solid var(--border);
          backdrop-filter: blur(25px);
        }
        .mobile-drawer-link {
          color: var(--text-muted); text-decoration: none; font-size: 15px; font-weight: 600;
          padding: 12px 16px; border-radius: 10px; transition: all 0.2s;
          display: flex; align-items: center; gap: 10px;
        }
        .mobile-drawer-link.active, .mobile-drawer-link:hover {
          color: var(--mint); background: rgba(16, 185, 129, 0.12);
        }

        @media(max-width: 868px) {
          .navbar { padding: 14px 20px; }
          .nav-links { display: none; }
          .mobile-toggle { display: flex; }
          .mobile-drawer { display: flex; }
        }

        /* HERO & 3D CANVAS BANNER */
        .hero-banner-container {
          position: relative; width: 100%; min-height: 360px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(8, 15, 28, 0.9) 0%, rgba(5, 8, 14, 1) 100%);
          border-bottom: 1px solid var(--border);
        }
        .hero-canvas {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 1; opacity: 0.75;
        }
        .hero-content {
          position: relative; z-index: 2; text-align: center;
          max-width: 820px; padding: 50px 24px 60px;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 100px;
          background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--mint); font-size: 13px; font-weight: 700;
          margin-bottom: 20px; box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
        }
        .hero-title {
          font-size: clamp(32px, 4.5vw, 50px); font-weight: 900;
          line-height: 1.15; letter-spacing: -1.2px; color: var(--text-white);
          margin-bottom: 16px;
        }
        .hero-title span {
          background: linear-gradient(135deg, #34d399 0%, #06b6d4 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          font-size: clamp(15px, 1.8vw, 17px); color: var(--text-muted);
          line-height: 1.6; max-width: 660px; margin: 0 auto;
        }

        /* MAIN CONTENT */
        .contact-container {
          max-width: 1140px; margin: 0 auto; padding: 48px 24px 80px;
        }
        .contact-grid {
          display: grid; grid-template-columns: 1fr 1.25fr;
          gap: 32px; align-items: start;
        }

        @media(max-width: 868px) {
          .contact-grid { grid-template-columns: 1fr; }
        }

        /* LEFT INFO CARDS */
        .info-panel {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 22px; padding: 36px 30px; backdrop-filter: blur(20px);
          transition: transform 0.2s ease, border-color 0.25s ease;
        }
        .info-panel:hover {
          border-color: var(--border-glow);
        }
        .info-tag {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700;
          color: var(--mint); text-transform: uppercase; letter-spacing: 1.5px;
          margin-bottom: 8px;
        }
        .info-title {
          font-size: 24px; font-weight: 800; color: var(--text-white);
          margin-bottom: 10px; letter-spacing: -0.4px;
        }
        .info-desc {
          font-size: 14px; color: var(--text-muted); line-height: 1.6;
          margin-bottom: 28px;
        }

        .contact-item {
          display: flex; align-items: center; gap: 16px;
          padding: 16px; border-radius: 14px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          text-decoration: none; margin-bottom: 14px;
          transition: all 0.25s ease;
        }
        .contact-item:hover {
          background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.3);
          transform: translateX(4px);
        }
        .contact-item-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .contact-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.8px; color: var(--text-sub); margin-bottom: 3px;
        }
        .contact-val {
          font-size: 14px; font-weight: 700; color: var(--text-main);
          word-break: break-all;
        }
        .contact-sub {
          font-size: 11.5px; color: var(--text-muted); margin-top: 2px;
        }

        /* FORM CARD */
        .form-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 22px; padding: 38px 34px; backdrop-filter: blur(20px);
          transition: transform 0.2s ease, border-color 0.25s ease;
        }
        .form-card:hover {
          border-color: rgba(6, 182, 212, 0.4);
        }
        .form-title {
          font-size: 22px; font-weight: 800; color: var(--text-white);
          margin-bottom: 8px; letter-spacing: -0.3px;
        }
        .form-sub {
          font-size: 14px; color: var(--text-muted); margin-bottom: 26px;
        }

        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block; font-size: 12px; font-weight: 700;
          color: var(--text-main); margin-bottom: 8px; text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .form-input, .form-textarea {
          width: 100%; padding: 13px 16px; border-radius: 12px;
          background: rgba(8, 14, 25, 0.8); border: 1px solid var(--border);
          color: var(--text-white); font-family: var(--font-sans); font-size: 14px;
          transition: all 0.2s ease; outline: none;
        }
        .form-input:focus, .form-textarea:focus {
          border-color: var(--mint);
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
          background: rgba(10, 18, 32, 0.95);
        }
        .form-textarea {
          resize: vertical; min-height: 120px;
        }

        .submit-btn {
          width: 100%; padding: 14px 24px; border-radius: 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none; color: #fff; font-size: 15px; font-weight: 800;
          cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(16, 185, 129, 0.45);
        }
        .submit-btn:disabled {
          opacity: 0.6; cursor: not-allowed;
        }

        .success-box {
          text-align: center; padding: 40px 20px;
        }
        .success-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; margin: 0 auto 18px; color: var(--mint);
        }
        .success-title {
          font-size: 20px; font-weight: 800; color: var(--text-white); margin-bottom: 8px;
        }
        .success-desc {
          font-size: 14px; color: var(--text-muted); line-height: 1.6; max-width: 380px; margin: 0 auto 24px;
        }
        .send-another-btn {
          padding: 10px 20px; border-radius: 10px;
          background: rgba(255,255,255,0.06); border: 1px solid var(--border);
          color: var(--mint); font-weight: 700; font-size: 13px; cursor: pointer;
          transition: all 0.2s;
        }
        .send-another-btn:hover {
          background: rgba(16, 185, 129, 0.12);
        }

        /* FOOTER */
        .footer {
          text-align: center; padding: 48px 24px;
          border-top: 1px solid var(--border);
          background: rgba(5, 8, 14, 0.95);
        }
        .footer-logo {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 18px; font-weight: 900; color: var(--text-white); margin-bottom: 10px;
        }
        .footer-text {
          font-size: 13px; color: var(--text-sub); line-height: 1.6;
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="navbar">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">🌱</div>
          <div>
            <span className="nav-logo-text">SMART FARM</span>
            <span className="nav-logo-badge">IoT Core</span>
          </div>
        </Link>
        <div className="nav-links">
          <Link href="/" className="nav-link">Dashboard</Link>
          <Link href="/crop" className="nav-link">Crops</Link>
          <Link href="/about" className="nav-link">About</Link>
          <Link href="/contact" className="nav-link active">Contact</Link>
          {token && user ? (
            <div className="nav-user-pill">
              <div className="nav-user-avatar">{user.name?.charAt(0) || "U"}</div>
              <span>{user.name?.split(" ")[0]}</span>
              <button onClick={() => logout()} className="nav-logout-btn">✕</button>
            </div>
          ) : (
            <Link href="/login" className="nav-link" style={{ color: "var(--mint)" }}>Farmer Login ➔</Link>
          )}
        </div>
        <button
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <Link href="/" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>📊 Dashboard</Link>
          <Link href="/crop" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>🌾 Crop Directory</Link>
          <Link href="/about" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>👥 About Engineering Team</Link>
          <Link href="/contact" className="mobile-drawer-link active" onClick={() => setMobileMenuOpen(false)}>📬 Contact Support</Link>
          {token ? (
            <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="mobile-drawer-link" style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer", color: "#ef4444" }}>
              🚪 Sign Out
            </button>
          ) : (
            <Link href="/login" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>🔑 Farmer Login</Link>
          )}
        </div>
      )}

      {/* 3D HERO BANNER */}
      <div className="hero-banner-container">
        <canvas ref={canvasRef} className="hero-canvas" />
        <div className="hero-content">
          <div className="hero-badge">📬 Direct Developer & Hardware Support</div>
          <h1 className="hero-title">
            Connect with the <span>SMART FARM</span> Team
          </h1>
          <p className="hero-sub">
            Have questions regarding sensor calibration, ESP32 telemetry, or Gemini AI leaf detection?
            Send us a message and our team will get back to you promptly.
          </p>
        </div>
      </div>

      {/* CONTACT BODY */}
      <div className="contact-container">
        <div className="contact-grid">

          {/* LEFT INFO PANEL */}
          <div className="info-panel" onMouseMove={handleCardTilt} onMouseLeave={handleCardReset}>
            <div className="info-tag">Project Lead & Engineering</div>
            <div className="info-title">Divyanshu Kumawat</div>
            <div className="info-desc">
              Lead IoT & Software Developer for SMART FARM. Feel free to contact regarding hardware schematics,
              cloud deployment, or academic inquiries.
            </div>

            <a href="mailto:divyanshukumawat9170@gmail.com" className="contact-item">
              <div className="contact-item-icon" style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)" }}>
                📧
              </div>
              <div>
                <div className="contact-label">Email Dispatch</div>
                <div className="contact-val">divyanshukumawat9170@gmail.com</div>
                <div className="contact-sub">Response within 24 hours</div>
              </div>
            </a>

            <a href="tel:+919875849170" className="contact-item">
              <div className="contact-item-icon" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
                📱
              </div>
              <div>
                <div className="contact-label">Direct Phone</div>
                <div className="contact-val">+91 98758 49170</div>
                <div className="contact-sub">Available Mon–Sat, 10 AM – 6 PM IST</div>
              </div>
            </a>

            <a href="https://github.com/Divyanshu9170/smart-irrigation.git" target="_blank" rel="noopener noreferrer" className="contact-item">
              <div className="contact-item-icon" style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}>
                💻
              </div>
              <div>
                <div className="contact-label">Open Source Repository</div>
                <div className="contact-val">github.com/Divyanshu9170/smart-irrigation</div>
                <div className="contact-sub">View NestJS backend & Next.js frontend code</div>
              </div>
            </a>

            <div className="contact-item" style={{ cursor: "default" }}>
              <div className="contact-item-icon" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                📍
              </div>
              <div>
                <div className="contact-label">Engineering Campus</div>
                <div className="contact-val">Rajasthan, India 🇮🇳</div>
                <div className="contact-sub">Department of Electronics & Communication</div>
              </div>
            </div>
          </div>

          {/* RIGHT FORM PANEL */}
          <div className="form-card" onMouseMove={handleCardTilt} onMouseLeave={handleCardReset}>
            {sent ? (
              <div className="success-box">
                <div className="success-icon">✓</div>
                <div className="success-title">Message Received!</div>
                <div className="success-desc">
                  Thank you for reaching out to the SMART FARM team. We have received your inquiry and will respond to your email shortly.
                </div>
                <button onClick={() => setSent(false)} className="send-another-btn">
                  Send Another Inquiry ➔
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-title">Send Us a Direct Message</div>
                <div className="form-sub">Fill in the fields below to submit feedback, questions, or project suggestions.</div>

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="e.g. rahul@example.com"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="e.g. Question on Soil Moisture Thresholds"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Describe your inquiry, suggestion, or question in detail..."
                    className="form-textarea"
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="submit-btn">
                  {loading ? "Transmitting..." : "Send Message to SMART FARM ➔"}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">
          <span>🌱</span> SMART FARM
        </div>
        <div className="footer-text">
          Intelligent IoT-Based Smart Irrigation & Crop Monitoring System<br />
          Built with precision by Engineering Students · India 🇮🇳
        </div>
      </footer>
    </>
  );
}
