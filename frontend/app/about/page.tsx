"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";

const teamMembers = [
  {
    name: "Aastha Sharma",
    role: "Hardware Design & Instrumentation",
    branch: "B.Tech - Electronics & Communication Engineering",
    year: "3rd Year · 2023–2027",
    photo: "/team/Aastha2.jpeg",
    color: "#38bdf8",
    skills: ["Circuit Design", "Sensor Calibration", "PCB Layout", "Microcontrollers"],
  },
  {
    name: "Lakshita Dhaked",
    role: "Hardware & AI Specialist",
    branch: "B.Tech - Electronics & Communication Engineering",
    year: "3rd Year · 2023–2027",
    photo: "/team/lakshita.jpeg",
    color: "#a78bfa",
    skills: ["Gemini AI Vision", "Leaf Pathology", "ESP32-CAM", "Edge Computing"],
  },
  {
    name: "Divyanshu Kumawat",
    role: "Lead Software & IoT Architect",
    branch: "B.Tech - Electronics & Communication Engineering",
    year: "3rd Year · 2023–2027",
    photo: "/team/Divyanshu.jpeg",
    color: "#10b981",
    skills: ["Full Stack NestJS/Next.js", "Docker & Supabase", "ESP32 Firmware", "Cloud IoT"],
  },
  {
    name: "Mayank Charan",
    role: "Hardware Systems Engineer",
    branch: "B.Tech - Electronics & Communication Engineering",
    year: "3rd Year · 2023–2027",
    photo: "/team/mayank.jpeg",
    color: "#f59e0b",
    skills: ["Relay Control", "Power Delivery", "Solenoid Valves", "Field Prototyping"],
  },
];

