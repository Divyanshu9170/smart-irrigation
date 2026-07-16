"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SensorData = {
  id: number;
  temperature: number;
  humidity: number;
  ph: number;
  soilMoisture: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  status?: string;
  createdAt: string;
};

type ImageHistory = {
  image: string;
  disease: string;
  time: string;
};

export default function Home() {
  const [data, setData] = useState<SensorData[]>([]);
  const [latest, setLatest] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [imgSrc, setImgSrc] = useState("https://via.placeholder.com/500x300?text=Camera+Offline");
  const [imageHistory, setImageHistory] = useState<ImageHistory[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [latestDisease, setLatestDisease] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isOnline, setIsOnline] = useState(false);
  const [camPulse, setCamPulse] = useState(false);

  // ✅ ALL EXISTING LOGIC PRESERVED
  useEffect(() => {
    const interval = setInterval(() => {
      setImgSrc(`http://10.219.43.164/capture?t=${Date.now()}`);
      setCamPulse(true);
      setTimeout(() => setCamPulse(false), 600);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const response = await fetch("https://smart-irrigation-1-mawh.onrender.com/sensor-readings");
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const sensorData = await response.json();
        if (Array.isArray(sensorData) && sensorData.length > 0) {
          setData(sensorData);
          setLatest(sensorData[0]);
          setIsOnline(true);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setIsOnline(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const response = await fetch("https://smart-irrigation-1-mawh.onrender.com/sensor-readings/images");
        if (response.ok) {
          const imageData = await response.json();
          setImages(Array.isArray(imageData) ? imageData.reverse() : []);
        }
      } catch (err) { console.log("Could not load images:", err); }
    };
    loadImages();
    const interval = setInterval(loadImages, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("https://smart-irrigation-1-mawh.onrender.com/sensor-readings/image-history");
        if (response.ok) {
          const histData = await response.json();
          if (Array.isArray(histData) && histData.length > 0) {
            setImageHistory(histData);
            setLatestDisease(histData[0].disease);
          }
        }
      } catch (err) { console.log("Could not load history:", err); }
    };
    loadHistory();
    const interval = setInterval(loadHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  const analyzeLatestImage = async () => {
    if (images.length === 0) { alert("No captured images available!"); return; }
    setAnalyzing(true);
    try {
      const imageUrl = images[0].url;
      const imgResponse = await fetch(imageUrl);
      const blob = await imgResponse.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => { const result = reader.result as string; resolve(result.split(",")[1]); };
        reader.readAsDataURL(blob);
      });
      const response = await fetch("https://smart-irrigation-1-mawh.onrender.com/sensor-readings/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: images[0].name, image: base64 }),
      });
      const result = await response.json();
      if (result.disease) { setLatestDisease(result.disease); alert("✅ Analysis complete!"); }
    } catch (err) { console.error("Analysis failed:", err); alert("❌ Analysis failed. Check console."); }
    finally { setAnalyzing(false); }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "#4ade80";
    if (status === "GOOD" || status === "NORMAL") return "#4ade80";
    if (status === "WARNING") return "#fbbf24";
    return "#f87171";
  };

  const getRecommendation = () => {
    if (!latest) return "Loading sensor data...";
    if (latest.soilMoisture < 30) return "Low soil moisture detected — Irrigation recommended";
    if (latest.temperature > 35) return "High temperature alert — Activate cooling system";
    return "All conditions optimal — No action needed";
  };

  const getRecommendationIcon = () => {
    if (!latest) return "⏳";
    if (latest.soilMoisture < 30) return "💧";
    if (latest.temperature > 35) return "🌡️";
    return "✅";
  };

  const parseDisease = (diseaseStr: string) => {
    if (!diseaseStr) return null;
    const parts: Record<string, string> = {};
    diseaseStr.split("|").forEach((part) => {
      const [key, ...rest] = part.split(":");
      if (key && rest.length > 0) parts[key.trim()] = rest.join(":").trim();
    });
    return parts;
  };

  const parsedDisease = latestDisease ? parseDisease(latestDisease) : null;

  const getSeverityColor = (severity?: string) => {
    if (!severity || severity === "None") return "#4ade80";
    if (severity === "Mild") return "#a3e635";
    if (severity === "Moderate") return "#fbbf24";
    if (severity === "Severe") return "#f87171";
    return "#94a3b8";
  };

  const getSeverityBg = (severity?: string) => {
    if (!severity || severity === "None") return "rgba(74,222,128,0.08)";
    if (severity === "Mild") return "rgba(163,230,53,0.08)";
    if (severity === "Moderate") return "rgba(251,191,36,0.08)";
    if (severity === "Severe") return "rgba(248,113,113,0.08)";
    return "rgba(148,163,184,0.08)";
  };

  const getValueStatus = (value: number, low: number, high: number) => {
    if (value < low) return { color: "#fbbf24", label: "LOW" };
    if (value > high) return { color: "#f87171", label: "HIGH" };
    return { color: "#4ade80", label: "OK" };
  };

  const clamp = (v: number, min: number, max: number) =>
    Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

  const sensors = latest ? [
    { icon: "🌡️", label: "Temperature", value: latest.temperature, unit: "°C", low: 15, high: 35 },
    { icon: "💧", label: "Humidity", value: latest.humidity, unit: "%", low: 40, high: 80 },
    { icon: "🧪", label: "pH Level", value: latest.ph, unit: "", low: 5, high: 8 },
    { icon: "🌱", label: "Soil Moisture", value: latest.soilMoisture, unit: "%", low: 30, high: 80 },
    { icon: "🔬", label: "Nitrogen", value: latest.nitrogen, unit: "mg/kg", low: 20, high: 150 },
    { icon: "⚗️", label: "Phosphorus", value: latest.phosphorus, unit: "mg/kg", low: 10, high: 100 },
    { icon: "💎", label: "Potassium", value: latest.potassium, unit: "mg/kg", low: 20, high: 200 },
  ] : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #060d1a;
          --bg2: #0a1628;
          --bg3: #0f1f38;
          --surface: rgba(255,255,255,0.03);
          --surface2: rgba(255,255,255,0.06);
          --border: rgba(255,255,255,0.07);
          --border2: rgba(255,255,255,0.12);
          --green: #4ade80;
          --green-dim: rgba(74,222,128,0.12);
          --blue: #38bdf8;
          --blue-dim: rgba(56,189,248,0.12);
          --amber: #fbbf24;
          --amber-dim: rgba(251,191,36,0.12);
          --red: #f87171;
          --red-dim: rgba(248,113,113,0.12);
          --text: #e2e8f0;
          --text2: #94a3b8;
          --text3: #475569;
          --font: 'Outfit', sans-serif;
          --mono: 'JetBrains Mono', monospace;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font); min-height: 100vh; }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 4px; }

        /* ── NAVBAR ── */
        .nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px; height: 60px;
          background: rgba(6,13,26,0.92);
          backdrop-filter: blur(24px) saturate(160%);
          border-bottom: 1px solid var(--border);
        }
        .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; box-shadow: 0 0 16px rgba(34,197,94,0.3);
        }
        .nav-name { font-weight: 700; font-size: 16px; color: #f0fdf4; letter-spacing: -0.3px; }
        .nav-name span { color: var(--green); }
        .nav-links { display: flex; gap: 2px; }
        .nav-a {
          text-decoration: none; color: var(--text2); font-size: 13.5px; font-weight: 500;
          padding: 6px 13px; border-radius: 7px; transition: all 0.18s;
        }
        .nav-a:hover { color: var(--text); background: var(--surface2); }
        .nav-a.on { color: var(--green); background: var(--green-dim); }
        .nav-right { display: flex; align-items: center; gap: 10px; }
        .nav-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 100px;
          background: var(--surface); border: 1px solid var(--border);
          font-size: 12px; color: var(--text3);
        }
        .pulse {
          width: 6px; height: 6px; border-radius: 50%;
          animation: blink 2s infinite;
        }
        .pulse.on { background: var(--green); box-shadow: 0 0 6px var(--green); }
        .pulse.off { background: var(--red); box-shadow: 0 0 6px var(--red); }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* ── HERO ── */
        .hero {
          position: relative; overflow: hidden;
          padding: 72px 32px 56px; text-align: center;
        }
        .hero::before {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 50% -5%, rgba(34,197,94,0.1) 0%, transparent 65%),
            radial-gradient(ellipse 40% 40% at 20% 80%, rgba(56,189,248,0.05) 0%, transparent 60%);
          pointer-events: none;
        }
        .hero-tag {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 14px; border-radius: 100px; margin-bottom: 22px;
          background: var(--green-dim); border: 1px solid rgba(74,222,128,0.2);
          font-size: 11.5px; font-weight: 600; color: var(--green);
          letter-spacing: 0.6px; text-transform: uppercase;
        }
        .hero-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: blink 1.5s infinite; }
        .hero-h1 {
          font-size: clamp(36px, 5.5vw, 64px); font-weight: 800;
          line-height: 1.08; letter-spacing: -2px; margin-bottom: 18px;
          background: linear-gradient(160deg, #f0fdf4 0%, #86efac 40%, #22c55e 75%, #15803d 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          font-size: 16px; color: var(--text3); max-width: 540px;
          margin: 0 auto 32px; line-height: 1.75; font-weight: 400;
        }
        .hero-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 52px; }
        .cta-main {
          padding: 13px 30px; border-radius: 10px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #fff; font-size: 14px; font-weight: 600; font-family: var(--font);
          box-shadow: 0 4px 24px rgba(34,197,94,0.35); transition: all 0.2s;
        }
        .cta-main:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(34,197,94,0.45); }
        .cta-sec {
          padding: 13px 30px; border-radius: 10px; cursor: pointer;
          background: var(--surface); border: 1px solid var(--border2);
          color: var(--text2); font-size: 14px; font-weight: 500; font-family: var(--font);
          transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center;
        }
        .cta-sec:hover { background: var(--surface2); color: var(--text); }

        .hero-kpis { display: flex; gap: 0; justify-content: center; }
        .kpi {
          padding: 20px 36px; text-align: center;
          border-left: 1px solid var(--border);
        }
        .kpi:first-child { border-left: none; }
        .kpi-val { font-size: 26px; font-weight: 800; color: var(--green); font-family: var(--mono); }
        .kpi-lbl { font-size: 11px; color: var(--text3); margin-top: 3px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

        /* ── LAYOUT ── */
        .wrap { padding: 28px 32px 48px; max-width: 1440px; margin: 0 auto; }

        .sec-head {
          display: flex; align-items: center; gap: 10px;
          margin: 32px 0 16px;
        }
        .sec-head-line { flex: 1; height: 1px; background: var(--border); }
        .sec-head-txt {
          font-size: 10.5px; font-weight: 700; color: var(--text3);
          text-transform: uppercase; letter-spacing: 1.2px; white-space: nowrap;
        }

        /* ── SENSOR STRIP ── */
        .sensor-strip {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;
          margin-bottom: 24px;
        }
        @media(max-width:1100px){ .sensor-strip{ grid-template-columns: repeat(4,1fr); } }
        @media(max-width:600px){ .sensor-strip{ grid-template-columns: repeat(2,1fr); } }

        .s-card {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 14px; padding: 16px 14px;
          position: relative; overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .s-card:hover { border-color: var(--border2); transform: translateY(-3px); }
        .s-card::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
          border-radius: 0 0 14px 14px;
          background: var(--accent-color, var(--green));
          opacity: 0.6;
        }
        .s-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .s-icon { font-size: 18px; }
        .s-badge {
          font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 100px;
          font-family: var(--mono); letter-spacing: 0.3px;
        }
        .s-lbl { font-size: 10px; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .s-val { font-size: 20px; font-weight: 800; font-family: var(--mono); margin-bottom: 10px; }
        .s-bar { height: 3px; background: var(--border); border-radius: 10px; overflow: hidden; }
        .s-fill { height: 100%; border-radius: 10px; transition: width 0.8s ease; }

        /* ── MAIN GRID ── */
        .mg { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        @media(max-width:900px){ .mg{ grid-template-columns:1fr; } }

        /* ── CARD ── */
        .c {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 16px; padding: 20px;
          transition: border-color 0.2s;
        }
        .c:hover { border-color: var(--border2); }
        .c-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .c-title {
          font-size: 11px; font-weight: 700; color: var(--text3);
          text-transform: uppercase; letter-spacing: 1px;
          display: flex; align-items: center; gap: 8px;
        }
        .c-dot { width: 5px; height: 5px; border-radius: 50%; }

        /* ── CAMERA ── */
        .cam-wrap { position: relative; border-radius: 12px; overflow: hidden; background: #000; aspect-ratio: 16/9; }
        .cam-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: opacity 0.3s; }
        .cam-badge {
          position: absolute; top: 12px; left: 12px;
          display: flex; align-items: center; gap: 6px;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
          border: 1px solid rgba(248,113,113,0.3);
          padding: 5px 12px; border-radius: 100px;
          font-size: 10px; color: #fca5a5; font-weight: 700; letter-spacing: 1px;
        }
        .live-dot { width: 5px; height: 5px; border-radius: 50%; background: #f87171; animation: blink 1.2s infinite; }
        @keyframes cam-flash { 0%,100%{opacity:1} 50%{opacity:0.75} }
        .cam-flash { animation: cam-flash 0.5s ease; }

        /* ── IMAGE GRID ── */
        .img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
        .img-thumb { border-radius: 9px; overflow: hidden; aspect-ratio: 1; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; }
        .img-thumb:hover { transform: scale(1.04); border-color: var(--border2); }
        .img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .img-skel { border-radius: 9px; aspect-ratio: 1; background: linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* ── ANALYZE BTN ── */
        .analyze-btn {
          padding: 9px 18px; border-radius: 9px; border: none; cursor: pointer;
          font-size: 12.5px; font-weight: 600; font-family: var(--font);
          display: flex; align-items: center; gap: 6px;
          transition: all 0.2s;
        }
        .analyze-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .analyze-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── INTEL CARD ── */
        .intel-status {
          font-size: 30px; font-weight: 800; font-family: var(--mono);
          letter-spacing: -0.5px; margin-bottom: 4px;
        }
        .intel-sub { font-size: 11px; color: var(--text3); margin-bottom: 14px; }
        .intel-rec {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 13px 15px; border-radius: 10px;
          background: var(--surface); border: 1px solid var(--border);
          font-size: 13px; color: var(--text2); line-height: 1.55;
        }
        .intel-rec-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }

        /* ── CONTROLS ── */
        .ctrl-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .ctrl-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 16px; border-radius: 10px; cursor: pointer;
          border: 1px solid var(--border); background: var(--surface);
          color: var(--text2); font-size: 13px; font-weight: 500; font-family: var(--font);
          transition: all 0.2s;
        }
        .ctrl-btn:hover { background: var(--surface2); color: var(--text); border-color: var(--border2); transform: translateY(-1px); }

        /* ── AI SECTION ── */
        .ai-banner {
          border-radius: 12px; padding: 16px 18px; margin-bottom: 14px;
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 10px;
        }
        .ai-name { font-size: 18px; font-weight: 800; }
        .ai-sev { padding: 4px 14px; border-radius: 100px; font-size: 11px; font-weight: 700; font-family: var(--mono); letter-spacing: 0.5px; }
        .ai-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media(max-width:500px){ .ai-grid{ grid-template-columns:1fr; } }
        .ai-c { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
        .ai-c-lbl { font-size: 9.5px; color: var(--text3); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 7px; display: flex; align-items: center; gap: 5px; }
        .ai-c-txt { font-size: 13px; color: var(--text2); line-height: 1.6; }
        .ai-empty { text-align: center; padding: 40px 20px; color: var(--text3); }
        .ai-empty-icon { font-size: 44px; margin-bottom: 12px; filter: grayscale(0.3); }

        /* ── BOTTOM GRID ── */
        .bg2 { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; margin-top: 18px; }
        @media(max-width:900px){ .bg2{ grid-template-columns:1fr; } }

        /* ── HISTORY ROW ── */
        .h-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 9px;
          background: var(--surface); border: 1px solid var(--border);
          margin-bottom: 7px; font-size: 12.5px; color: var(--text2);
          transition: border-color 0.2s;
        }
        .h-row:hover { border-color: var(--border2); }
        .h-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .h-val { font-family: var(--mono); font-size: 12px; }
        .h-tag {
          margin-left: auto; font-size: 9px; font-weight: 700;
          padding: 2px 8px; border-radius: 100px; font-family: var(--mono);
        }

        /* ── AI LOG ROW ── */
        .al-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 9px;
          background: var(--surface); border: 1px solid var(--border);
          margin-bottom: 7px; transition: border-color 0.2s;
          border-left-width: 3px;
        }
        .al-row:hover { border-color: var(--border2); }
        .al-name { font-size: 13px; color: var(--text); font-weight: 600; margin-bottom: 2px; }
        .al-time { font-size: 11px; color: var(--text3); }
        .al-badge { margin-left: auto; font-size: 9px; font-weight: 700; padding: 2px 9px; border-radius: 100px; font-family: var(--mono); white-space: nowrap; }

        /* ── ERROR ── */
        .err { background: var(--red-dim); border: 1px solid rgba(248,113,113,0.2); color: #fca5a5; padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 13px; display: flex; align-items: center; gap: 8px; }

        /* ── FOOTER ── */
        .foot { text-align: center; padding: 28px 0 16px; font-size: 11px; color: var(--text3); border-top: 1px solid var(--border); margin-top: 8px; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-icon">🌾</div>
          <span className="nav-name">Agro<span>Sense</span></span>
        </div>
        <div className="nav-links">
          <Link href="/" className="nav-a on">Dashboard</Link>
          <Link href="/about" className="nav-a">About</Link>
          <Link href="/crop" className="nav-a">Crops</Link>
          <Link href="/contact" className="nav-a">Contact</Link>
          <Link href="/login" className="nav-a">Login</Link>
        </div>
        <div className="nav-right">
          <div className="nav-pill">
            <div className={`pulse ${isOnline ? "on" : "off"}`}></div>
            {isOnline ? `Live · ${lastUpdated}` : "Offline"}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero">
        <div className="hero-tag"><span className="hero-dot"></span>IoT · AI · Precision Agriculture</div>
        <h1 className="hero-h1">Smart Irrigation<br />Control System</h1>
        <p className="hero-sub">
          Real-time greenhouse monitoring with AI-powered plant disease detection,
          automated sensor analysis, and intelligent irrigation management.
        </p>
        <div className="hero-ctas">
          <button className="cta-main" onClick={() => document.getElementById("dash")?.scrollIntoView({ behavior: "smooth" })}>
            Open Dashboard ↓
          </button>
          <Link href="/crop" className="cta-sec">Browse 100 Crops →</Link>
        </div>
        <div className="hero-kpis">
          {[
            { val: "7", lbl: "Live Sensors" },
            { val: "AI", lbl: "Gemini Vision" },
            { val: "5s", lbl: "Refresh Rate" },
            { val: "100", lbl: "Crop Database" },
          ].map((k) => (
            <div className="kpi" key={k.lbl}>
              <div className="kpi-val">{k.val}</div>
              <div className="kpi-lbl">{k.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD ── */}
      <div className="wrap" id="dash">

        {error && <div className="err">⚠️ {error}</div>}

        {/* SENSOR STRIP */}
        <div className="sec-head">
          <span className="sec-head-txt">Live Sensor Readings</span>
          <div className="sec-head-line"></div>
        </div>

        <div className="sensor-strip">
          {!latest
            ? [...Array(7)].map((_, i) => (
              <div key={i} style={{ height: 110, borderRadius: 14, background: "var(--bg2)", border: "1px solid var(--border)", backgroundImage: "linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }}></div>
            ))
            : sensors.map((s) => {
              const st = getValueStatus(s.value, s.low, s.high);
              const pct = clamp(s.value, s.low, s.high);
              return (
                <div className="s-card" key={s.label} style={{ "--accent-color": st.color } as React.CSSProperties}>
                  <div className="s-top">
                    <span className="s-icon">{s.icon}</span>
                    <span className="s-badge" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="s-lbl">{s.label}</div>
                  <div className="s-val" style={{ color: st.color }}>{s.value}<span style={{ fontSize: 11, fontWeight: 500, color: "var(--text3)", marginLeft: 3 }}>{s.unit}</span></div>
                  <div className="s-bar"><div className="s-fill" style={{ width: `${pct}%`, background: st.color }}></div></div>
                </div>
              );
            })
          }
        </div>

        {/* MAIN GRID */}
        <div className="sec-head">
          <span className="sec-head-txt">Field Monitoring</span>
          <div className="sec-head-line"></div>
        </div>

        <div className="mg">
          {/* LEFT COL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* FARM INTELLIGENCE */}
            <div className="c">
              <div className="c-head">
                <div className="c-title"><div className="c-dot" style={{ background: "var(--green)" }}></div>Farm Intelligence</div>
                <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>AUTO</span>
              </div>
              {latest ? (
                <>
                  <div className="intel-status" style={{ color: getStatusColor(latest.status) }}>{latest.status || "NORMAL"}</div>
                  <div className="intel-sub">Current system risk level</div>
                  <div className="intel-rec">
                    <span className="intel-rec-icon">{getRecommendationIcon()}</span>
                    <span>{getRecommendation()}</span>
                  </div>
                </>
              ) : (
                <div style={{ height: 80, borderRadius: 10, background: "var(--surface)", animation: "shimmer 1.4s infinite", backgroundImage: "linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%)", backgroundSize: "200% 100%" }}></div>
              )}
            </div>

            {/* MANUAL CONTROLS */}
            <div className="c">
              <div className="c-head">
                <div className="c-title"><div className="c-dot" style={{ background: "var(--amber)" }}></div>Manual Controls</div>
              </div>
              <div className="ctrl-row">
                <button className="ctrl-btn">💧 Irrigation</button>
                <button className="ctrl-btn">❄️ Cooling</button>
                <button className="ctrl-btn">🌿 Fertilizer</button>
              </div>
            </div>

            {/* CAPTURED IMAGES */}
            <div className="c">
              <div className="c-head">
                <div className="c-title"><div className="c-dot" style={{ background: "#a78bfa" }}></div>Captured Images</div>
                <button
                  className="analyze-btn"
                  onClick={analyzeLatestImage}
                  disabled={analyzing || images.length === 0}
                  style={{
                    background: analyzing ? "var(--surface)" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                    color: analyzing ? "var(--text3)" : "#fff",
                    boxShadow: analyzing ? "none" : "0 3px 14px rgba(124,58,237,0.35)",
                  }}
                >
                  {analyzing ? "⏳ Analyzing..." : "🤖 Analyze with AI"}
                </button>
              </div>
              <div className="img-grid">
                {images.length === 0
                  ? [...Array(6)].map((_, i) => <div key={i} className="img-skel"></div>)
                  : images.slice(0, 6).map((img, i) => (
                    <div className="img-thumb" key={i}>
                      <img src={img.url} alt={`Capture ${i + 1}`} />
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* RIGHT COL — CAMERA */}
          <div className="c" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div className="c-head">
              <div className="c-title"><div className="c-dot" style={{ background: "var(--red)" }}></div>Live Farm Camera</div>
              <span style={{ fontSize: 10, color: "var(--red)", fontFamily: "var(--mono)", fontWeight: 700 }}>● LIVE</span>
            </div>
            <div className="cam-wrap">
              <img
                src={imgSrc}
                alt="Live camera"
                className={`cam-img ${camPulse ? "cam-flash" : ""}`}
                onError={() => setImgSrc("https://via.placeholder.com/640x360?text=Camera+Offline")}
              />
              <div className="cam-badge"><span className="live-dot"></span>LIVE MONITORING</div>
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Field Zone", value: "Zone A-1" },
                { label: "Capture Rate", value: "5s interval" },
                { label: "Resolution", value: "HD Feed" },
                { label: "AI Status", value: latestDisease ? "Analyzed" : "Pending" },
              ].map((m) => (
                <div key={m.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9.5, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--mono)", fontWeight: 500 }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI DISEASE SECTION */}
        <div className="sec-head">
          <span className="sec-head-txt">AI Plant Analysis · Gemini Vision</span>
          <div className="sec-head-line"></div>
        </div>

        <div className="c" style={{ marginBottom: 0 }}>
          {parsedDisease ? (
            <>
              <div
                className="ai-banner"
                style={{ background: getSeverityBg(parsedDisease.Severity), border: `1px solid ${getSeverityColor(parsedDisease.Severity)}28` }}
              >
                <div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Diagnosis Result</div>
                  <div className="ai-name" style={{ color: getSeverityColor(parsedDisease.Severity) }}>
                    {parsedDisease.Severity === "None" ? "✅ Plant is Healthy" : `⚠️ ${parsedDisease.Disease}`}
                  </div>
                </div>
                <span
                  className="ai-sev"
                  style={{ background: `${getSeverityColor(parsedDisease.Severity)}18`, color: getSeverityColor(parsedDisease.Severity), border: `1px solid ${getSeverityColor(parsedDisease.Severity)}40` }}
                >
                  {parsedDisease.Severity || "NONE"}
                </span>
              </div>
              <div className="ai-grid">
                <div className="ai-c">
                  <div className="ai-c-lbl">💊 Treatment Protocol</div>
                  <div className="ai-c-txt">{parsedDisease.Treatment}</div>
                </div>
                <div className="ai-c">
                  <div className="ai-c-lbl">🛡️ Prevention Measures</div>
                  <div className="ai-c-txt">{parsedDisease.Prevention}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="ai-empty">
              <div className="ai-empty-icon">🌿</div>
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 6 }}>No analysis performed yet</div>
              <div style={{ fontSize: 12 }}>Click <strong style={{ color: "#a78bfa" }}>Analyze with AI</strong> above to detect plant diseases</div>
            </div>
          )}
        </div>

        {/* BOTTOM GRID */}
        <div className="bg2">
          {/* SENSOR HISTORY */}
          <div className="c">
            <div className="c-head">
              <div className="c-title"><div className="c-dot" style={{ background: "var(--text3)" }}></div>Recent Sensor Records</div>
            </div>
            {data.slice(0, 5).map((item) => {
              const sc = getStatusColor(item.status);
              return (
                <div className="h-row" key={item.id}>
                  <div className="h-dot" style={{ background: sc }}></div>
                  <span className="h-val">🌡 {item.temperature}°C</span>
                  <span className="h-val">💧 {item.humidity}%</span>
                  <span className="h-val">🌱 {item.soilMoisture}%</span>
                  <div className="h-tag" style={{ background: `${sc}18`, color: sc }}>{item.status || "NORMAL"}</div>
                </div>
              );
            })}
          </div>

          {/* AI LOG */}
          <div className="c">
            <div className="c-head">
              <div className="c-title"><div className="c-dot" style={{ background: "#a78bfa" }}></div>AI Analysis Log</div>
            </div>
            {imageHistory.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "24px 0" }}>No analyses yet</div>
            ) : (
              imageHistory.slice(0, 5).map((item, i) => {
                const parsed = parseDisease(item.disease);
                const sc = getSeverityColor(parsed?.Severity);
                return (
                  <div className="al-row" key={i} style={{ borderLeftColor: sc }}>
                    <div style={{ flex: 1 }}>
                      <div className="al-name">{parsed?.Severity === "None" ? "✅" : "⚠️"} {parsed?.Disease || "Unknown"}</div>
                      <div className="al-time">{new Date(item.time).toLocaleString()}</div>
                    </div>
                    <span className="al-badge" style={{ background: `${sc}18`, color: sc }}>{parsed?.Severity || "N/A"}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="foot">
          AgroSense Smart Irrigation Platform · Next.js + NestJS + Gemini AI · India 🇮🇳
        </div>
      </div>
    </>
  );
}
