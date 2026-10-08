"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const teamMembers = [
  {
    name: "Aastha sharma",
    role: "Hardware Design & instrumentation",
    branch: "B.Tech - Electronics & Communication Engineering",
    year: "3rd Year · 2023–2027",
    photo: "/team/Aastha2.jpeg",
    color: "#38bdf8",
  },
  {
    name: "Lakshita dhaked",
    role: "Hardware & AI Specialist",
    branch: "B.Tech - Electronics & Communication Engineering",
    year: "3rd Year · 2023–2027",
    photo: "/team/lakshita.jpeg",
    color: "#a78bfa",
  },
  {
    name: "Divyanshu Kumawat",
    role: "Software Developer",
    branch: "B.Tech - Electronics & Communication Engineering",
    year: "3rd Year · 2023–2027",
    photo: "/team/Divyanshu.jpeg",
    color: "#22c55e",
  },
  {
    name: "Mayank charan",
    role: "Hardware Engineer",
    branch: "B.Tech - Electronics & Communication Engineering",
    year: "3rd Year · 2023–2027",
    photo: "/team/mayank.jpeg",
    color: "#f59e0b",
  },
];

export default function About() {
  const [visible, setVisible] = useState(false);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050c1a; color: #e2e8f0; font-family: 'DM Sans', sans-serif; }

        .navbar {
          position: sticky; top: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 32px;
          background: rgba(5,12,26,0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(56,189,248,0.1);
        }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #0ea5e9, #22c55e);
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .nav-logo-text { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; color: #f0f9ff; }
        .nav-links { display: flex; gap: 4px; }
        .nav-link {
          text-decoration: none; color: #94a3b8; font-size: 14px; font-weight: 500;
          padding: 7px 14px; border-radius: 8px; transition: all 0.2s;
        }
        .nav-link:hover { color: #e2e8f0; background: rgba(255,255,255,0.06); }
        .nav-link.active { color: #38bdf8; background: rgba(56,189,248,0.1); }
        .mobile-toggle {
          display: none; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          width: 36px; height: 36px; border-radius: 9px; color: #fff; font-size: 18px;
          cursor: pointer; align-items: center; justify-content: center;
        }
        .mobile-drawer {
          display: none;
        }

        @media(max-width: 768px) {
          .navbar { padding: 12px 16px; }
          .nav-links { display: none; }
          .mobile-toggle { display: flex; }
          .mobile-drawer {
            display: flex; flex-direction: column; gap: 6px; padding: 16px;
            background: rgba(8, 14, 25, 0.98); border-bottom: 1px solid rgba(255,255,255,0.08);
            backdrop-filter: blur(20px);
          }
          .mobile-drawer-link {
            color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 500;
            padding: 9px 12px; border-radius: 8px; transition: all 0.2s;
          }
          .mobile-drawer-link:hover, .mobile-drawer-link.active {
            color: #38bdf8; background: rgba(56,189,248,0.1);
          }
          .about-hero { padding: 48px 16px 36px !important; }
          .about-title { font-size: clamp(28px, 7vw, 42px) !important; }
          .about-sub { font-size: 14px !important; }
          .section, .team-section, .project-section { padding: 40px 16px !important; }
          .vm-grid { grid-template-columns: 1fr !important; }
          .stats-row { grid-template-columns: repeat(2, 1fr) !important; padding: 20px 14px !important; gap: 12px !important; }
          .stat-num { font-size: 26px !important; }
          .team-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; margin-top: 28px !important; }
          .team-photo-wrap { height: 170px !important; }
          .team-info { padding: 14px !important; }
          .team-name { font-size: 14px !important; }
          .tech-grid { grid-template-columns: 1fr !important; }
        }
        @media(max-width: 440px) {
          .team-grid { grid-template-columns: 1fr !important; }
        }

        .fade-up {
          opacity: 0; transform: translateY(30px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .fade-up.show { opacity: 1; transform: translateY(0); }
        .delay-1 { transition-delay: 0.1s; }
        .delay-2 { transition-delay: 0.2s; }
        .delay-3 { transition-delay: 0.3s; }
        .delay-4 { transition-delay: 0.4s; }
        .delay-5 { transition-delay: 0.5s; }
        .delay-6 { transition-delay: 0.6s; }

        .about-hero {
          padding: 80px 32px 60px;
          text-align: center;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(56,189,248,0.07) 0%, transparent 70%);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .about-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(56,189,248,0.08); border: 1px solid rgba(56,189,248,0.2);
          color: #38bdf8; font-size: 12px; font-weight: 500;
          padding: 5px 16px; border-radius: 100px; margin-bottom: 24px;
          letter-spacing: 0.5px;
        }
        .about-title {
          font-family: 'Syne', sans-serif; font-size: clamp(36px, 5vw, 60px);
          font-weight: 800; line-height: 1.1; letter-spacing: -1px;
          background: linear-gradient(135deg, #f0f9ff 0%, #7dd3fc 60%, #22c55e 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 16px;
        }
        .about-sub {
          font-size: 16px; color: #64748b; max-width: 560px;
          margin: 0 auto; line-height: 1.8;
        }

        .section { padding: 64px 32px; max-width: 1100px; margin: 0 auto; }
        .section-tag {
          font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600;
          color: #38bdf8; letter-spacing: 2px; text-transform: uppercase;
          margin-bottom: 12px;
        }
        .section-title {
          font-family: 'Syne', sans-serif; font-size: clamp(24px, 3vw, 36px);
          font-weight: 700; color: #f0f9ff; margin-bottom: 16px; line-height: 1.2;
        }
        .section-desc {
          font-size: 15px; color: #64748b; line-height: 1.8; max-width: 620px;
        }

        .vm-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
          margin-top: 40px;
        }
        @media(max-width: 700px) { .vm-grid { grid-template-columns: 1fr; } }
        .vm-card {
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 32px;
          position: relative; overflow: hidden;
          transition: border-color 0.3s, transform 0.3s;
        }
        .vm-card:hover { border-color: rgba(56,189,248,0.3); transform: translateY(-4px); }
        .vm-card-glow {
          position: absolute; top: -40px; right: -40px;
          width: 120px; height: 120px; border-radius: 50%;
          opacity: 0.06; filter: blur(30px);
        }
        .vm-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 20px;
        }
        .vm-title {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700;
          color: #f0f9ff; margin-bottom: 12px;
        }
        .vm-text { font-size: 14px; color: #64748b; line-height: 1.8; }

        .stats-row {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
          margin-top: 48px; padding: 32px;
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 20px;
        }
        @media(max-width: 700px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
        .stat-item { text-align: center; }
        .stat-num {
          font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800;
          background: linear-gradient(135deg, #38bdf8, #22c55e);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 6px;
        }
        .stat-label { font-size: 13px; color: #475569; }

        .divider { height: 1px; background: rgba(255,255,255,0.04); margin: 0 32px; }

        .team-section { padding: 64px 32px; max-width: 1100px; margin: 0 auto; }
        .team-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
          margin-top: 48px;
        }
        @media(max-width: 900px) { .team-grid { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 500px) { .team-grid { grid-template-columns: 1fr; } }

        .team-card {
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; overflow: hidden;
          transition: all 0.3s; cursor: pointer;
        }
        .team-card:hover { transform: translateY(-8px); }
        .team-card.active { border-color: var(--accent); box-shadow: 0 0 30px rgba(0,0,0,0.4); }

        .team-photo-wrap {
          position: relative; height: 220px; overflow: hidden;
          background: rgba(5,12,26,0.8);
        }
        .team-photo { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .team-card:hover .team-photo { transform: scale(1.05); }
        .team-photo-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 64px;
          background: linear-gradient(135deg, rgba(15,23,42,1), rgba(30,41,59,1));
        }
        .team-photo-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(15,23,42,0.9) 0%, transparent 60%);
        }
        .team-accent-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; }

        .team-info { padding: 20px; }
        .team-name {
          font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700;
          color: #f0f9ff; margin-bottom: 4px;
        }
        .team-role { font-size: 12px; font-weight: 600; margin-bottom: 10px; letter-spacing: 0.5px; }
        .team-branch { font-size: 12px; color: #475569; margin-bottom: 8px; line-height: 1.5; }
        .team-year {
          font-size: 11px; color: #334155;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 3px 10px; border-radius: 100px;
          display: inline-block;
        }

        .project-section { padding: 64px 32px; max-width: 1100px; margin: 0 auto; }
        .tech-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
          margin-top: 40px;
        }
        @media(max-width: 700px) { .tech-grid { grid-template-columns: 1fr; } }
        .tech-card {
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 24px; transition: all 0.2s;
        }
        .tech-card:hover { border-color: rgba(56,189,248,0.2); transform: translateY(-2px); }
        .tech-icon { font-size: 28px; margin-bottom: 12px; }
        .tech-name {
          font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700;
          color: #f0f9ff; margin-bottom: 8px;
        }
        .tech-desc { font-size: 13px; color: #475569; line-height: 1.6; }

        .about-footer {
          text-align: center; padding: 40px 32px;
          border-top: 1px solid rgba(255,255,255,0.04);
          font-size: 13px; color: #334155;
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="navbar">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">🌱</div>
          <span className="nav-logo-text">AgroSense</span>
        </Link>
        <div className="nav-links">
          <Link href="/" className="nav-link">Dashboard</Link>
          <Link href="/about" className="nav-link active">About</Link>
          <Link href="/crop" className="nav-link">Crops</Link>
          <Link href="/contact" className="nav-link">Contact</Link>
          <Link href="/login" className="nav-link">Login</Link>
        </div>
        <button
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <Link href="/" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>📊 Dashboard</Link>
          <Link href="/about" className="mobile-drawer-link active" onClick={() => setMobileMenuOpen(false)}>👥 About Team</Link>
          <Link href="/crop" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>🌾 Crops Encyclopedia</Link>
          <Link href="/contact" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>📬 Contact</Link>
          <Link href="/login" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>🔑 Farmer Login</Link>
        </div>
      )}

      {/* HERO */}
      <div className="about-hero">
        <div className={`fade-up ${visible ? "show" : ""}`}>
          <div className="about-badge">🌿 About Our Project</div>
          <h1 className="about-title">Building the Future<br />of Smart Farming</h1>
          <p className="about-sub">
            A student-built precision agriculture platform that combines IoT sensors,
            AI-powered disease detection, and automated irrigation for modern greenhouse farming.
          </p>
        </div>
      </div>

      {/* VISION & MISSION */}
      <div className="section">
        <div className={`fade-up delay-1 ${visible ? "show" : ""}`}>
          <div className="section-tag">What drives us</div>
          <h2 className="section-title">Our Vision & Mission</h2>
          <p className="section-desc">
            We believe technology should serve farmers, not the other way around.
            Our goal is to make precision agriculture accessible to every greenhouse.
          </p>
        </div>

        <div className="vm-grid">
          <div className={`vm-card fade-up delay-2 ${visible ? "show" : ""}`}>
            <div className="vm-card-glow" style={{ background: "#38bdf8" }}></div>
            <div className="vm-icon" style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)" }}>🔭</div>
            <div className="vm-title">Our Vision</div>
            <div className="vm-text">
              To revolutionize greenhouse farming in India through intelligent automation,
              enabling farmers to maximize yield while minimizing water waste and crop loss.
              We envision a future where every plant gets exactly what it needs, exactly when it needs it.
            </div>
          </div>

          <div className={`vm-card fade-up delay-3 ${visible ? "show" : ""}`}>
            <div className="vm-card-glow" style={{ background: "#22c55e" }}></div>
            <div className="vm-icon" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>🎯</div>
            <div className="vm-title">Our Mission</div>
            <div className="vm-text">
              To build a real-time, AI-powered smart irrigation system using ESP32, DHT11,
              soil moisture, and NPK sensors — integrated with Google Gemini AI for plant
              disease detection — making precision agriculture affordable and accessible.
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className={`stats-row fade-up delay-4 ${visible ? "show" : ""}`}>
          {[
            { num: "6+", label: "Sensor Types" },
            { num: "100", label: "Crops Database" },
            { num: "5s", label: "Update Interval" },
            { num: "AI", label: "Gemini Vision" },
          ].map((s, i) => (
            <div className="stat-item" key={i}>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="divider"></div>

      {/* TEAM SECTION */}
      <div className="team-section">
        <div className={`fade-up delay-2 ${visible ? "show" : ""}`}>
          <div className="section-tag">The people behind it</div>
          <h2 className="section-title">Meet Our Team</h2>
          <p className="section-desc">
            Four passionate engineering students building solutions that matter.
            From hardware to AI — we do it all.
          </p>
        </div>

        <div className="team-grid">
          {teamMembers.map((member, i) => (
            <div
              key={i}
              className={`team-card fade-up delay-${i + 2} ${visible ? "show" : ""} ${activeCard === i ? "active" : ""}`}
              style={{ "--accent": member.color } as React.CSSProperties}
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
                <div className="team-photo-overlay"></div>
                <div className="team-accent-bar" style={{ background: `linear-gradient(90deg, ${member.color}, transparent)` }}></div>
              </div>

              <div className="team-info">
                <div className="team-name">{member.name}</div>
                <div className="team-role" style={{ color: member.color }}>{member.role}</div>
                <div className="team-branch">{member.branch}</div>
                <div className="team-year">{member.year}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="divider"></div>

      {/* TECH STACK */}
      <div className="project-section">
        <div className={`fade-up delay-1 ${visible ? "show" : ""}`}>
          <div className="section-tag">How we built it</div>
          <h2 className="section-title">Technology Stack</h2>
          <p className="section-desc">
            A full-stack IoT system combining embedded hardware, cloud backend, and AI.
          </p>
        </div>

        <div className="tech-grid">
          {[
            { icon: "🔧", name: "ESP32 + Sensors", desc: "DHT11, Soil Moisture, NPK Sensor, ESP32-CAM for real-time data collection and image capture." },
            { icon: "🌿", name: "NestJS Backend", desc: "Node.js powered REST API with TypeORM and SQLite database for storing sensor readings and analysis history." },
            { icon: "⚛️", name: "Next.js Frontend", desc: "React-based dashboard with real-time data visualization, live camera feed, and AI detection results." },
            { icon: "🤖", name: "Gemini AI Vision", desc: "Google Gemini 2.5 Flash analyzes plant images combined with sensor data for accurate disease detection." },
            { icon: "💧", name: "Auto Irrigation", desc: "Sensor-triggered automated irrigation system that activates based on soil moisture thresholds." },
            { icon: "📡", name: "IoT Protocol", desc: "HTTP-based communication between ESP32 and NestJS backend for reliable sensor data transmission." },
          ].map((tech, i) => (
            <div className={`tech-card fade-up delay-${i + 1} ${visible ? "show" : ""}`} key={i}>
              <div className="tech-icon">{tech.icon}</div>
              <div className="tech-name">{tech.name}</div>
              <div className="tech-desc">{tech.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="about-footer">
        AgroSense · Smart Irrigation Platform · Built with ❤️ by Engineering Students · India 🇮🇳
      </div>
    </>
  );
}