export default function About() {
  const { user, token, logout } = useAuth();
  const [visible, setVisible] = useState(false);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // 3D Canvas Mesh Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 420);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 420;
    };
    window.addEventListener("resize", handleResize);

    const cols = 20;
    const rows = 12;
    const spacingX = width / (cols - 1);
    const spacingZ = 45;

    const points: { x: number; y: number; z: number; origY: number; pulse: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - cols / 2) * spacingX;
        const z = (r + 1) * spacingZ;
        const y = Math.sin((c / cols) * Math.PI * 2) * 22;
        points.push({ x, y, z, origY: y, pulse: Math.random() * Math.PI * 2 });
      }
    }

    let rotX = 0.28;
    let rotY = 0;
    let targetRotY = 0;
    let time = 0;

    const render = () => {
      time += 0.02;
      rotY += (targetRotY - rotY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const fov = 420;
      const cameraY = -120;
      const cameraZ = -140;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const projected: { px: number; py: number; alpha: number; scale: number }[] = [];

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.pulse += 0.03;
        const waveY = p.origY + Math.sin(time + p.x * 0.015 + p.z * 0.02) * 18;

        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;

        const y2 = (waveY - cameraY) * cosX - (z1 - cameraZ) * sinX;
        const z2 = (waveY - cameraY) * sinX + (z1 - cameraZ) * cosX;

        if (z2 < 10) {
          projected.push({ px: -999, py: -999, alpha: 0, scale: 0 });
          continue;
        }

        const scale = fov / z2;
        const px = width / 2 + x1 * scale;
        const py = height / 2 + y2 * scale;
        const distRatio = Math.max(0, Math.min(1, 1 - z2 / 850));

        projected.push({ px, py, alpha: distRatio, scale });
      }

      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const cur = projected[idx];
          if (cur.px < -100) continue;

          if (c < cols - 1) {
            const right = projected[idx + 1];
            if (right.px > -100) {
              ctx.strokeStyle = `rgba(16, 185, 129, ${cur.alpha * 0.35})`;
              ctx.beginPath();
              ctx.moveTo(cur.px, cur.py);
              ctx.lineTo(right.px, right.py);
              ctx.stroke();
            }
          }

          if (r < rows - 1) {
            const down = projected[idx + cols];
            if (down.px > -100) {
              ctx.strokeStyle = `rgba(6, 182, 212, ${cur.alpha * 0.28})`;
              ctx.beginPath();
              ctx.moveTo(cur.px, cur.py);
              ctx.lineTo(down.px, down.py);
              ctx.stroke();
            }
          }

          if ((r + c) % 3 === 0) {
            const glow = (Math.sin(points[idx].pulse) + 1) * 0.5;
            const rSize = Math.max(1.5, cur.scale * (2 + glow * 1.5));
            ctx.fillStyle = `rgba(52, 211, 153, ${cur.alpha * (0.5 + glow * 0.5)})`;
            ctx.beginPath();
            ctx.arc(cur.px, cur.py, rSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / width - 0.5;
      targetRotY = nx * 0.45;
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
    const rx = ((y - cy) / cy) * -7;
    const ry = ((x - cx) / cx) * 7;
    el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-5px)`;
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
            radial-gradient(circle at 90% 20%, rgba(6, 182, 212, 0.08), transparent 50%),
            radial-gradient(circle at 10% 80%, rgba(16, 185, 129, 0.05), transparent 50%);
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
          position: relative; width: 100%; min-height: 440px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(8, 15, 28, 0.9) 0%, rgba(5, 8, 14, 1) 100%);
          border-bottom: 1px solid var(--border);
        }
        .hero-canvas {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 1; opacity: 0.85;
        }
        .hero-content {
          position: relative; z-index: 2; text-align: center;
          max-width: 900px; padding: 60px 24px 70px;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 100px;
          background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--mint); font-size: 13px; font-weight: 700;
          margin-bottom: 20px; box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
        }
        .hero-title {
          font-size: clamp(34px, 5vw, 54px); font-weight: 900;
          line-height: 1.15; letter-spacing: -1.5px; color: var(--text-white);
          margin-bottom: 18px;
        }
        .hero-title span {
          background: linear-gradient(135deg, #34d399 0%, #06b6d4 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          font-size: clamp(15px, 2vw, 18px); color: var(--text-muted);
          line-height: 1.6; max-width: 720px; margin: 0 auto 30px;
        }

        /* STATS BAR */
        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 16px; max-width: 1000px; margin: -30px auto 48px;
          padding: 0 20px; position: relative; z-index: 5;
        }
        .stat-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 16px; padding: 22px 18px; text-align: center;
          backdrop-filter: blur(20px); box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stat-card:hover {
          border-color: var(--border-glow);
          box-shadow: 0 12px 35px rgba(16, 185, 129, 0.15);
        }
        .stat-num {
          font-family: var(--font-mono); font-size: 32px; font-weight: 800;
          color: var(--mint); margin-bottom: 4px;
        }
        .stat-label {
          font-size: 13px; font-weight: 600; color: var(--text-sub); text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        @media(max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); margin-top: 20px; }
        }

        /* SECTIONS */
        .section-wrapper {
          max-width: 1200px; margin: 0 auto; padding: 40px 24px 70px;
        }
        .section-header {
          text-align: center; margin-bottom: 48px;
        }
        .section-tag {
          font-family: var(--font-mono); font-size: 12px; font-weight: 700;
          color: var(--mint); text-transform: uppercase; letter-spacing: 1.5px;
          margin-bottom: 8px;
        }
        .section-title {
          font-size: clamp(26px, 3.5vw, 38px); font-weight: 800;
          letter-spacing: -0.8px; color: var(--text-white); margin-bottom: 12px;
        }
        .section-desc {
          font-size: 16px; color: var(--text-muted); max-width: 640px; margin: 0 auto;
          line-height: 1.6;
        }

        /* VISION & MISSION */
        .vm-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
          margin-bottom: 70px;
        }
        .vm-card {
          position: relative; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: 20px;
          padding: 36px 32px; backdrop-filter: blur(20px);
          transition: transform 0.2s ease, border-color 0.25s ease;
          overflow: hidden;
        }
        .vm-card:hover {
          border-color: rgba(16, 185, 129, 0.4);
        }
        .vm-glow {
          position: absolute; top: -40px; right: -40px; width: 120px; height: 120px;
          border-radius: 50%; opacity: 0.15; filter: blur(30px); pointer-events: none;
        }
        .vm-icon {
          width: 54px; height: 54px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; margin-bottom: 20px;
        }
        .vm-title {
          font-size: 22px; font-weight: 800; color: var(--text-white);
          margin-bottom: 14px; letter-spacing: -0.4px;
        }
        .vm-text {
          font-size: 15px; color: var(--text-muted); line-height: 1.7;
        }

        @media(max-width: 768px) {
          .vm-grid { grid-template-columns: 1fr; }
        }

        /* TEAM GRID */
        .team-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 22px; margin-bottom: 70px;
        }
        .team-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 20px; overflow: hidden; backdrop-filter: blur(20px);
          transition: transform 0.2s ease, border-color 0.25s ease, box-shadow 0.25s ease;
          cursor: pointer;
        }
        .team-card:hover {
          border-color: var(--accent, #10b981);
          box-shadow: 0 16px 40px rgba(0,0,0,0.5);
        }
        .team-photo-wrap {
          position: relative; width: 100%; height: 260px;
          background: rgba(10, 16, 28, 0.9); overflow: hidden;
        }
        .team-photo {
          width: 100%; height: 100%; object-fit: cover; object-position: top;
          transition: transform 0.4s ease;
        }
        .team-card:hover .team-photo {
          transform: scale(1.05);
        }
        .team-photo-placeholder {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; font-size: 64px; color: var(--text-sub);
        }
        .team-photo-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(5,8,14,0.9) 100%);
        }
        .team-accent-bar {
          position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
        }
        .team-info {
          padding: 20px 18px 24px;
        }
        .team-name {
          font-size: 18px; font-weight: 800; color: var(--text-white);
          margin-bottom: 4px;
        }
        .team-role {
          font-size: 13px; font-weight: 700; margin-bottom: 10px;
        }
        .team-branch {
          font-size: 12px; color: var(--text-muted); line-height: 1.4; margin-bottom: 4px;
        }
        .team-year {
          font-family: var(--font-mono); font-size: 11px; color: var(--text-sub);
          font-weight: 600; margin-bottom: 12px;
        }
        .team-skills-row {
          display: flex; flex-wrap: wrap; gap: 5px;
        }
        .team-skill-tag {
          font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 6px;
          background: rgba(255,255,255,0.05); color: var(--text-muted);
          border: 1px solid rgba(255,255,255,0.06);
        }

        @media(max-width: 992px) {
          .team-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media(max-width: 560px) {
          .team-grid { grid-template-columns: 1fr; }
        }

        /* TECH STACK */
        .tech-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .tech-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 18px; padding: 28px 24px; backdrop-filter: blur(20px);
          transition: transform 0.2s ease, border-color 0.25s ease;
        }
        .tech-card:hover {
          border-color: rgba(6, 182, 212, 0.4);
          box-shadow: 0 12px 30px rgba(6, 182, 212, 0.1);
        }
        .tech-icon {
          font-size: 32px; margin-bottom: 14px;
        }
        .tech-name {
          font-size: 17px; font-weight: 800; color: var(--text-white);
          margin-bottom: 8px;
        }
        .tech-desc {
          font-size: 13.5px; color: var(--text-muted); line-height: 1.6;
        }

        @media(max-width: 868px) {
          .tech-grid { grid-template-columns: 1fr; }
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
        .footer-badges {
          display: flex; justify-content: center; gap: 10px; margin-top: 16px;
        }
        .footer-badge {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700;
          padding: 3px 10px; border-radius: 100px;
          background: rgba(255,255,255,0.04); border: 1px solid var(--border);
          color: var(--text-muted);
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
          <Link href="/about" className="nav-link active">About</Link>
          <Link href="/contact" className="nav-link">Contact</Link>
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
          <Link href="/about" className="mobile-drawer-link active" onClick={() => setMobileMenuOpen(false)}>👥 About Engineering Team</Link>
          <Link href="/contact" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>📬 Contact Support</Link>
          {token ? (
            <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="mobile-drawer-link" style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer", color: "#ef4444" }}>
              🚪 Sign Out
            </button>
          ) : (
            <Link href="/login" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>🔑 Farmer Login</Link>
          )}
        </div>
      )}

      {/* 3D INTERACTIVE HERO BANNER */}
      <div className="hero-banner-container">
        <canvas ref={canvasRef} className="hero-canvas" />
        <div className="hero-content">
          <div className="hero-badge">🌿 Final Year B.Tech Project · ECE 2026</div>
          <h1 className="hero-title">
            Empowering Agriculture with<br /><span>SMART FARM</span> Intelligence
          </h1>
          <p className="hero-sub">
            A state-of-the-art precision agriculture IoT ecosystem integrating microclimate telemetry,
            automated drip irrigation, and Gemini AI leaf pathology to maximize crop yield while conserving water.
          </p>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="stats-grid">
        <div className="stat-card" onMouseMove={handleCardTilt} onMouseLeave={handleCardReset}>
          <div className="stat-num">7+</div>
          <div className="stat-label">Telemetry Metrics</div>
        </div>
        <div className="stat-card" onMouseMove={handleCardTilt} onMouseLeave={handleCardReset}>
          <div className="stat-num">100</div>
          <div className="stat-label">Crop Database</div>
        </div>
        <div className="stat-card" onMouseMove={handleCardTilt} onMouseLeave={handleCardReset}>
          <div className="stat-num">5s</div>
          <div className="stat-label">Telemetry Sync</div>
        </div>
        <div className="stat-card" onMouseMove={handleCardTilt} onMouseLeave={handleCardReset}>
          <div className="stat-num">Gemini</div>
          <div className="stat-label">AI Leaf Pathology</div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="section-wrapper">

        {/* VISION & MISSION */}
        <div className="section-header">
          <div className="section-tag">Core Principles</div>
          <h2 className="section-title">Our Vision & Mission</h2>
          <p className="section-desc">
            Bridging hardware engineering and machine intelligence to empower Indian farmers with precision cultivation.
          </p>
        </div>

        <div className="vm-grid">
          <div className="vm-card" onMouseMove={handleCardTilt} onMouseLeave={handleCardReset}>
            <div className="vm-glow" style={{ background: "#38bdf8" }} />
            <div className="vm-icon" style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)" }}>
              🔭
            </div>
            <div className="vm-title">Our Vision</div>
            <div className="vm-text">
              To revolutionize greenhouse and open-field farming across India through automated IoT control loops,
              enabling farmers to maximize produce quality while slashing water consumption by over 40% and eliminating preventable crop loss.
            </div>
          </div>

          <div className="vm-card" onMouseMove={handleCardTilt} onMouseLeave={handleCardReset}>
            <div className="vm-glow" style={{ background: "#10b981" }} />
            <div className="vm-icon" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              🎯
            </div>
            <div className="vm-title">Our Mission</div>
            <div className="vm-text">
              To build a reliable, affordable smart irrigation system using ESP32, multi-sensor soil probing,
              and 6-channel relay actuators — coupled with Google Gemini 2.5 Flash AI for real-time leaf disease diagnosis and fertilizer recommendations.
            </div>
          </div>
        </div>

        {/* TEAM SECTION */}
        <div className="section-header">
          <div className="section-tag">Engineering Minds</div>
          <h2 className="section-title">Meet the Creators</h2>
          <p className="section-desc">
            Final-year B.Tech students in Electronics & Communication Engineering dedicated to practical technological innovation.
          </p>
        </div>

        <div className="team-grid">
          {teamMembers.map((member, i) => (
            <div
              key={i}
              className="team-card"
              style={{ "--accent": member.color } as React.CSSProperties}
              onMouseMove={handleCardTilt}
              onMouseLeave={handleCardReset}
              onClick={() => setActiveCard(activeCard === i ? null : i)}
            >
              <div className="team-photo-wrap">
                <img
                  src={member.photo}
                  alt={member.name}
                  className="team-photo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = "flex";
                  }}
                />
                <div className="team-photo-placeholder" style={{ display: "none" }}>
                  👤
                </div>
                <div className="team-photo-overlay" />
                <div className="team-accent-bar" style={{ background: `linear-gradient(90deg, ${member.color}, transparent)` }} />
              </div>

              <div className="team-info">
                <div className="team-name">{member.name}</div>
                <div className="team-role" style={{ color: member.color }}>{member.role}</div>
                <div className="team-branch">{member.branch}</div>
                <div className="team-year">{member.year}</div>

                <div className="team-skills-row">
                  {member.skills.map((s, idx) => (
                    <span key={idx} className="team-skill-tag">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TECH ARCHITECTURE */}
        <div className="section-header">
          <div className="section-tag">System Architecture</div>
          <h2 className="section-title">Technology Stack</h2>
          <p className="section-desc">
            A hardened, multi-tier IoT pipeline engineered for low latency, fault tolerance, and responsive user feedback.
          </p>
        </div>

        <div className="tech-grid">
          {[
            { icon: "⚡", name: "ESP32 + Micro-Sensors", desc: "DHT11, Capacitive Soil Moisture, and NPK RS485 probe sampling root conditions and environmental microclimates." },
            { icon: "🛡️", name: "NestJS Enterprise Backend", desc: "Modular TypeScript API with TypeORM, PostgreSQL connection pooling, and JWT authentication." },
            { icon: "⚛️", name: "Next.js 16 + React 19", desc: "High-performance dashboard with interactive 3D WebGL mesh, real-time telemetry gauges, and responsive glassmorphism." },
            { icon: "🤖", name: "Gemini 2.5 Flash Vision", desc: "Multimodal generative AI model detecting leaf blight, pests, nutrient deficiencies, and organic remediation actions." },
            { icon: "🚰", name: "6-Relay Drip Actuation", desc: "Sub-second solenoid valve and water pump automation with real-time feedback and manual override safeguards." },
            { icon: "☁️", name: "Docker & Supabase", desc: "Cloud containerized PostgreSQL database with automatic recovery, data integrity, and cross-platform synchronization." },
          ].map((tech, i) => (
            <div className="tech-card" key={i} onMouseMove={handleCardTilt} onMouseLeave={handleCardReset}>
              <div className="tech-icon">{tech.icon}</div>
              <div className="tech-name">{tech.name}</div>
              <div className="tech-desc">{tech.desc}</div>
            </div>
          ))}
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
        <div className="footer-badges">
          <span className="footer-badge">Next.js 16</span>
          <span className="footer-badge">NestJS</span>
          <span className="footer-badge">ESP32 IoT</span>
          <span className="footer-badge">Gemini AI</span>
        </div>
      </footer>
    </>
  );
}
