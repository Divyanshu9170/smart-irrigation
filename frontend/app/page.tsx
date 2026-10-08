"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./lib/auth-context";
import { apiFetch, API_BASE_URL, getToken } from "./lib/api";

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

// 🤖 Feature 6 — shape returned by POST /ai/analyze
type AiAnalysisResult = {
  disease: string;
  confidence: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  recommendation: string;
  fertilizerSuggestion: string;
  wateringSuggestion: string;
  imageUrl?: string;
};

type ImageHistory = {
  image: string;
  disease: string;
  time: string;
};

// 🔌 Feature 5 — device shape returned by GET /devices, needed for pump control
type DeviceType = {
  id: number;
  deviceId: string;
  name: string;
  location: string;
  mode: string;
  pumpStatus: string;
};

export default function Home() {
  const router = useRouter();
  const { token, user, loading: authLoading, logout } = useAuth();
  const [data, setData] = useState<SensorData[]>([]);
  const [latest, setLatest] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [imgSrc, setImgSrc] = useState("");
  const [imageHistory, setImageHistory] = useState<ImageHistory[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [latestDisease, setLatestDisease] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isOnline, setIsOnline] = useState(false);
  const [camPulse, setCamPulse] = useState(false);
  // 🔌 Feature 5 — this user's devices (for pump status) + loading flag
  const [devices, setDevices] = useState<DeviceType[]>([]);
  const [pumpLoading, setPumpLoading] = useState(false);

  // 🔌 NEW — 6-relay manual control state
  const [relayStatus, setRelayStatus] = useState<Record<string, string> | null>(null);
  const [relayHistory, setRelayHistory] = useState<{ id: number; action: string; createdAt: string }[]>([]);
  const [relayLoadingKey, setRelayLoadingKey] = useState<string | null>(null);
  const [relayError, setRelayError] = useState<string | null>(null);

  // 🤖 Feature 6 — local file upload AI analysis (separate from the
  // existing camera-based analyzeLatestImage() flow below, which is
  // left completely untouched)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiUploadHistory, setAiUploadHistory] = useState<AiAnalysisResult[]>([]);

  // 🔒 Feature 4: dashboard now requires a logged-in user. Wait for the
  // AuthProvider's initial localStorage check before deciding to redirect,
  // so a real logged-in user isn't bounced during the first render.
  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [authLoading, token, router]);

  // ✅ ALL EXISTING LOGIC PRESERVED
  const CAMERA_URL = "http://10.97.53.164";

  // 📷 Live camera — ESP32-CAM only exposes /capture (no /stream).
  // Sequential preload pattern: fetch the next frame into an off-DOM
  // Image() first, and only swap imgSrc (and mark online/pulse) once
  // that fetch has actually succeeded — so the visible <img> is never
  // replaced with a half-loaded or broken request. On error, wait and
  // retry. Each cycle schedules the next one itself (no setInterval),
  // so a slow ESP32 response can never overlap with a new request.
  const cameraActiveRef = useRef(true);
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestNextImage = () => {
    const image = new window.Image();
    const imageUrl = `${CAMERA_URL}/capture?t=${Date.now()}`;

    image.onload = () => {
      if (!cameraActiveRef.current) return;
      setImgSrc(imageUrl);
      setIsOnline(true);
      setCamPulse(true);
      setTimeout(() => setCamPulse(false), 600);
      cameraTimeoutRef.current = setTimeout(() => {
        if (cameraActiveRef.current) requestNextImage();
      }, 1000);
    };

    image.onerror = () => {
      if (!cameraActiveRef.current) return;
      setIsOnline(false);
      cameraTimeoutRef.current = setTimeout(() => {
        if (cameraActiveRef.current) requestNextImage();
      }, 2000);
    };

    image.src = imageUrl;
  };

  useEffect(() => {
    cameraActiveRef.current = true;
    requestNextImage();
    return () => {
      // 🧹 Stop the recursive retry loop and clear any pending timer
      cameraActiveRef.current = false;
      if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!token) return; // 🔒 /sensor-readings now requires auth — wait for login
    const loadData = async () => {
      try {
        setError(null);
        const response = await apiFetch("/sensor-readings");
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
  }, [token]);

  // 🔌 Feature 5 — load this user's devices (needed to show/toggle pump status)
  useEffect(() => {
    if (!token) return;
    const loadDevices = async () => {
      try {
        const response = await apiFetch("/devices");
        if (response.ok) {
          const deviceData = await response.json();
          if (Array.isArray(deviceData)) setDevices(deviceData);
        }
      } catch (err) { console.log("Could not load devices:", err); }
    };
    loadDevices();
    const interval = setInterval(loadDevices, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // 🔌 Feature 5 — toggle the pump on the user's first device
  const togglePump = async () => {
    const device = devices[0];
    if (!device) {
      alert("No device found. Add a device to your account first.");
      return;
    }
    setPumpLoading(true);
    try {
      const newStatus = device.pumpStatus === "ON" ? "OFF" : "ON";
      const response = await apiFetch(`/devices/${device.id}/pump`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const updated = await response.json();
      setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      console.error("Pump toggle failed:", err);
      alert("❌ Could not update pump status.");
    } finally {
      setPumpLoading(false);
    }
  };

  // 🔌 NEW — fetch this device's 6 relay states on load + poll every 5s
  useEffect(() => {
    const deviceId = devices[0]?.id;
    if (!deviceId) return;
    let cancelled = false;

    const loadRelayStatus = async () => {
      try {
        const response = await apiFetch(`/devices/${deviceId}/relay`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!cancelled) {
          setRelayStatus(data);
          setRelayError(null);
        }
      } catch (err) {
        if (!cancelled) setRelayError("Could not load relay status.");
      }
    };

    loadRelayStatus();
    const interval = setInterval(loadRelayStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [devices]);

  // 📜 NEW — relay history (item 9), reusing the existing
  // GET /auto-actions/:deviceId endpoint. Same polling cadence as
  // relay status, kept as a separate effect so a history-fetch failure
  // never blocks the relay toggle UI itself.
  const loadRelayHistory = async () => {
    const deviceId = devices[0]?.id;
    if (!deviceId) return;
    try {
      const response = await apiFetch(`/auto-actions/${deviceId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data)) setRelayHistory(data);
    } catch (err) {
      console.log("Could not load relay history:", err);
    }
  };

  useEffect(() => {
    const deviceId = devices[0]?.id;
    if (!deviceId) return;
    loadRelayHistory();
    const interval = setInterval(loadRelayHistory, 8000);
    return () => clearInterval(interval);
  }, [devices]);

  // 🔌 NEW — toggle a single relay. Prevents double-clicks (button is
  // disabled while loading), and restores the previous state + shows an
  // error message if the backend call fails, instead of falsely showing ON.
  const toggleRelay = async (relayName: string) => {
    const deviceId = devices[0]?.id;
    if (!deviceId) return;

    const previousStatus = relayStatus?.[relayName] ?? "OFF";
    const newStatus = previousStatus === "ON" ? "OFF" : "ON";

    setRelayLoadingKey(relayName);
    setRelayError(null);
    try {
      const response = await apiFetch(`/devices/${deviceId}/relay`, {
        method: "POST",
        body: JSON.stringify({ relay: relayName, status: newStatus }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const updated = await response.json();
      setRelayStatus(updated);
      loadRelayHistory(); // ✅ NEW — reflect this action in history immediately
    } catch (err) {
      console.error(`Relay toggle failed for ${relayName}:`, err);
      // ⚠️ Restore previous state — never leave the UI showing ON if the
      // backend call actually failed.
      setRelayStatus((prev) => (prev ? { ...prev, [relayName]: previousStatus } : prev));
      setRelayError(`Could not update ${relayName}. Please try again.`);
    } finally {
      setRelayLoadingKey(null);
    }
  };

  // 🤖 Feature 6 — upload a locally-selected image to POST /ai/analyze
  const analyzeUploadedImage = async (file: File) => {
    setAiAnalyzing(true);
    setAiError(null);
    setAiResult(null);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const authToken = getToken();
      const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
        method: "POST",
        // ⚠️ Do NOT set Content-Type here — the browser needs to set
        // the multipart/form-data boundary itself.
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${response.status}`);
      }

      const result: AiAnalysisResult = await response.json();
      setAiResult(result);
      setAiUploadHistory((prev) => [result, ...prev].slice(0, 5));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setAiAnalyzing(false);
      setAiModalOpen(true);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so selecting the same file again still triggers onChange
    if (file) analyzeUploadedImage(file);
  };

  useEffect(() => {
    const loadImages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sensor-readings/images`);
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
        const response = await fetch(`${API_BASE_URL}/sensor-readings/image-history`);
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
      const response = await fetch(`${API_BASE_URL}/sensor-readings/upload-image`, {
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
          --bg: #05090f;
          --bg2: #0a121d;
          --bg3: #0e1826;
          --surface: rgba(255,255,255,0.035);
          --surface2: rgba(255,255,255,0.065);
          --border: rgba(255,255,255,0.08);
          --border2: rgba(255,255,255,0.14);
          --green: #34d399;
          --green-dim: rgba(52,211,153,0.12);
          --teal: #2dd4bf;
          --teal-dim: rgba(45,212,191,0.12);
          --amber: #fbbf24;
          --amber-dim: rgba(251,191,36,0.12);
          --red: #f87171;
          --red-dim: rgba(248,113,113,0.12);
          --text: #f1f5f9;
          --text2: #94a3b8;
          --text3: #52637a;
          --font: 'Outfit', sans-serif;
          --mono: 'JetBrains Mono', monospace;
          --radius: 18px;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font); min-height: 100vh; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 4px; }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
        @keyframes floatSlow { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(14px,-18px) } }
        @keyframes floatSlow2 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(-18px,16px) } }
        @keyframes glowPulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(52,211,153,0.35) } 50%{ box-shadow: 0 0 0 8px rgba(52,211,153,0) } }
        @keyframes camFlash { 0%,100%{opacity:1} 50%{opacity:0.72} }

        .fade-in { animation: fadeUp 0.55s ease both; }
        .fade-in-1 { animation-delay: 0.05s; }
        .fade-in-2 { animation-delay: 0.12s; }
        .fade-in-3 { animation-delay: 0.19s; }

        /* ── AMBIENT BACKGROUND ── */
        .ambient {
          position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
        }
        .ambient::before {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 65% 50% at 18% -8%, rgba(52,211,153,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 55% 45% at 100% 10%, rgba(45,212,191,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 55% at 30% 100%, rgba(52,211,153,0.05) 0%, transparent 65%),
            linear-gradient(180deg, var(--bg) 0%, #060c14 45%, var(--bg) 100%);
        }
        .ambient-orb {
          position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.16;
        }
        .ambient-orb.o1 { width: 420px; height: 420px; top: -120px; left: -80px; background: var(--green); animation: floatSlow 22s ease-in-out infinite; }
        .ambient-orb.o2 { width: 360px; height: 360px; top: 20%; right: -100px; background: var(--teal); animation: floatSlow2 26s ease-in-out infinite; }
        .ambient-orb.o3 { width: 300px; height: 300px; bottom: -100px; left: 30%; background: var(--green); opacity: 0.10; animation: floatSlow 30s ease-in-out infinite; }
        .ambient-grain {
          position: absolute; inset: 0; opacity: 0.4; mix-blend-mode: overlay;
          background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 3px 3px;
        }

        .page { position: relative; z-index: 1; }

        /* ── NAVBAR ── */
        .nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px; height: 66px;
          background: rgba(5,9,15,0.78);
          backdrop-filter: blur(22px) saturate(160%);
          border-bottom: 1px solid var(--border);
        }
        .nav-brand { display: flex; align-items: center; gap: 11px; text-decoration: none; }
        .nav-icon {
          width: 36px; height: 36px; border-radius: 11px;
          background: linear-gradient(135deg, #34d399 0%, #059669 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; box-shadow: 0 0 18px rgba(52,211,153,0.32);
        }
        .nav-name { font-weight: 700; font-size: 16.5px; color: #f0fdf9; letter-spacing: -0.3px; }
        .nav-name span { color: var(--green); }
        .nav-links { display: flex; gap: 3px; }
        .nav-a {
          position: relative;
          text-decoration: none; color: var(--text2); font-size: 13.5px; font-weight: 500;
          padding: 8px 14px; border-radius: 8px; transition: all 0.2s;
        }
        .nav-a:hover { color: var(--text); background: var(--surface2); }
        .nav-a.on { color: var(--green); background: var(--green-dim); }
        .nav-a.on::after {
          content: ''; position: absolute; left: 14px; right: 14px; bottom: 2px; height: 2px;
          background: var(--green); border-radius: 2px;
        }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .nav-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 13px; border-radius: 100px;
          background: var(--surface); border: 1px solid var(--border);
          font-size: 12px; color: var(--text2); font-weight: 500;
        }
        .pulse { width: 6px; height: 6px; border-radius: 50%; animation: blink 2s infinite; }
        .pulse.on { background: var(--green); box-shadow: 0 0 6px var(--green); }
        .pulse.off { background: var(--red); box-shadow: 0 0 6px var(--red); }
        @media(max-width: 860px){ .nav-links{ display:none; } }

        /* ── HERO / OVERVIEW ── */
        .hero {
          position: relative; overflow: hidden;
          padding: 68px 32px 44px; text-align: center;
        }
        .hero-tag {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 15px; border-radius: 100px; margin-bottom: 24px;
          background: var(--green-dim); border: 1px solid rgba(52,211,153,0.22);
          font-size: 11.5px; font-weight: 600; color: var(--green);
          letter-spacing: 0.7px; text-transform: uppercase;
          backdrop-filter: blur(8px);
        }
        .hero-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: blink 1.5s infinite; }
        .hero-h1 {
          font-size: clamp(32px, 5vw, 56px); font-weight: 800;
          line-height: 1.1; letter-spacing: -1.6px; margin-bottom: 14px;
          background: linear-gradient(160deg, #f0fdf9 0%, #a7f3d0 42%, #34d399 78%, #0d9488 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          font-size: 15.5px; color: var(--text3); max-width: 560px;
          margin: 0 auto 30px; line-height: 1.7; font-weight: 400;
        }
        .hero-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; }
        .cta-main {
          padding: 13px 28px; border-radius: 11px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #34d399 0%, #059669 100%);
          color: #052014; font-size: 14px; font-weight: 700; font-family: var(--font);
          box-shadow: 0 6px 24px rgba(52,211,153,0.3); transition: all 0.22s;
        }
        .cta-main:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(52,211,153,0.42); }
        .cta-sec {
          padding: 13px 28px; border-radius: 11px; cursor: pointer;
          background: var(--surface); border: 1px solid var(--border2);
          color: var(--text2); font-size: 14px; font-weight: 500; font-family: var(--font);
          transition: all 0.22s; text-decoration: none; display: inline-flex; align-items: center;
        }
        .cta-sec:hover { background: var(--surface2); color: var(--text); border-color: var(--green); }

        .hero-kpis {
          display: inline-flex; gap: 0; background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; backdrop-filter: blur(10px);
        }
        .kpi { padding: 18px 34px; text-align: center; border-left: 1px solid var(--border); }
        .kpi:first-child { border-left: none; }
        .kpi-val { font-size: 24px; font-weight: 800; color: var(--green); font-family: var(--mono); }
        .kpi-lbl { font-size: 10.5px; color: var(--text3); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; }
        @media(max-width: 640px){ .hero-kpis{ flex-wrap: wrap; } .kpi{ padding: 14px 20px; } }

        /* ── LAYOUT ── */
        .wrap { padding: 24px 32px 52px; max-width: 1440px; margin: 0 auto; }

        .sec-head { display: flex; align-items: center; gap: 12px; margin: 36px 0 16px; }
        .sec-head-txt {
          font-size: 11px; font-weight: 700; color: var(--text2);
          text-transform: uppercase; letter-spacing: 1.4px; white-space: nowrap;
          display: flex; align-items: center; gap: 8px;
        }
        .sec-head-txt::before { content: ''; width: 3px; height: 13px; border-radius: 2px; background: var(--green); display: inline-block; }
        .sec-head-line { flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }

        /* ── SENSOR GRID ── */
        .sensor-strip { display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: 12px; }
        @media(max-width:1180px){ .sensor-strip{ grid-template-columns: repeat(4,minmax(0,1fr)); } }
        @media(max-width:640px){ .sensor-strip{ grid-template-columns: repeat(2,minmax(0,1fr)); } }

        .s-card {
          background: linear-gradient(160deg, var(--bg2) 0%, var(--bg3) 130%);
          border: 1px solid var(--border);
          border-radius: 16px; padding: 17px 15px;
          position: relative; overflow: hidden;
          transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
        }
        .s-card:hover { border-color: var(--border2); transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.35); }
        .s-card::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2.5px;
          background: var(--accent-color, var(--green)); opacity: 0.7;
        }
        .s-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; }
        .s-icon {
          font-size: 17px; width: 32px; height: 32px; border-radius: 9px;
          background: var(--surface2); display: flex; align-items: center; justify-content: center;
        }
        .s-badge { font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 100px; font-family: var(--mono); letter-spacing: 0.4px; }
        .s-lbl { font-size: 10px; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .s-val { font-size: 21px; font-weight: 800; font-family: var(--mono); margin-bottom: 11px; }
        .s-bar { height: 4px; background: var(--border); border-radius: 10px; overflow: hidden; }
        .s-fill { height: 100%; border-radius: 10px; transition: width 0.9s cubic-bezier(.2,.8,.2,1); }

        /* ── MAIN GRID ── */
        .mg { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 20px; align-items: start; }
        @media(max-width:960px){ .mg{ grid-template-columns:minmax(0,1fr); } }

        /* ── CARD ── */
        .c {
          background: linear-gradient(165deg, var(--bg2) 0%, var(--bg3) 140%);
          border: 1px solid var(--border);
          border-radius: var(--radius); padding: 22px;
          backdrop-filter: blur(6px);
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .c:hover { border-color: var(--border2); }
        .c-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 8px; }
        .c-title { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 1.1px; display: flex; align-items: center; gap: 8px; }
        .c-dot { width: 6px; height: 6px; border-radius: 50%; }

        /* ── FARM INTELLIGENCE ── */
        .intel-status { font-size: 32px; font-weight: 800; font-family: var(--mono); letter-spacing: -0.6px; margin-bottom: 5px; }
        .intel-sub { font-size: 11px; color: var(--text3); margin-bottom: 15px; }
        .intel-rec {
          display: flex; align-items: flex-start; gap: 11px;
          padding: 14px 16px; border-radius: 12px;
          background: var(--surface); border: 1px solid var(--border);
          font-size: 13px; color: var(--text2); line-height: 1.6;
        }
        .intel-rec-icon { font-size: 17px; flex-shrink: 0; margin-top: 1px; }

        /* ── MANUAL CONTROLS ── */
        .ctrl-row { display: flex; gap: 11px; flex-wrap: wrap; }
        .ctrl-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 18px; border-radius: 12px; cursor: pointer;
          border: 1px solid var(--border); background: var(--surface);
          color: var(--text2); font-size: 13px; font-weight: 600; font-family: var(--font);
          transition: all 0.22s;
        }
        .ctrl-btn:hover { background: var(--surface2); color: var(--text); border-color: var(--green); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
        .ctrl-btn:active { transform: translateY(0); }

        /* ── CAMERA ── */
        .cam-wrap {
          position: relative; border-radius: 14px; overflow: hidden; background: #000;
          aspect-ratio: 16/9;
          border: 1px solid var(--border2);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }
        .cam-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: opacity 0.3s; }
        .cam-connecting { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text3); font-size: 12.5px; gap: 8px; }
        .cam-badge {
          position: absolute; top: 13px; left: 13px;
          display: flex; align-items: center; gap: 6px;
          background: rgba(0,0,0,0.68); backdrop-filter: blur(10px);
          border: 1px solid rgba(248,113,113,0.32);
          padding: 6px 13px; border-radius: 100px;
          font-size: 10px; color: #fca5a5; font-weight: 700; letter-spacing: 1px;
        }
        .cam-status-badge {
          position: absolute; top: 13px; right: 13px;
          display: flex; align-items: center; gap: 6px;
          background: rgba(0,0,0,0.68); backdrop-filter: blur(10px);
          border: 1px solid var(--border2);
          padding: 6px 12px; border-radius: 100px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
        }
        .live-dot { width: 5px; height: 5px; border-radius: 50%; background: #f87171; animation: blink 1.2s infinite; }
        .cam-flash { animation: camFlash 0.5s ease; }
        .cam-live-ring {
          width: 8px; height: 8px; border-radius: 50%; background: var(--red); animation: glowPulse 1.8s infinite;
        }
        .cam-meta-grid { margin-top: 14px; display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 10px; }
        .cam-meta {
          background: var(--surface); border: 1px solid var(--border); border-radius: 11px; padding: 11px 13px;
          transition: border-color 0.2s;
        }
        .cam-meta:hover { border-color: var(--border2); }
        .cam-meta-lbl { font-size: 9.5px; color: var(--text3); font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 5px; }
        .cam-meta-val { font-size: 13px; color: var(--text); font-family: var(--mono); font-weight: 500; }

        /* ── IMAGE GRID ── */
        .img-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 9px; margin-top: 15px; }
        .img-thumb { border-radius: 11px; overflow: hidden; aspect-ratio: 1; border: 1px solid var(--border); cursor: pointer; transition: all 0.22s; }
        .img-thumb:hover { transform: scale(1.045); border-color: var(--green); box-shadow: 0 8px 22px rgba(0,0,0,0.35); }
        .img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .img-skel { border-radius: 11px; aspect-ratio: 1; background: linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }

        /* ── ANALYZE BTN ── */
        .analyze-btn {
          padding: 10px 18px; border-radius: 11px; border: none; cursor: pointer;
          font-size: 12.5px; font-weight: 700; font-family: var(--font);
          display: flex; align-items: center; gap: 6px;
          transition: all 0.22s;
        }
        .analyze-btn:hover:not(:disabled) { transform: translateY(-2px); }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── AI SECTION ── */
        .ai-banner { border-radius: 14px; padding: 18px 20px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .ai-name { font-size: 18px; font-weight: 800; }
        .ai-sev { padding: 5px 15px; border-radius: 100px; font-size: 11px; font-weight: 700; font-family: var(--mono); letter-spacing: 0.5px; }
        .ai-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 11px; }
        @media(max-width:500px){ .ai-grid{ grid-template-columns:minmax(0,1fr); } }
        .ai-c { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 15px; }
        .ai-c-lbl { font-size: 9.5px; color: var(--text3); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; gap: 5px; }
        .ai-c-txt { font-size: 13px; color: var(--text2); line-height: 1.65; }
        .ai-empty { text-align: center; padding: 44px 20px; color: var(--text3); }
        .ai-empty-icon { font-size: 46px; margin-bottom: 13px; filter: grayscale(0.3); opacity: 0.7; }

        /* ── BOTTOM GRID ── */
        .bg2 { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr) minmax(0,1fr); gap: 20px; margin-top: 20px; }
        @media(max-width:1180px){ .bg2{ grid-template-columns: minmax(0,1fr) minmax(0,1fr); } }
        @media(max-width:700px){ .bg2{ grid-template-columns:minmax(0,1fr); } }

        .h-row {
          display: flex; align-items: center; gap: 11px;
          padding: 10px 13px; border-radius: 11px;
          background: var(--surface); border: 1px solid var(--border);
          margin-bottom: 8px; font-size: 12.5px; color: var(--text2);
          transition: border-color 0.2s, transform 0.2s;
        }
        .h-row:hover { border-color: var(--border2); transform: translateX(2px); }
        .h-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .h-val { font-family: var(--mono); font-size: 12px; }
        .h-tag { margin-left: auto; font-size: 9px; font-weight: 700; padding: 3px 9px; border-radius: 100px; font-family: var(--mono); }

        .al-row {
          display: flex; align-items: center; gap: 11px;
          padding: 11px 13px; border-radius: 11px;
          background: var(--surface); border: 1px solid var(--border);
          margin-bottom: 8px; transition: border-color 0.2s, transform 0.2s;
          border-left-width: 3px;
        }
        .al-row:hover { border-color: var(--border2); transform: translateX(2px); }
        .al-name { font-size: 13px; color: var(--text); font-weight: 600; margin-bottom: 2px; }
        .al-time { font-size: 11px; color: var(--text3); }
        .al-badge { margin-left: auto; font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 100px; font-family: var(--mono); white-space: nowrap; }

        .err { background: var(--red-dim); border: 1px solid rgba(248,113,113,0.22); color: #fca5a5; padding: 13px 17px; border-radius: 12px; margin-bottom: 18px; font-size: 13px; display: flex; align-items: center; gap: 9px; }

        .foot { text-align: center; padding: 30px 0 18px; font-size: 11px; color: var(--text3); border-top: 1px solid var(--border); margin-top: 12px; }
      `}</style>

      <div className="ambient" aria-hidden="true">
        <div className="ambient-orb o1"></div>
        <div className="ambient-orb o2"></div>
        <div className="ambient-orb o3"></div>
        <div className="ambient-grain"></div>
      </div>

      <div className="page">
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
          {user ? (
            <button
              className="nav-a"
              style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
              onClick={() => { logout(); router.push("/login"); }}
            >
              Logout ({user.name})
            </button>
          ) : (
            <Link href="/login" className="nav-a">Login</Link>
          )}
        </div>
        <div className="nav-right">
          <div className="nav-pill">
            <div className={`pulse ${isOnline ? "on" : "off"}`}></div>
            {isOnline ? `Live · ${lastUpdated}` : "Offline"}
          </div>
        </div>
      </nav>

      {/* ── HERO / OVERVIEW ── */}
      <div className="hero fade-in">
        <div className="hero-tag"><span className="hero-dot"></span>IoT · AI · Precision Agriculture</div>
        <h1 className="hero-h1">Smart Farm Overview</h1>
        <p className="hero-sub">
          Real-time greenhouse monitoring with AI-powered plant disease detection,
          automated sensor analysis, and intelligent irrigation management — all in one control center.
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

        {error && <div className="err fade-in">⚠️ {error}</div>}

        {/* SENSOR OVERVIEW */}
        <div className="sec-head">
          <span className="sec-head-txt">Live Sensor Readings</span>
          <div className="sec-head-line"></div>
        </div>

        <div className="sensor-strip">
          {!latest
            ? [...Array(7)].map((_, i) => (
              <div key={i} style={{ height: 118, borderRadius: 16, background: "var(--bg2)", border: "1px solid var(--border)", backgroundImage: "linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }}></div>
            ))
            : sensors.map((s, idx) => {
              const st = getValueStatus(s.value, s.low, s.high);
              const pct = clamp(s.value, s.low, s.high);
              return (
                <div
                  className="s-card fade-in"
                  key={s.label}
                  style={{ "--accent-color": st.color, animationDelay: `${idx * 0.05}s` } as React.CSSProperties}
                >
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

        {/* FIELD MONITORING */}
        <div className="sec-head">
          <span className="sec-head-txt">Field Monitoring</span>
          <div className="sec-head-line"></div>
        </div>

        <div className="mg">
          {/* LEFT COL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* FARM INTELLIGENCE */}
            <div className="c fade-in fade-in-1">
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
                <div style={{ height: 84, borderRadius: 12, background: "var(--surface)", animation: "shimmer 1.4s infinite", backgroundImage: "linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%)", backgroundSize: "200% 100%" }}></div>
              )}
            </div>

            {/* MANUAL CONTROLS — 6 relays */}
            <div className="c fade-in fade-in-2">
              <div className="c-head">
                <div className="c-title"><div className="c-dot" style={{ background: "var(--amber)" }}></div>Manual Controls</div>
              </div>
              {relayError && (
                <div style={{ fontSize: 11.5, color: "var(--red)", marginBottom: 10 }}>⚠️ {relayError}</div>
              )}
              <div className="ctrl-row">
                {[
                  { key: "nitrogen", icon: "💧", label: "N Water Supply" },
                  { key: "phosphorus", icon: "💧", label: "P Water Supply" },
                  { key: "potassium", icon: "💧", label: "K Water Supply" },
                  { key: "water", icon: "🚿", label: "Main Water Supply" },
                  { key: "fan", icon: "🌀", label: "Fan" },
                  { key: "bulb", icon: "💡", label: "Bulb" },
                ].map((r) => {
                  const isOn = relayStatus?.[r.key] === "ON";
                  const isLoading = relayLoadingKey === r.key;
                  return (
                    <button
                      key={r.key}
                      className="ctrl-btn"
                      onClick={() => toggleRelay(r.key)}
                      disabled={isLoading || !devices[0]}
                      style={isOn ? { background: "var(--green-dim)", borderColor: "rgba(52,211,153,0.35)", color: "var(--green)" } : undefined}
                    >
                      {r.icon} {r.label}
                      <span style={{ marginLeft: 8, fontSize: 10, fontFamily: "var(--mono)", fontWeight: 700, opacity: 0.85 }}>
                        {isLoading ? "..." : isOn ? "[ ON ]" : "[ OFF ]"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DEVICE STATUS — compact summary of the 3 primary outputs */}
            <div className="c fade-in fade-in-2">
              <div className="c-head">
                <div className="c-title"><div className="c-dot" style={{ background: "var(--teal)" }}></div>Device Status</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { key: "water", icon: "💧", label: "Water Pump" },
                  { key: "fan", icon: "🌬", label: "Fan" },
                  { key: "bulb", icon: "💡", label: "Bulb" },
                ].map((d) => {
                  const isOn = relayStatus?.[d.key] === "ON";
                  return (
                    <div key={d.key} className="h-row" style={{ justifyContent: "space-between" }}>
                      <span>{d.icon} {d.label}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: isOn ? "var(--green)" : "var(--text3)" }}>
                        {isOn ? "🟢 ON" : "⚪ OFF"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CAPTURED IMAGES */}
            <div className="c fade-in fade-in-3">
              <div className="c-head">
                <div className="c-title"><div className="c-dot" style={{ background: "#a78bfa" }}></div>Captured Images</div>
                <button
                  className="analyze-btn"
                  onClick={analyzeLatestImage}
                  disabled={analyzing || images.length === 0}
                  style={{
                    background: analyzing ? "var(--surface)" : "linear-gradient(135deg,#8b5cf6,#7c3aed)",
                    color: analyzing ? "var(--text3)" : "#fff",
                    boxShadow: analyzing ? "none" : "0 4px 16px rgba(139,92,246,0.35)",
                  }}
                >
                  {analyzing ? "⏳ Analyzing..." : "🤖 Analyze with AI"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelected}
                  style={{ display: "none" }}
                />
                <button
                  className="analyze-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={aiAnalyzing}
                  style={{
                    background: aiAnalyzing ? "var(--surface)" : "var(--surface2)",
                    color: aiAnalyzing ? "var(--text3)" : "var(--text2)",
                    border: "1px solid var(--border)",
                    marginLeft: 8,
                  }}
                >
                  {aiAnalyzing ? "⏳ Uploading..." : "📤 Upload from Device"}
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
          <div className="c fade-in fade-in-2" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div className="c-head">
              <div className="c-title"><div className="c-dot" style={{ background: "var(--red)" }}></div>Live Farm Camera</div>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--red)", fontFamily: "var(--mono)", fontWeight: 700 }}>
                <span className="cam-live-ring"></span>LIVE
              </span>
            </div>
            <div className="cam-wrap">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt="Live camera"
                  className={`cam-img ${camPulse ? "cam-flash" : ""}`}
                />
              ) : (
                <div className="cam-connecting">Connecting to camera…</div>
              )}
              <div className="cam-badge"><span className="live-dot"></span>LIVE MONITORING</div>
              <div className="cam-status-badge" style={{ color: isOnline ? "var(--green)" : "var(--red)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "var(--green)" : "var(--red)" }}></span>
                {isOnline ? "ONLINE" : "OFFLINE"}
              </div>
            </div>
            <div className="cam-meta-grid">
              {[
                { label: "Field Zone", value: "Zone A-1" },
                { label: "Capture Rate", value: "~1s interval" },
                { label: "Resolution", value: "HD Feed" },
                { label: "AI Status", value: latestDisease ? "Analyzed" : "Pending" },
              ].map((m) => (
                <div className="cam-meta" key={m.label}>
                  <div className="cam-meta-lbl">{m.label}</div>
                  <div className="cam-meta-val">{m.value}</div>
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

        <div className="c fade-in" style={{ marginBottom: 0 }}>
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
          <div className="c fade-in">
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

          <div className="c fade-in fade-in-1">
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

          {/* RELAY HISTORY — item 9, reuses existing AutoAction data */}
          <div className="c fade-in fade-in-2">
            <div className="c-head">
              <div className="c-title"><div className="c-dot" style={{ background: "var(--amber)" }}></div>Relay History</div>
            </div>
            {relayHistory.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "24px 0" }}>No relay actions yet</div>
            ) : (
              relayHistory.slice(0, 6).map((item) => (
                <div className="h-row" key={item.id} style={{ justifyContent: "space-between" }}>
                  <span>{item.action}</span>
                  <span style={{ fontSize: 10.5, color: "var(--text3)", fontFamily: "var(--mono)", whiteSpace: "nowrap", marginLeft: 10 }}>
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="foot">
          AgroSense Smart Irrigation Platform · Next.js + NestJS + Gemini AI · India 🇮🇳
        </div>

        {/* AI ANALYSIS RESULT MODAL (local upload path) */}
        {aiModalOpen && (
          <div
            onClick={() => setAiModalOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 200, padding: 20, backdropFilter: "blur(4px)",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg2)", border: "1px solid var(--border2)",
                borderRadius: 18, padding: 24, maxWidth: 440, width: "100%",
                maxHeight: "85vh", overflowY: "auto",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div className="c-title"><div className="c-dot" style={{ background: "#a78bfa" }}></div>AI Analysis Result</div>
                <button
                  onClick={() => setAiModalOpen(false)}
                  style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 18 }}
                >✕</button>
              </div>

              {aiError ? (
                <div style={{ color: "var(--red, #f87171)", fontSize: 13.5, lineHeight: 1.6 }}>
                  ⚠️ {aiError}
                </div>
              ) : aiResult ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {aiResult.imageUrl && (
                    <img src={aiResult.imageUrl} alt="Analyzed plant" style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} />
                  )}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{aiResult.disease}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                      Confidence: {Math.round(aiResult.confidence * 100)}% · Severity: {aiResult.severity}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1 }}>Recommendation</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>{aiResult.recommendation}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1 }}>Fertilizer</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>{aiResult.fertilizerSuggestion}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1 }}>Watering</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>{aiResult.wateringSuggestion}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
