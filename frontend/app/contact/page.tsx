"use client";

import { useState } from "react";
import Link from "next/link";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const response = await fetch("https://smart-irrigation-1-mawh.onrender.com/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    setSent(true);

    // Clear the form after successful submission
    setForm({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
  } catch (error) {
    console.error(error);
    alert("Failed to send message. Please try again.");
  } finally {
    setLoading(false);
  }
};
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050c1a; font-family: 'DM Sans', sans-serif; color: #e2e8f0; }

        .navbar {
          position: sticky; top: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 32px;
          background: rgba(5,12,26,0.85);
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

        .contact-hero {
          padding: 72px 32px 56px;
          text-align: center;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(56,189,248,0.07) 0%, transparent 70%);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .contact-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(56,189,248,0.08); border: 1px solid rgba(56,189,248,0.2);
          color: #38bdf8; font-size: 12px; font-weight: 500;
          padding: 5px 16px; border-radius: 100px; margin-bottom: 20px;
          letter-spacing: 0.5px;
        }
        .contact-title {
          font-family: 'Syne', sans-serif; font-size: clamp(32px, 5vw, 52px);
          font-weight: 800; line-height: 1.1; letter-spacing: -1px;
          background: linear-gradient(135deg, #f0f9ff 0%, #7dd3fc 60%, #22c55e 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 14px;
        }
        .contact-sub {
          font-size: 15px; color: #64748b; max-width: 500px;
          margin: 0 auto; line-height: 1.8;
        }

        .main { padding: 56px 32px; max-width: 1100px; margin: 0 auto; }
        .contact-grid {
          display: grid; grid-template-columns: 1fr 1.6fr; gap: 28px;
        }
        @media(max-width: 800px) { .contact-grid { grid-template-columns: 1fr; } }

        /* LEFT INFO */
        .info-card {
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 32px;
          height: fit-content;
        }
        .info-section-tag {
          font-size: 11px; font-weight: 600; letter-spacing: 2px;
          text-transform: uppercase; color: #38bdf8; margin-bottom: 10px;
        }
        .info-title {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700;
          color: #f0f9ff; margin-bottom: 8px;
        }
        .info-desc { font-size: 13px; color: #475569; line-height: 1.7; margin-bottom: 32px; }

        .contact-item {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px; border-radius: 12px;
          background: rgba(5,12,26,0.5);
          border: 1px solid rgba(255,255,255,0.04);
          margin-bottom: 12px;
          transition: border-color 0.2s;
          text-decoration: none;
        }
        .contact-item:hover { border-color: rgba(56,189,248,0.2); }
        .contact-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .contact-info-label {
          font-size: 11px; color: #475569; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
        }
        .contact-info-value {
          font-size: 14px; color: #e2e8f0; font-weight: 500;
        }
        .contact-info-sub { font-size: 12px; color: #334155; margin-top: 2px; }

        .divider { height: 1px; background: rgba(255,255,255,0.04); margin: 24px 0; }

        .social-row { display: flex; gap: 10px; margin-top: 4px; }
        .social-btn {
          padding: 8px 16px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #64748b; font-size: 13px; font-weight: 500;
          text-decoration: none; transition: all 0.2s;
          display: flex; align-items: center; gap: 6px;
        }
        .social-btn:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }

        /* RIGHT FORM */
        .form-card {
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 32px;
        }
        .form-title {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700;
          color: #f0f9ff; margin-bottom: 6px;
        }
        .form-sub { font-size: 13px; color: #475569; margin-bottom: 28px; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media(max-width: 500px) { .form-row { grid-template-columns: 1fr; } }

        .form-group { margin-bottom: 16px; }
        .form-label {
          display: block; font-size: 11px; font-weight: 600;
          color: #64748b; letter-spacing: 0.5px; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .form-input {
          width: 100%; padding: 13px 16px;
          background: rgba(5,12,26,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; color: #e2e8f0;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none; transition: all 0.2s;
        }
        .form-input:focus {
          border-color: rgba(56,189,248,0.4);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.06);
        }
        .form-input::placeholder { color: #334155; }
        textarea.form-input {
          resize: vertical; min-height: 130px; line-height: 1.6;
        }

        .submit-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #0ea5e9, #0284c7);
          border: none; border-radius: 12px;
          color: white; font-size: 15px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(14,165,233,0.25);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 4px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(14,165,233,0.35);
        }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .success-box {
          text-align: center; padding: 48px 24px;
        }
        .success-icon { font-size: 56px; margin-bottom: 16px; }
        .success-title {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700;
          color: #22c55e; margin-bottom: 8px;
        }
        .success-sub { font-size: 14px; color: #475569; line-height: 1.7; }
        .success-back {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 20px; padding: 10px 24px;
          background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2);
          color: #22c55e; border-radius: 10px; text-decoration: none;
          font-size: 14px; font-weight: 600; transition: all 0.2s;
        }
        .success-back:hover { background: rgba(34,197,94,0.15); }

        .footer {
          text-align: center; padding: 32px;
          border-top: 1px solid rgba(255,255,255,0.04);
          font-size: 12px; color: #1e293b; margin-top: 32px;
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
          <Link href="/about" className="nav-link">About</Link>
          <Link href="/crop" className="nav-link">Crops</Link>
          <Link href="/contact" className="nav-link active">Contact</Link>
          <Link href="/login" className="nav-link">Login</Link>
        </div>
      </nav>

      {/* HERO */}
      <div className="contact-hero">
        <div className="contact-badge">📬 Get in touch</div>
        <h1 className="contact-title">Contact Us</h1>
        <p className="contact-sub">
          Have a question about AgroSense? Want to collaborate or report an issue?
          We would love to hear from you.
        </p>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="contact-grid">

          {/* LEFT — CONTACT INFO */}
          <div className="info-card">
            <div className="info-section-tag">Contact Details</div>
            <div className="info-title">Divyanshu Kumawat</div>
            <div className="info-desc">
              Project Lead &amp; Hardware Engineer at AgroSense.
              Feel free to reach out for any queries, collaborations, or feedback.
            </div>

            {/* EMAIL */}
            <a href="mailto:divyanshukumawat9170@gmail.com" className="contact-item">
              <div className="contact-icon" style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.15)" }}>
                📧
              </div>
              <div>
                <div className="contact-info-label">Email Address</div>
                <div className="contact-info-value">divyanshukumawat9170@gmail.com</div>
                <div className="contact-info-sub">Click to send email</div>
              </div>
            </a>

            {/* PHONE */}
            <a href="tel:+919875849170" className="contact-item">
              <div className="contact-icon" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.15)" }}>
                📱
              </div>
              <div>
                <div className="contact-info-label">Phone Number</div>
                <div className="contact-info-value">+91 98758 49170</div>
                <div className="contact-info-sub">Mon - Sat, 10am to 6pm IST</div>
              </div>
            </a>

            {/* LOCATION */}
            <div className="contact-item" style={{ cursor: "default" }}>
              <div className="contact-icon" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.15)" }}>
                📍
              </div>
              <div>
                <div className="contact-info-label">Location</div>
                <div className="contact-info-value">Rajasthan, India</div>
                <div className="contact-info-sub">SKIT College of Engineering</div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="contact-info-label" style={{ marginBottom: 12 }}>Project Links</div>
            <div className="social-row">
              <a href="#" className="social-btn">🐙 GitHub</a>
              <a href="#" className="social-btn">💼 LinkedIn</a>
            </div>
          </div>

          {/* RIGHT — FORM */}
          <div className="form-card">
            {sent ? (
              <div className="success-box">
                <div className="success-icon">✅</div>
                <div className="success-title">Message Sent!</div>
                <div className="success-sub">
                  Thank you for reaching out. Divyanshu will get back to you
                  within 24 hours at your email address.
                </div>
                <a href="/" className="success-back">← Back to Dashboard</a>
              </div>
            ) : (
              <>
                <div className="form-title">Send a Message</div>
                <div className="form-sub">Fill in the form below and we will get back to you shortly.</div>

                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Your Name</label>
                      <input
                        type="text"
                        name="name"
                        className="form-input"
                        placeholder="Full name"
                        value={form.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Your Email</label>
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
                    <label className="form-label">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      className="form-input"
                      placeholder="What is this about?"
                      value={form.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea
                      name="message"
                      className="form-input"
                      placeholder="Write your message here..."
                      value={form.message}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? (
                      <><div className="spinner"></div> Sending...</>
                    ) : (
                      "Send Message →"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="footer">
        AgroSense · Smart Irrigation Platform · Built with ❤️ by Engineering Students · India 🇮🇳
      </div>
    </>
  );
}
