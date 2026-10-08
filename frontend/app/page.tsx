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
  const [devices, setDevices] = useState<DeviceType[]>([]);
  const [pumpLoading, setPumpLoading] = useState(false);

  // 6-relay manual control state
  const [relayStatus, setRelayStatus] = useState<Record<string, string> | null>(null);
  const [relayHistory, setRelayHistory] = useState<{ id: number; action: string; createdAt: string }[]>([]);
  const [relayLoadingKey, setRelayLoadingKey] = useState<string | null>(null);
  const [relayError, setRelayError] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "GOOD" | "ALERT">("ALL");

  // Tab & Mobile Navigation state
  const [activeLogTab, setActiveLogTab] = useState<"readings" | "relays" | "ai">("readings");
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Local file upload AI analysis
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiUploadHistory, setAiUploadHistory] = useState<AiAnalysisResult[]>([]);

  // Auth check
  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [authLoading, token, router]);

  const CAMERA_URL = "http://10.97.53.164";
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
      cameraActiveRef.current = false;
      if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);
    };
  }, []);

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

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    if (!token) return;
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [token]);

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

  useEffect(() => {
    const deviceId = devices[0]?.id;
    if (!deviceId) return;
    let cancelled = false;

    const loadRelayStatus = async () => {
      try {
        const response = await apiFetch(`/devices/${deviceId}/relay`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const d = await response.json();
        if (!cancelled) {
          setRelayStatus(d);
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

  const loadRelayHistory = async () => {
    const deviceId = devices[0]?.id;
    if (!deviceId) return;
    try {
      const response = await apiFetch(`/auto-actions/${deviceId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const d = await response.json();
      if (Array.isArray(d)) setRelayHistory(d);
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
      loadRelayHistory();
    } catch (err) {
      console.error(`Relay toggle failed for ${relayName}:`, err);
      setRelayStatus((prev) => (prev ? { ...prev, [relayName]: previousStatus } : prev));
      setRelayError(`Could not update ${relayName}. Please try again.`);
    } finally {
      setRelayLoadingKey(null);
    }
  };

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
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${response.status}`);
      }

      const res: AiAnalysisResult = await response.json();
      setAiResult(res);
      setAiUploadHistory((prev) => [res, ...prev].slice(0, 5));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setAiAnalyzing(false);
      setAiModalOpen(true);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    if (!status) return "#10b981";
    if (status === "GOOD" || status === "NORMAL") return "#10b981";
    if (status === "WARNING") return "#f59e0b";
    return "#ef4444";
  };

  const getRecommendation = () => {
    if (!latest) return "Synchronizing farm sensors...";
    if (latest.soilMoisture < 30) return "Low soil moisture detected — Drip line activation advised";
    if (latest.temperature > 35) return "High temperature threshold — Greenhouse ventilation active";
    return "Microclimate optimal — Automated nutrient regulation engaged";
  };

  const getRecommendationIcon = () => {
    if (!latest) return "⏳";
    if (latest.soilMoisture < 30) return "💧";
    if (latest.temperature > 35) return "🌡️";
    return "⚡";
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
    if (!severity || severity === "None") return "#10b981";
    if (severity === "Mild") return "#84cc16";
    if (severity === "Moderate") return "#f59e0b";
    if (severity === "Severe") return "#ef4444";
    return "#94a3b8";
  };

  const getValueStatus = (value: number, low: number, high: number) => {
    if (value < low) return { color: "#f59e0b", label: "LOW" };
    if (value > high) return { color: "#ef4444", label: "HIGH" };
    return { color: "#10b981", label: "OPTIMAL" };
  };

  const clamp = (v: number, min: number, max: number) =>
    Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

  const sensors = latest ? [
    { icon: "🌡️", label: "Temperature", value: latest.temperature, unit: "°C", low: 15, high: 35, desc: "Ambient Canopy Temp" },
    { icon: "💧", label: "Humidity", value: latest.humidity, unit: "%", low: 40, high: 80, desc: "Relative Air Moisture" },
    { icon: "🌱", label: "Soil Moisture", value: latest.soilMoisture, unit: "%", low: 30, high: 80, desc: "Root Zone Saturation" },
    { icon: "🧪", label: "Soil pH Level", value: latest.ph, unit: "pH", low: 5.5, high: 7.5, desc: "Substrate Acidity" },
    { icon: "🔬", label: "Nitrogen (N)", value: latest.nitrogen, unit: "mg/kg", low: 20, high: 150, desc: "Foliage Vegetation" },
    { icon: "⚗️", label: "Phosphorus (P)", value: latest.phosphorus, unit: "mg/kg", low: 10, high: 100, desc: "Root Development" },
    { icon: "💎", label: "Potassium (K)", value: latest.potassium, unit: "mg/kg", low: 20, high: 200, desc: "Immunity & Fruit Size" },
  ] : [];

  const pumpActive = devices[0]?.pumpStatus === "ON";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg-base: #060a11;
          --bg-panel: rgba(13, 20, 32, 0.78);
          --bg-card: rgba(18, 28, 45, 0.7);
          --border: rgba(255, 255, 255, 0.08);
          --border-glow: rgba(16, 185, 129, 0.35);
          --primary-green: #10b981;
          --mint: #34d399;
          --cyan: #06b6d4;
          --amber: #f59e0b;
          --rose: #ef4444;
          --text-bright: #ffffff;
          --text-main: #f1f5f9;
          --text-muted: #94a3b8;
          --text-sub: #64748b;
          --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        body {
          background-color: var(--bg-base);
          color: var(--text-main);
          font-family: var(--font-sans);
          min-height: 100vh;
          overflow-x: hidden;
          line-height: 1.5;
        }

        /* ── ATMOSPHERIC AGRICULTURAL GLOW BACKGROUND ── */
        .ambient-field {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(circle 750px at 10% 0%, rgba(16, 185, 129, 0.12), transparent 70%),
            radial-gradient(circle 650px at 90% 15%, rgba(6, 182, 212, 0.09), transparent 65%),
            radial-gradient(circle 800px at 50% 90%, rgba(16, 185, 129, 0.06), transparent 75%),
            linear-gradient(180deg, #060a11 0%, #080e18 50%, #060a11 100%);
        }
        .ambient-grid {
          position: absolute; inset: 0; opacity: 0.18;
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 36px 36px;
        }

        .layout-root { position: relative; z-index: 1; max-width: 1440px; margin: 0 auto; padding: 0 24px 60px; }

        /* ── PROFESSIONAL NAVBAR ── */
        .header-bar {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 24px; margin: 0 -24px 24px;
          background: rgba(6, 10, 17, 0.85); backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--border);
        }
        .header-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .brand-badge {
          width: 40px; height: 40px; border-radius: 11px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; box-shadow: 0 0 22px rgba(16,185,129,0.4);
        }
        .brand-text-block { display: flex; flex-direction: column; }
        .brand-name { font-weight: 800; font-size: 18px; color: #fff; letter-spacing: -0.3px; line-height: 1.1; }
        .brand-name span { color: var(--mint); }
        .brand-sub { font-size: 10.5px; color: var(--text-sub); font-family: var(--font-mono); letter-spacing: 0.5px; }

        .nav-links-center { display: flex; align-items: center; gap: 4px; }
        .nav-link-btn {
          color: var(--text-muted); text-decoration: none; font-size: 13px; font-weight: 600;
          padding: 7px 14px; border-radius: 9px; transition: all 0.2s;
        }
        .nav-link-btn:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .nav-link-btn.active {
          color: var(--mint); background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.22);
        }

        .nav-right-group { display: flex; align-items: center; gap: 12px; }
        .node-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 13px; border-radius: 100px;
          background: rgba(16,185,129,0.1); border: 1px solid rgba(52,211,153,0.25);
          font-size: 11.5px; font-weight: 700; color: var(--mint); font-family: var(--font-mono);
        }
        .pulse-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--mint);
          box-shadow: 0 0 10px var(--mint); animation: pulseAnim 1.8s infinite;
        }
        @keyframes pulseAnim {
          0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(52,211,153,0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(52,211,153,0); }
          100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(52,211,153,0); }
        }

        .auth-chip {
          background: none; border: 1px solid var(--border); color: var(--text-muted);
          font-family: inherit; font-size: 12.5px; font-weight: 600;
          padding: 6px 14px; border-radius: 9px; cursor: pointer; transition: all 0.2s;
        }
        .auth-chip:hover { color: var(--rose); border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.08); }

        .mobile-toggle { display: none; background: none; border: none; font-size: 22px; color: #fff; cursor: pointer; }

        @media(max-width: 920px) {
          .nav-links-center { display: none; }
          .mobile-toggle { display: block; }
          .mobile-drawer {
            display: flex; flex-direction: column; gap: 6px; padding: 16px;
            background: var(--bg-panel); border: 1px solid var(--border);
            border-radius: 14px; margin-bottom: 20px;
          }
        }

        /* ── SECTION 1: PROJECT HEADLINE / HERO BANNER ── */
        .hero-banner {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.04) 50%, rgba(13, 20, 32, 0.85) 100%);
          border: 1px solid rgba(52,211,153,0.22);
          border-radius: 20px; padding: 32px 36px;
          margin-bottom: 28px; backdrop-filter: blur(18px);
          box-shadow: 0 16px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
          position: relative; overflow: hidden;
        }
        .hero-banner::after {
          content: ''; position: absolute; right: -40px; top: -40px; width: 220px; height: 220px;
          border-radius: 50%; background: radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-tag-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
        .hero-academic-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 13px; border-radius: 100px;
          background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.3);
          font-size: 11px; font-weight: 700; color: var(--mint); letter-spacing: 0.8px; text-transform: uppercase;
        }
        .hero-meta-status {
          font-size: 11.5px; color: var(--text-sub); font-family: var(--font-mono);
          display: flex; align-items: center; gap: 8px;
        }

        .hero-h1 {
          font-size: clamp(26px, 3.8vw, 42px); font-weight: 800; line-height: 1.15;
          letter-spacing: -1px; margin-bottom: 8px; color: #fff;
        }
        .hero-h1 span {
          background: linear-gradient(135deg, #34d399 0%, #06b6d4 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-subhead {
          font-size: clamp(14px, 1.8vw, 17px); font-weight: 600; color: #cbd5e1;
          margin-bottom: 10px; letter-spacing: -0.2px;
        }
        .hero-desc {
          font-size: 14px; color: var(--text-muted); max-width: 820px; line-height: 1.6; margin-bottom: 22px;
        }

        .hero-quick-jumps { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .quick-nav-pill {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 11px; font-size: 12.5px; font-weight: 700;
          text-decoration: none; cursor: pointer; transition: all 0.22s;
          background: rgba(255,255,255,0.04); border: 1px solid var(--border); color: #fff;
        }
        .quick-nav-pill:hover {
          background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); transform: translateY(-2px);
        }
        .quick-nav-pill.primary {
          background: linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(5,150,105,0.2) 100%);
          border-color: rgba(52,211,153,0.5); color: #ecfdf5;
        }
        .quick-nav-pill.primary:hover {
          background: linear-gradient(135deg, rgba(16,185,129,0.45) 0%, rgba(5,150,105,0.3) 100%);
          box-shadow: 0 0 20px rgba(16,185,129,0.3);
        }

        /* ── SECTION HEADER ── */
        .section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px; margin-top: 14px; flex-wrap: wrap; gap: 8px;
        }
        .sec-title-group { display: flex; flex-direction: column; }
        .sec-label {
          font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--mint);
          letter-spacing: 1.2px; display: flex; align-items: center; gap: 7px; margin-bottom: 3px;
        }
        .sec-label::before {
          content: ''; width: 3px; height: 12px; border-radius: 2px; background: var(--mint); display: inline-block;
        }
        .sec-h2 { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.4px; }
        .sec-desc { font-size: 12.5px; color: var(--text-sub); margin-top: 1px; }

        /* ── SECTION 2: LIVE SENSOR MONITORING (7 SENSORS GRID) ── */
        .sensor-cockpit-grid {
          display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 12px; margin-bottom: 28px;
        }
        @media(max-width: 1240px){ .sensor-cockpit-grid { grid-template-columns: repeat(4, minmax(0,1fr)); } }
        @media(max-width: 768px){ .sensor-cockpit-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media(max-width: 480px){ .sensor-cockpit-grid { grid-template-columns: minmax(0,1fr); } }

        .sensor-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 16px; padding: 16px;
          backdrop-filter: blur(14px); position: relative; overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        .sensor-card:hover {
          border-color: var(--card-accent, var(--mint));
          transform: translateY(-4px);
          box-shadow: 0 14px 28px -6px rgba(0,0,0,0.5), 0 0 18px -4px var(--card-accent, var(--mint));
        }
        .sensor-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .sensor-icon-avatar {
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;
          font-size: 16px; border: 1px solid rgba(255,255,255,0.08);
        }
        .sensor-pill-status {
          font-size: 9.5px; font-weight: 800; font-family: var(--font-mono);
          padding: 2.5px 8px; border-radius: 100px; letter-spacing: 0.4px;
        }
        .sensor-name { font-size: 11px; color: var(--text-sub); font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
        .sensor-reading { font-size: 23px; font-weight: 800; font-family: var(--font-mono); letter-spacing: -0.6px; margin-bottom: 6px; display: flex; align-items: baseline; }
        .sensor-unit { font-size: 11.5px; font-weight: 600; color: var(--text-sub); margin-left: 4px; }
        .sensor-target-range {
          display: flex; justify-content: space-between; font-size: 9.5px; color: var(--text-sub);
          font-family: var(--font-mono); margin-bottom: 6px;
        }
        .sensor-track { height: 5px; background: rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; }
        .sensor-fill { height: 100%; border-radius: 10px; transition: width 0.8s ease; }

        /* ── SECTION 3: SYSTEM COCKPIT (BALANCED 2-COLUMNS) ── */
        .cockpit-bento {
          display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.25fr);
          gap: 24px; align-items: start; margin-bottom: 30px;
        }
        @media(max-width: 1040px){ .cockpit-bento { grid-template-columns: minmax(0, 1fr); } }

        .dashboard-box {
          background: var(--bg-panel); border: 1px solid var(--border);
          border-radius: 18px; padding: 22px;
          backdrop-filter: blur(16px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          margin-bottom: 24px;
        }
        .box-title-bar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px; flex-wrap: wrap; gap: 8px;
        }
        .box-title {
          font-size: 13px; font-weight: 800; color: #fff; text-transform: uppercase;
          letter-spacing: 1px; display: flex; align-items: center; gap: 9px;
        }
        .box-title-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }

        /* ── ACTUATOR & RELAY SWITCHBOARD (SECTION 3) ── */
        .relay-grid-container {
          display: grid; grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 12px; margin-bottom: 18px;
        }
        @media(max-width: 580px){ .relay-grid-container { grid-template-columns: minmax(0, 1fr); } }

        .relay-card-tile {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 14px 16px; border-radius: 14px; cursor: pointer; text-align: left;
          border: 1px solid var(--border); background: rgba(255,255,255,0.03);
          color: var(--text-main); font-family: var(--font-sans);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .relay-card-tile:hover:not(:disabled) {
          border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.06);
          transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }
        .relay-card-tile.is-on {
          background: linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.08) 100%);
          border-color: rgba(52,211,153,0.5);
          box-shadow: 0 0 20px rgba(16,185,129,0.2), inset 0 1px 0 rgba(52,211,153,0.25);
        }
        .relay-info-side { display: flex; align-items: center; gap: 11px; }
        .relay-icon-avatar {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
        }
        .relay-card-tile.is-on .relay-icon-avatar {
          background: rgba(52,211,153,0.2); border-color: rgba(52,211,153,0.4);
        }
        .relay-name-label { font-size: 13.5px; font-weight: 700; color: #fff; }
        .relay-purpose-sub { font-size: 10.5px; color: var(--text-sub); margin-top: 1px; }

        .relay-state-capsule {
          padding: 4px 10px; border-radius: 100px;
          font-family: var(--font-mono); font-size: 10px; font-weight: 800;
          display: flex; align-items: center; gap: 5px;
          border: 1px solid var(--border); background: rgba(0,0,0,0.4);
          color: var(--text-sub); transition: all 0.2s;
        }
        .relay-card-tile.is-on .relay-state-capsule {
          background: rgba(16,185,129,0.25); border-color: rgba(52,211,153,0.6);
          color: #ecfdf5; box-shadow: 0 0 10px rgba(52,211,153,0.3);
        }
        .relay-capsule-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-sub); }
        .relay-card-tile.is-on .relay-capsule-dot {
          background: var(--mint); box-shadow: 0 0 8px var(--mint);
          animation: pulseAnim 1.4s infinite;
        }

        /* ── PRIMARY MASTER PUMP CONTROLLER BAR ── */
        .master-pump-container {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; border-radius: 14px;
          background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.25);
          margin-bottom: 20px;
        }
        .master-pump-info { display: flex; align-items: center; gap: 12px; }
        .master-pump-icon { font-size: 22px; }
        .master-pump-heading { font-size: 13.5px; font-weight: 800; color: #fff; }
        .master-pump-details { font-size: 11.5px; color: var(--text-sub); }
        .master-pump-action-btn {
          padding: 9px 18px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 12px; font-weight: 800; font-family: var(--font-mono);
          letter-spacing: 0.5px; transition: all 0.2s;
        }
        .master-pump-action-btn.is-active {
          background: var(--mint); color: #064e3b; box-shadow: 0 0 14px rgba(52,211,153,0.45);
        }
        .master-pump-action-btn.is-idle {
          background: rgba(255,255,255,0.08); color: var(--text-muted);
        }
        .master-pump-action-btn:hover:not(:disabled) { transform: translateY(-1px); }

        /* ── SECTION 4: CROP / FARM STATUS ── */
        .crop-advisory-banner {
          background: linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(13, 20, 32, 0.7) 100%);
          border: 1px solid rgba(52,211,153,0.22);
          border-radius: 14px; padding: 16px 18px; margin-bottom: 18px;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
        }
        .crop-advisory-left { display: flex; align-items: center; gap: 12px; }
        .crop-advisory-icon { font-size: 26px; }
        .crop-advisory-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--mint); letter-spacing: 0.8px; }
        .crop-advisory-msg { font-size: 13.5px; font-weight: 700; color: #fff; margin-top: 2px; }

        .crop-cards-showcase {
          display: grid; grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 10px; margin-bottom: 14px;
        }
        @media(max-width: 680px){ .crop-cards-showcase { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        .crop-preset-tile {
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          border-radius: 12px; padding: 12px; text-decoration: none; transition: all 0.2s;
        }
        .crop-preset-tile:hover {
          border-color: rgba(52,211,153,0.4); background: rgba(255,255,255,0.05); transform: translateY(-2px);
        }
        .crop-preset-name { font-size: 13px; font-weight: 800; color: #fff; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
        .crop-preset-meta { font-size: 10px; color: var(--text-sub); font-family: var(--font-mono); }

        /* ── SECTION 5: AI / PLANT HEALTH & OPTICAL MONITORING ── */
        .cam-frame-hud {
          position: relative; border-radius: 14px; overflow: hidden; background: #000;
          aspect-ratio: 16/9; border: 1px solid var(--border);
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        .cam-corner-bracket {
          position: absolute; width: 14px; height: 14px; border-color: rgba(52,211,153,0.7);
          border-style: solid; z-index: 5; pointer-events: none;
        }
        .cam-corner-bracket.tl { top: 8px; left: 8px; border-width: 2px 0 0 2px; }
        .cam-corner-bracket.tr { top: 8px; right: 8px; border-width: 2px 2px 0 0; }
        .cam-corner-bracket.bl { bottom: 8px; left: 8px; border-width: 0 0 2px 2px; }
        .cam-corner-bracket.br { bottom: 8px; right: 8px; border-width: 0 2px 2px 0; }

        .cam-element { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cam-fallback-msg {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          color: var(--text-sub); font-size: 13px; gap: 8px; font-family: var(--font-mono);
        }
        .cam-badge-tag {
          position: absolute; top: 12px; left: 12px;
          display: flex; align-items: center; gap: 7px;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
          border: 1px solid rgba(239,68,68,0.4); padding: 5px 12px; border-radius: 100px;
          font-size: 10px; color: #fca5a5; font-weight: 800; letter-spacing: 0.8px;
        }
        .cam-res-tag {
          position: absolute; top: 12px; right: 12px;
          display: flex; align-items: center; gap: 6px;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
          border: 1px solid var(--border); padding: 5px 11px; border-radius: 100px;
          font-size: 10px; font-weight: 700; font-family: var(--font-mono);
        }

        .cam-node-telemetry {
          display: grid; grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 8px; margin-top: 12px;
        }
        .cam-tele-chip {
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          border-radius: 10px; padding: 8px; text-align: center;
        }
        .cam-tele-k { font-size: 9px; text-transform: uppercase; color: var(--text-sub); font-weight: 700; margin-bottom: 2px; }
        .cam-tele-v { font-size: 12px; font-weight: 700; color: #fff; font-family: var(--font-mono); }

        .ai-actions-row { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
        .btn-ai-trigger {
          flex: 1; padding: 11px 16px; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          color: #fff; font-size: 13px; font-weight: 700; font-family: var(--font-sans);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 18px rgba(139,92,246,0.35); transition: all 0.2s;
        }
        .btn-ai-trigger:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(139,92,246,0.45); }
        .btn-ai-trigger:disabled { opacity: 0.55; cursor: not-allowed; }

        .btn-upload-file {
          padding: 11px 16px; border-radius: 12px; cursor: pointer;
          background: rgba(255,255,255,0.05); border: 1px solid var(--border);
          color: var(--text-main); font-size: 13px; font-weight: 700; font-family: var(--font-sans);
          display: flex; align-items: center; gap: 8px; transition: all 0.2s;
        }
        .btn-upload-file:hover:not(:disabled) { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.18); }

        /* Filmstrip tray */
        .filmstrip-container { margin-top: 14px; }
        .filmstrip-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .filmstrip-title { font-size: 10.5px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.6px; }
        .filmstrip-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 8px; }
        .filmstrip-thumb {
          aspect-ratio: 1; border-radius: 8px; overflow: hidden;
          border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; background: rgba(0,0,0,0.3);
        }
        .filmstrip-thumb:hover { border-color: var(--mint); transform: scale(1.06); }
        .filmstrip-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .filmstrip-empty {
          aspect-ratio: 1; border-radius: 8px; background: rgba(255,255,255,0.03);
          border: 1px dashed rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center;
          font-size: 9.5px; color: var(--text-sub);
        }

        /* AI Diagnosis Box */
        .ai-diagnosis-card {
          margin-top: 16px; border-radius: 14px; padding: 16px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
        }
        .ai-doc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .ai-doc-title { font-size: 13.5px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; }
        .ai-diag-banner {
          border-radius: 12px; padding: 12px 14px; margin-bottom: 12px;
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }
        .ai-diag-name { font-size: 15px; font-weight: 800; }
        .ai-diag-sev {
          font-size: 10px; font-weight: 800; font-family: var(--font-mono);
          padding: 3px 10px; border-radius: 100px; text-transform: uppercase;
        }
        .ai-doc-columns { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 10px; }
        @media(max-width:540px){ .ai-doc-columns { grid-template-columns: minmax(0,1fr); } }
        .ai-doc-box {
          background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px; padding: 11px 13px;
        }
        .ai-doc-k { font-size: 9.5px; color: var(--text-sub); font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
        .ai-doc-v { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

        .ai-ready-guide {
          display: flex; align-items: center; gap: 14px; padding: 14px 16px;
          border-radius: 12px; background: rgba(139,92,246,0.07); border: 1px dashed rgba(139,92,246,0.3);
        }
        .ai-guide-icon { font-size: 28px; }
        .ai-guide-h { font-size: 13px; font-weight: 700; color: #d8b4fe; margin-bottom: 2px; }
        .ai-guide-p { font-size: 11.5px; color: var(--text-sub); line-height: 1.45; }

        /* ── INTERACTIVE TABBED TELEMETRY HUB ── */
        .telemetry-tabs-bar {
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 14px;
          flex-wrap: wrap; gap: 10px;
        }
        .tab-switcher { display: flex; gap: 6px; }
        .tab-btn {
          font-size: 11.5px; font-weight: 700; font-family: var(--font-sans);
          padding: 6px 12px; border-radius: 8px; cursor: pointer;
          border: 1px solid transparent; background: transparent; color: var(--text-sub);
          transition: all 0.2s;
        }
        .tab-btn:hover { color: #fff; background: rgba(255,255,255,0.04); }
        .tab-btn.active {
          color: var(--mint); background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.25);
        }

        .filter-chip-group { display: flex; gap: 5px; }
        .filter-chip {
          font-size: 9.5px; font-weight: 700; font-family: var(--font-mono);
          padding: 3px 9px; border-radius: 6px; cursor: pointer;
          border: 1px solid var(--border); background: rgba(255,255,255,0.03); color: var(--text-sub);
          transition: all 0.2s;
        }
        .filter-chip:hover { color: #fff; }
        .filter-chip.active {
          background: rgba(52,211,153,0.15); border-color: var(--mint); color: var(--mint);
        }

        .telemetry-list { display: flex; flex-direction: column; gap: 7px; max-height: 280px; overflow-y: auto; padding-right: 4px; }
        .telemetry-row {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 10px 13px; border-radius: 10px;
          background: rgba(255,255,255,0.025); border: 1px solid var(--border);
          font-size: 12px; transition: all 0.2s;
        }
        .telemetry-row:hover {
          border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.045); transform: translateX(2px);
        }
        .tele-left { display: flex; align-items: center; gap: 10px; }
        .tele-dot { width: 7px; height: 7px; border-radius: 50%; box-shadow: 0 0 6px currentColor; flex-shrink: 0; }
        .tele-vals { display: flex; gap: 12px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-main); }
        .tele-tag {
          font-size: 9px; font-weight: 800; font-family: var(--font-mono);
          padding: 2px 8px; border-radius: 100px;
        }

        /* ── FOOTER ── */
        .dashboard-footer {
          margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
          font-size: 12px; color: var(--text-sub);
        }

        /* ── AI RESULT MODAL ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 200; padding: 20px; backdrop-filter: blur(6px);
        }
        .modal-box {
          background: #0f172a; border: 1px solid var(--border);
          border-radius: 18px; padding: 24px; max-width: 460px; width: 100%;
          box-shadow: 0 24px 60px rgba(0,0,0,0.7);
        }
        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Atmospheric glowing backdrop */}
      <div className="ambient-field" aria-hidden="true">
        <div className="ambient-grid"></div>
      </div>

      <div className="layout-root">

        {/* ════════════════════════════════════════════════════════════
            NAVBAR
        ════════════════════════════════════════════════════════════ */}
        <header className="header-bar">
          <Link href="/" className="header-brand">
            <div className="brand-badge">🌾</div>
            <div className="brand-text-block">
              <div className="brand-name">SMART <span>FARM</span></div>
              <div className="brand-sub">IoT & AI Precision Agriculture</div>
            </div>
          </Link>

          <nav className="nav-links-center">
            <a href="#system-overview" className="nav-link-btn active">Dashboard</a>
            <Link href="/crop" className="nav-link-btn">Crops</Link>
            <a href="#device-control" className="nav-link-btn">Devices</a>
            <a href="#live-sensors" className="nav-link-btn">Monitoring</a>
            <a href="#ai-plant-health" className="nav-link-btn">AI Analysis</a>
            <Link href="/about" className="nav-link-btn">About</Link>
          </nav>

          <div className="nav-right-group">
            <div className="node-pill">
              <span className="pulse-dot"></span>
              {isOnline ? "ESP32-0001 ONLINE" : "ESP32 STANDBY"}
            </div>

            {user ? (
              <button className="auth-chip" onClick={() => { logout(); router.push("/login"); }}>
                Logout ({user.name})
              </button>
            ) : (
              <Link href="/login" className="auth-chip">Login</Link>
            )}

            <button
              className="mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer">
            <a href="#system-overview" className="nav-link-btn" onClick={() => setMobileMenuOpen(false)}>Dashboard</a>
            <Link href="/crop" className="nav-link-btn" onClick={() => setMobileMenuOpen(false)}>Crops Database</Link>
            <a href="#device-control" className="nav-link-btn" onClick={() => setMobileMenuOpen(false)}>Device & Relays</a>
            <a href="#live-sensors" className="nav-link-btn" onClick={() => setMobileMenuOpen(false)}>Live Monitoring</a>
            <a href="#ai-plant-health" className="nav-link-btn" onClick={() => setMobileMenuOpen(false)}>AI Plant Pathologist</a>
            <Link href="/about" className="nav-link-btn" onClick={() => setMobileMenuOpen(false)}>About Project</Link>
            <Link href="/contact" className="nav-link-btn" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            1. PROJECT HEADLINE / HERO SECTION
        ════════════════════════════════════════════════════════════ */}
        <section className="hero-banner" id="system-overview">
          <div className="hero-tag-row">
            <div className="hero-academic-badge">
              <span>🎓</span> Final Year B.Tech Capstone Project · IoT Precision Agriculture
            </div>
            <div className="hero-meta-status">
              <span>● Node: ESP32-0001</span>
              <span>· Subnet: Greenhouse Sector A-1</span>
              <span>· Updated: {lastUpdated || "5s Polling"}</span>
            </div>
          </div>

          <h1 className="hero-h1">
            SMART <span>FARM</span>
          </h1>
          <div className="hero-subhead">
            Intelligent IoT-Based Smart Irrigation &amp; Crop Monitoring System
          </div>
          <p className="hero-desc">
            Real-time crop monitoring, intelligent irrigation and environmental management using IoT.
            Automated sensor feedback loops adjust NPK fertilization, soil saturation, and microclimate ventilation with integrated Gemini AI vision plant diagnosis.
          </p>

          <div className="hero-quick-jumps">
            <a href="#live-sensors" className="quick-nav-pill primary">
              📊 Live Dashboard
            </a>
            <Link href="/crop" className="quick-nav-pill">
              🌾 Browse 100 Crops
            </Link>
            <a href="#device-control" className="quick-nav-pill">
              ⚡ Relay Actuators
            </a>
            <a href="#ai-plant-health" className="quick-nav-pill">
              🤖 AI Disease Scanner
            </a>
            <button
              className="quick-nav-pill"
              onClick={handleManualRefresh}
              disabled={refreshing}
              style={{ marginLeft: "auto" }}
            >
              <span className={refreshing ? "spin" : ""}>🔄</span>
              {refreshing ? "Syncing..." : "Sync Telemetry"}
            </button>
          </div>
        </section>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "12px 18px", borderRadius: 12, marginBottom: 20, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            2. SYSTEM OVERVIEW / LIVE SENSOR MONITORING
        ════════════════════════════════════════════════════════════ */}
        <div className="section-header" id="live-sensors">
          <div className="sec-title-group">
            <span className="sec-label">Telemetry Stream</span>
            <h2 className="sec-h2">Live Sensor Monitoring</h2>
            <div className="sec-desc">Continuous multi-spectrum agricultural readings delivered via ESP32 WiFi telemetry</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
            <span className="pulse-dot"></span> 7 Physical Telemetry Points Active
          </div>
        </div>

        <div className="sensor-cockpit-grid">
          {!latest
            ? [...Array(7)].map((_, i) => (
              <div key={i} style={{ height: 140, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}></div>
            ))
            : sensors.map((s) => {
              const st = getValueStatus(s.value, s.low, s.high);
              const pct = clamp(s.value, s.low, s.high);
              return (
                <div
                  className="sensor-card"
                  key={s.label}
                  style={{ "--card-accent": st.color } as React.CSSProperties}
                >
                  <div className="sensor-top">
                    <div className="sensor-icon-avatar">{s.icon}</div>
                    <span
                      className="sensor-pill-status"
                      style={{ background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}40` }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div className="sensor-name">{s.label}</div>
                  <div className="sensor-reading" style={{ color: st.color }}>
                    {s.value}
                    <span className="sensor-unit">{s.unit}</span>
                  </div>
                  <div className="sensor-target-range">
                    <span>Min {s.low}{s.unit}</span>
                    <span>Max {s.high}{s.unit}</span>
                  </div>
                  <div className="sensor-track">
                    <div className="sensor-fill" style={{ width: `${pct}%`, background: st.color }}></div>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* ════════════════════════════════════════════════════════════
            3. IRRIGATION / DEVICE CONTROL & 4. CROP STATUS & 5. AI PLANT HEALTH
        ════════════════════════════════════════════════════════════ */}
        <div className="cockpit-bento">

          {/* ── LEFT COLUMN: IRRIGATION & ACTUATOR SWITCHBOARD ── */}
          <div id="device-control">

            {/* Actuator Switchboard Box */}
            <div className="dashboard-box">
              <div className="box-title-bar">
                <div className="box-title">
                  <span className="box-title-dot" style={{ background: "var(--amber)" }}></span>
                  Irrigation &amp; Device Control Matrix
                </div>
                <span style={{ fontSize: 11, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                  6 Independent Channels
                </span>
              </div>

              {relayError && (
                <div style={{ fontSize: 11.5, color: "var(--rose)", marginBottom: 12 }}>
                  ⚠️ {relayError}
                </div>
              )}

              {/* Master Water Pump Override Bar */}
              <div className="master-pump-container">
                <div className="master-pump-info">
                  <span className="master-pump-icon">🚰</span>
                  <div>
                    <div className="master-pump-heading">Primary Drip Irrigation Pump</div>
                    <div className="master-pump-details">Master pressure solenoid &amp; pump drive for Greenhouse Zone A-1</div>
                  </div>
                </div>
                <button
                  className={`master-pump-action-btn ${pumpActive ? "is-active" : "is-idle"}`}
                  onClick={togglePump}
                  disabled={pumpLoading || !devices[0]}
                  type="button"
                >
                  {pumpLoading ? "UPDATING..." : pumpActive ? "PUMP ACTIVE [ON]" : "STANDBY [OFF]"}
                </button>
              </div>

              {/* 6 Relay Actuator Cards */}
              <div className="relay-grid-container">
                {[
                  { key: "nitrogen", icon: "🧪", label: "Nitrogen Line", sub: "N fertilizer doser" },
                  { key: "phosphorus", icon: "⚗️", label: "Phosphorus Line", sub: "P nutrient valve" },
                  { key: "potassium", icon: "💎", label: "Potassium Line", sub: "K enrichment feed" },
                  { key: "water", icon: "🚿", label: "Drip Supply", sub: "Main water line" },
                  { key: "fan", icon: "🌀", label: "Exhaust Fan", sub: "Canopy cooling unit" },
                  { key: "bulb", icon: "💡", label: "Growth Lighting", sub: "Photosynthesis bulb" },
                ].map((r) => {
                  const isOn = relayStatus?.[r.key] === "ON";
                  const isLoading = relayLoadingKey === r.key;
                  return (
                    <button
                      key={r.key}
                      className={`relay-card-tile ${isOn ? "is-on" : ""}`}
                      onClick={() => toggleRelay(r.key)}
                      disabled={isLoading || !devices[0]}
                      type="button"
                    >
                      <div className="relay-info-side">
                        <div className="relay-icon-avatar">{r.icon}</div>
                        <div>
                          <div className="relay-name-label">{r.label}</div>
                          <div className="relay-purpose-sub">{r.sub}</div>
                        </div>
                      </div>
                      <div className="relay-state-capsule">
                        <span className="relay-capsule-dot"></span>
                        {isLoading ? "SYNC..." : isOn ? "ON" : "OFF"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── CROP / FARM STATUS (SECTION 4) ── */}
            <div className="dashboard-box" id="crop-status">
              <div className="box-title-bar">
                <div className="box-title">
                  <span className="box-title-dot" style={{ background: "var(--primary-green)" }}></span>
                  Crop &amp; Farm Status
                </div>
                <Link href="/crop" style={{ fontSize: 11, color: "var(--mint)", textDecoration: "none", fontWeight: 700 }}>
                  View 100 Crops →
                </Link>
              </div>

              {/* Crop Microclimate Advisory Banner */}
              <div className="crop-advisory-banner">
                <div className="crop-advisory-left">
                  <div className="crop-advisory-icon">{getRecommendationIcon()}</div>
                  <div>
                    <div className="crop-advisory-title">Active Agronomic Recommendation</div>
                    <div className="crop-advisory-msg">{getRecommendation()}</div>
                  </div>
                </div>
                <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "var(--mint)", fontSize: 10.5, fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                  AUTOMATION BALANCED
                </div>
              </div>

              {/* Suggested Crop Profiles Cards */}
              <div className="crop-cards-showcase">
                {[
                  { name: "Tomato", icon: "🍅", temp: "18–27°C", moist: "60–80%", npk: "120-80-150" },
                  { name: "Capsicum", icon: "🫑", temp: "20–27°C", moist: "60–75%", npk: "100-80-120" },
                  { name: "Cucumber", icon: "🥒", temp: "22–30°C", moist: "70–85%", npk: "150-100-200" },
                  { name: "Strawberry", icon: "🍓", temp: "15–24°C", moist: "65–75%", npk: "80-60-120" },
                ].map((c) => (
                  <Link href="/crop" key={c.name} className="crop-preset-tile">
                    <div className="crop-preset-name">
                      <span>{c.icon}</span> {c.name}
                    </div>
                    <div className="crop-preset-meta">Temp: {c.temp}</div>
                    <div className="crop-preset-meta">Moist: {c.moist}</div>
                    <div className="crop-preset-meta">NPK: {c.npk}</div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── INTERACTIVE TABBED TELEMETRY HUB ── */}
            <div className="dashboard-box">
              <div className="telemetry-tabs-bar">
                <div className="tab-switcher">
                  <button
                    className={`tab-btn ${activeLogTab === "readings" ? "active" : ""}`}
                    onClick={() => setActiveLogTab("readings")}
                    type="button"
                  >
                    📡 Sensor History
                  </button>
                  <button
                    className={`tab-btn ${activeLogTab === "relays" ? "active" : ""}`}
                    onClick={() => setActiveLogTab("relays")}
                    type="button"
                  >
                    ⚡ Relay Log
                  </button>
                  <button
                    className={`tab-btn ${activeLogTab === "ai" ? "active" : ""}`}
                    onClick={() => setActiveLogTab("ai")}
                    type="button"
                  >
                    🤖 AI Scan Log
                  </button>
                </div>

                {activeLogTab === "readings" && (
                  <div className="filter-chip-group">
                    {(["ALL", "GOOD", "ALERT"] as const).map((filter) => (
                      <button
                        key={filter}
                        className={`filter-chip ${historyFilter === filter ? "active" : ""}`}
                        onClick={() => setHistoryFilter(filter)}
                        type="button"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tab 1: Live Sensor Telemetry */}
              {activeLogTab === "readings" && (
                <div className="telemetry-list">
                  {data
                    .filter((item) => {
                      if (historyFilter === "ALL") return true;
                      if (historyFilter === "GOOD") return item.status === "GOOD" || item.status === "NORMAL" || !item.status;
                      if (historyFilter === "ALERT") return item.status === "WARNING" || item.status === "DANGER" || item.status === "CRITICAL";
                      return true;
                    })
                    .slice(0, 5)
                    .map((item) => {
                      const sc = getStatusColor(item.status);
                      return (
                        <div className="telemetry-row" key={item.id}>
                          <div className="tele-left">
                            <span className="tele-dot" style={{ background: sc }}></span>
                            <span style={{ fontSize: 11, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                              #{item.id}
                            </span>
                            <div className="tele-vals">
                              <span>🌡 {item.temperature}°C</span>
                              <span>💧 {item.humidity}%</span>
                              <span>🌱 {item.soilMoisture}%</span>
                              <span>🧪 pH {item.ph}</span>
                            </div>
                          </div>
                          <span
                            className="tele-tag"
                            style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}35` }}
                          >
                            {item.status || "NORMAL"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Tab 2: Relay History */}
              {activeLogTab === "relays" && (
                <div className="telemetry-list">
                  {relayHistory.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--text-sub)", textAlign: "center", padding: "20px 0" }}>
                      No manual actuator triggers recorded yet.
                    </div>
                  ) : (
                    relayHistory.slice(0, 5).map((item) => (
                      <div className="telemetry-row" key={item.id}>
                        <div className="tele-left">
                          <span className="tele-dot" style={{ background: "var(--amber)" }}></span>
                          <span style={{ fontWeight: 600, color: "#fff" }}>{item.action}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: AI Scan History */}
              {activeLogTab === "ai" && (
                <div className="telemetry-list">
                  {imageHistory.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--text-sub)", textAlign: "center", padding: "20px 0" }}>
                      No previous Gemini vision scans found.
                    </div>
                  ) : (
                    imageHistory.slice(0, 5).map((item, idx) => {
                      const parsed = parseDisease(item.disease);
                      const sc = getSeverityColor(parsed?.Severity);
                      return (
                        <div className="telemetry-row" key={idx}>
                          <div className="tele-left">
                            <span className="tele-dot" style={{ background: sc }}></span>
                            <span style={{ fontWeight: 600, color: "#fff" }}>
                              {parsed?.Severity === "None" ? "✅ Healthy Foliage" : `⚠️ ${parsed?.Disease || "Leaf Disease"}`}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10.5, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                              {new Date(item.time).toLocaleTimeString()}
                            </span>
                            <span className="tele-tag" style={{ background: `${sc}18`, color: sc }}>
                              {parsed?.Severity || "N/A"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: AI / PLANT HEALTH & OPTICAL MONITORING ── */}
          <div id="ai-plant-health">
            <div className="dashboard-box">
              <div className="box-title-bar">
                <div className="box-title">
                  <span className="box-title-dot" style={{ background: "var(--rose)" }}></span>
                  AI Plant Health &amp; Optical Vision
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--rose)", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--rose)", animation: "pulseAnim 1.5s infinite" }}></span>
                  CAM LIVE
                </div>
              </div>

              {/* Live Camera Frame */}
              <div className="cam-frame-hud">
                <span className="cam-corner-bracket tl"></span>
                <span className="cam-corner-bracket tr"></span>
                <span className="cam-corner-bracket bl"></span>
                <span className="cam-corner-bracket br"></span>
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt="Live camera feed"
                    className={`cam-element ${camPulse ? "pulse" : ""}`}
                  />
                ) : (
                  <div className="cam-fallback-msg">Connecting to ESP32-CAM stream…</div>
                )}
                <div className="cam-badge-tag">● OPTICAL HUD</div>
                <div className="cam-res-tag" style={{ color: isOnline ? "var(--mint)" : "var(--rose)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "var(--mint)" : "var(--rose)" }}></span>
                  {isOnline ? "1080p · ONLINE" : "OFFLINE"}
                </div>
              </div>

              {/* Camera Node Specs */}
              <div className="cam-node-telemetry">
                <div className="cam-tele-chip">
                  <div className="cam-tele-k">Optics Node</div>
                  <div className="cam-tele-v">ESP32-CAM</div>
                </div>
                <div className="cam-tele-chip">
                  <div className="cam-tele-k">Stream Cadence</div>
                  <div className="cam-tele-v">1s Refresh</div>
                </div>
                <div className="cam-tele-chip">
                  <div className="cam-tele-k">Target Zone</div>
                  <div className="cam-tele-v">Zone A-1</div>
                </div>
                <div className="cam-tele-chip">
                  <div className="cam-tele-k">AI Model</div>
                  <div className="cam-tele-v">Gemini Vision</div>
                </div>
              </div>

              {/* Vision Actions: Camera Analyze & Local Leaf Upload */}
              <div className="ai-actions-row">
                <button
                  className="btn-ai-trigger"
                  onClick={analyzeLatestImage}
                  disabled={analyzing || images.length === 0}
                >
                  {analyzing ? "⏳ Gemini AI Diagnosing..." : "🤖 Analyze Camera Frame"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelected}
                  style={{ display: "none" }}
                />
                <button
                  className="btn-upload-file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={aiAnalyzing}
                >
                  {aiAnalyzing ? "⏳ Uploading..." : "📤 Upload Leaf Photo"}
                </button>
              </div>

              {/* Captured Snapshots Tray */}
              <div className="filmstrip-container">
                <div className="filmstrip-header">
                  <span className="filmstrip-title">Recent Field Snapshots ({images.length})</span>
                  <span style={{ fontSize: 10, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>Auto Buffered</span>
                </div>
                <div className="filmstrip-grid">
                  {images.length === 0
                    ? [...Array(6)].map((_, i) => <div key={i} className="filmstrip-empty">Frame {i+1}</div>)
                    : images.slice(0, 6).map((img, i) => (
                      <div className="filmstrip-thumb" key={i} title={`Frame ${i+1}`}>
                        <img src={img.url} alt={`Snapshot ${i+1}`} />
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* AI Plant Pathologist Diagnosis Card */}
              <div className="ai-diagnosis-card">
                <div className="ai-doc-header">
                  <div className="ai-doc-title">
                    <span>🩺</span> AI Plant Pathologist · Disease Diagnosis
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                    {parsedDisease ? "DIAGNOSIS ACTIVE" : "SCANNER STANDBY"}
                  </span>
                </div>

                {parsedDisease ? (
                  <>
                    <div
                      className="ai-diag-banner"
                      style={{
                        background: `${getSeverityColor(parsedDisease.Severity)}14`,
                        border: `1px solid ${getSeverityColor(parsedDisease.Severity)}35`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 9.5, color: "var(--text-sub)", textTransform: "uppercase", fontWeight: 700 }}>
                          Detected Pathology
                        </div>
                        <div className="ai-diag-name" style={{ color: getSeverityColor(parsedDisease.Severity) }}>
                          {parsedDisease.Severity === "None" ? "✅ Leaf Foliage Healthy" : `⚠️ ${parsedDisease.Disease}`}
                        </div>
                      </div>
                      <span
                        className="ai-diag-sev"
                        style={{
                          background: `${getSeverityColor(parsedDisease.Severity)}22`,
                          color: getSeverityColor(parsedDisease.Severity),
                          border: `1px solid ${getSeverityColor(parsedDisease.Severity)}45`,
                        }}
                      >
                        {parsedDisease.Severity || "NORMAL"}
                      </span>
                    </div>

                    <div className="ai-doc-columns">
                      <div className="ai-doc-box">
                        <div className="ai-doc-k">💊 Treatment Protocol</div>
                        <div className="ai-doc-v">{parsedDisease.Treatment}</div>
                      </div>
                      <div className="ai-doc-box">
                        <div className="ai-doc-k">🛡️ Preventive Care</div>
                        <div className="ai-doc-v">{parsedDisease.Prevention}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="ai-ready-guide">
                    <div className="ai-guide-icon">🌿</div>
                    <div>
                      <div className="ai-guide-h">Optical Pathologist Standing By</div>
                      <div className="ai-guide-p">
                        Click <strong>Analyze Camera Frame</strong> or upload a high-resolution leaf photograph to scan for fungal blight, powdery mildew, bacterial spot, and micro-nutrient deficiencies.
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* ════════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════════ */}
        <footer className="dashboard-footer">
          <div>
            <strong>SMART FARM</strong> — Intelligent IoT-Based Smart Irrigation &amp; Crop Monitoring System
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            Final Year B.Tech Project · Next.js + NestJS + PostgreSQL + Gemini Vision AI · India 🇮🇳
          </div>
        </footer>

        {/* ════════════════════════════════════════════════════════════
            AI LOCAL UPLOAD RESULT MODAL
        ════════════════════════════════════════════════════════════ */}
        {aiModalOpen && (
          <div className="modal-overlay" onClick={() => setAiModalOpen(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🤖</span> AI Upload Diagnosis Result
                </div>
                <button
                  onClick={() => setAiModalOpen(false)}
                  style={{ background: "none", border: "none", color: "var(--text-sub)", cursor: "pointer", fontSize: 18 }}
                >
                  ✕
                </button>
              </div>

              {aiError ? (
                <div style={{ color: "var(--rose)", fontSize: 13, lineHeight: 1.6 }}>
                  ⚠️ {aiError}
                </div>
              ) : aiResult ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {aiResult.imageUrl && (
                    <img
                      src={aiResult.imageUrl}
                      alt="Uploaded plant specimen"
                      style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{aiResult.disease}</div>
                    <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                      Confidence: {Math.round(aiResult.confidence * 100)}% · Severity: {aiResult.severity}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.8 }}>Recommendation</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{aiResult.recommendation}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.8 }}>Fertilizer &amp; Nutrition</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{aiResult.fertilizerSuggestion}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.8 }}>Irrigation Guidance</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{aiResult.wateringSuggestion}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
