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

  // Interactive logs tab switcher (removes empty bottom holes)
  const [activeLogTab, setActiveLogTab] = useState<"readings" | "relays" | "ai">("readings");
  const [refreshing, setRefreshing] = useState(false);

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
    if (!status) return "#34d399";
    if (status === "GOOD" || status === "NORMAL") return "#34d399";
    if (status === "WARNING") return "#fbbf24";
    return "#f87171";
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
    if (!severity || severity === "None") return "#34d399";
    if (severity === "Mild") return "#a3e635";
    if (severity === "Moderate") return "#fbbf24";
    if (severity === "Severe") return "#f87171";
    return "#94a3b8";
  };

  const getValueStatus = (value: number, low: number, high: number) => {
    if (value < low) return { color: "#fbbf24", label: "LOW" };
    if (value > high) return { color: "#f87171", label: "HIGH" };
    return { color: "#34d399", label: "OK" };
  };

  const clamp = (v: number, min: number, max: number) =>
    Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

  const sensors = latest ? [
    { icon: "🌡️", label: "Temperature", value: latest.temperature, unit: "°C", low: 15, high: 35 },
    { icon: "💧", label: "Humidity", value: latest.humidity, unit: "%", low: 40, high: 80 },
    { icon: "🧪", label: "pH Level", value: latest.ph, unit: "", low: 5, high: 8 },
    { icon: "🌱", label: "Soil Moisture", value: latest.soilMoisture, unit: "%", low: 30, high: 80 },
    { icon: "🔬", label: "Nitrogen (N)", value: latest.nitrogen, unit: "mg/kg", low: 20, high: 150 },
    { icon: "⚗️", label: "Phosphorus (P)", value: latest.phosphorus, unit: "mg/kg", low: 10, high: 100 },
    { icon: "💎", label: "Potassium (K)", value: latest.potassium, unit: "mg/kg", low: 20, high: 200 },
  ] : [];

  const pumpActive = devices[0]?.pumpStatus === "ON";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg-deep: #06090e;
          --bg-panel: rgba(13, 20, 32, 0.75);
          --bg-card: rgba(18, 27, 44, 0.65);
          --border: rgba(255, 255, 255, 0.08);
          --border-bright: rgba(52, 211, 153, 0.35);
          --emerald: #10b981;
          --mint: #34d399;
          --cyan: #06b6d4;
          --amber: #f59e0b;
          --rose: #f43f5e;
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --text-sub: #64748b;
          --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        body {
          background-color: var(--bg-deep);
          color: var(--text-main);
          font-family: var(--font-sans);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ── GLOWING ATMOSPHERIC BACKGROUND ── */
        .ambient-field {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(circle 600px at 15% 10%, rgba(16, 185, 129, 0.09), transparent),
            radial-gradient(circle 500px at 85% 20%, rgba(6, 182, 212, 0.08), transparent),
            radial-gradient(circle 800px at 50% 85%, rgba(16, 185, 129, 0.05), transparent),
            linear-gradient(180deg, #06090e 0%, #090e17 100%);
        }
        .ambient-grid {
          position: absolute; inset: 0; opacity: 0.25;
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        .layout-root { position: relative; z-index: 1; max-width: 1480px; margin: 0 auto; padding: 0 24px 40px; }

        /* ── PRO NAVBAR ── */
        .header-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 0; margin-bottom: 20px; border-bottom: 1px solid var(--border);
        }
        .header-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .brand-badge {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; box-shadow: 0 0 20px rgba(16,185,129,0.35);
        }
        .brand-title { font-weight: 800; font-size: 19px; color: #fff; letter-spacing: -0.4px; }
        .brand-title span { color: var(--mint); }
        .brand-sub { font-size: 11px; color: var(--text-sub); font-family: var(--font-mono); }

        .nav-items { display: flex; gap: 8px; align-items: center; }
        .nav-link {
          color: var(--text-muted); text-decoration: none; font-size: 13px; font-weight: 600;
          padding: 7px 14px; border-radius: 8px; transition: all 0.2s;
        }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .nav-link.active { color: var(--mint); background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2); }
        .nav-btn {
          background: none; border: none; cursor: pointer; color: var(--text-muted); font-family: inherit; font-size: 13px; font-weight: 600;
          padding: 7px 14px; border-radius: 8px; transition: all 0.2s;
        }
        .nav-btn:hover { color: var(--rose); background: rgba(244,63,94,0.08); }

        /* ── COMMAND DECK / TOP STATS BAR (ELIMINATES EMPTY HERO VOID) ── */
        .cmd-deck {
          background: var(--bg-panel);
          border: 1px solid var(--border);
          border-radius: 18px; padding: 18px 24px;
          backdrop-filter: blur(16px);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px; margin-bottom: 22px;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        .cmd-left { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
        .system-pill {
          display: flex; align-items: center; gap: 9px;
          padding: 6px 14px; border-radius: 100px;
          background: rgba(16,185,129,0.1); border: 1px solid rgba(52,211,153,0.3);
          font-size: 12px; font-weight: 700; color: var(--mint); font-family: var(--font-mono);
        }
        .pulse-beacon {
          width: 8px; height: 8px; border-radius: 50%; background: var(--mint);
          box-shadow: 0 0 10px var(--mint);
          animation: beaconPulse 1.8s infinite;
        }
        @keyframes beaconPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52,211,153,0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(52,211,153,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52,211,153,0); }
        }
        .meta-stat-group { display: flex; gap: 20px; align-items: center; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-lbl { font-size: 10px; text-transform: uppercase; color: var(--text-sub); font-weight: 700; letter-spacing: 0.5px; }
        .meta-val { font-size: 13.5px; font-weight: 700; color: var(--text-main); font-family: var(--font-mono); }

        .cmd-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .action-chip {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; border: 1px solid var(--border);
          background: rgba(255,255,255,0.04); color: var(--text-main); font-family: var(--font-sans);
        }
        .action-chip:hover {
          background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.18); transform: translateY(-1px);
        }
        .action-chip.primary {
          background: linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(5,150,105,0.2) 100%);
          border-color: rgba(52,211,153,0.4); color: #ecfdf5;
        }
        .action-chip.primary:hover {
          background: linear-gradient(135deg, rgba(16,185,129,0.45) 0%, rgba(5,150,105,0.35) 100%);
          box-shadow: 0 0 16px rgba(16,185,129,0.3);
        }
        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* ── SENSOR BENTO STRIP (7 GAUGES) ── */
        .sensor-bento {
          display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 12px; margin-bottom: 24px;
        }
        @media(max-width: 1240px){ .sensor-bento { grid-template-columns: repeat(4, minmax(0,1fr)); } }
        @media(max-width: 768px){ .sensor-bento { grid-template-columns: repeat(2, minmax(0,1fr)); } }

        .s-gauge-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px; padding: 14px;
          backdrop-filter: blur(12px);
          position: relative; overflow: hidden;
          transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .s-gauge-card:hover {
          border-color: var(--accent-glow, var(--mint));
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -6px rgba(0,0,0,0.5), 0 0 16px -4px var(--accent-glow, var(--mint));
        }
        .s-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .s-icon-pill {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;
          font-size: 15px; border: 1px solid rgba(255,255,255,0.06);
        }
        .s-status-tag {
          font-size: 9px; font-weight: 800; font-family: var(--font-mono);
          padding: 2px 7px; border-radius: 6px; letter-spacing: 0.4px;
        }
        .s-label-txt { font-size: 10px; color: var(--text-sub); font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
        .s-val-display { font-size: 21px; font-weight: 800; font-family: var(--font-mono); letter-spacing: -0.5px; margin-bottom: 8px; display: flex; align-items: baseline; }
        .s-unit-sub { font-size: 11px; font-weight: 600; color: var(--text-sub); margin-left: 3px; }
        .s-range-meta { display: flex; justify-content: space-between; font-size: 9px; color: var(--text-sub); font-family: var(--font-mono); margin-bottom: 5px; }
        .s-progress-track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; }
        .s-progress-fill { height: 100%; border-radius: 10px; transition: width 0.8s ease; }

        /* ── BALANCED 2-COLUMN COCKPIT (ZERO EMPTY SPACE) ── */
        .cockpit-grid {
          display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.25fr);
          gap: 20px; align-items: start;
        }
        @media(max-width: 1060px){ .cockpit-grid { grid-template-columns: minmax(0, 1fr); } }

        /* ── SECTION PANELS ── */
        .bento-panel {
          background: var(--bg-panel);
          border: 1px solid var(--border);
          border-radius: 18px; padding: 20px;
          backdrop-filter: blur(16px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          margin-bottom: 20px;
        }
        .panel-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
        }
        .panel-title {
          font-size: 12.5px; font-weight: 800; color: #fff; text-transform: uppercase;
          letter-spacing: 1px; display: flex; align-items: center; gap: 9px;
        }
        .title-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }

        /* ── LIVE CAMERA HUD ── */
        .cam-frame {
          position: relative; border-radius: 14px; overflow: hidden; background: #000;
          aspect-ratio: 16/9; border: 1px solid var(--border);
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        .cam-corner-tag {
          position: absolute; width: 14px; height: 14px; border-color: rgba(52,211,153,0.7);
          border-style: solid; z-index: 5; pointer-events: none;
        }
        .cam-corner-tag.tl { top: 8px; left: 8px; border-width: 2px 0 0 2px; }
        .cam-corner-tag.tr { top: 8px; right: 8px; border-width: 2px 2px 0 0; }
        .cam-corner-tag.bl { bottom: 8px; left: 8px; border-width: 0 0 2px 2px; }
        .cam-corner-tag.br { bottom: 8px; right: 8px; border-width: 0 2px 2px 0; }
        .cam-feed { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cam-wait { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-sub); font-size: 13px; gap: 8px; }
        .cam-badge-live {
          position: absolute; top: 12px; left: 12px;
          display: flex; align-items: center; gap: 7px;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
          border: 1px solid rgba(244,63,94,0.4); padding: 5px 12px; border-radius: 100px;
          font-size: 10px; color: #fca5a5; font-weight: 800; letter-spacing: 0.8px;
        }
        .cam-badge-right {
          position: absolute; top: 12px; right: 12px;
          display: flex; align-items: center; gap: 6px;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
          border: 1px solid var(--border); padding: 5px 11px; border-radius: 100px;
          font-size: 10px; font-weight: 700; font-family: var(--font-mono);
        }

        .cam-metrics-grid {
          display: grid; grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 8px; margin-top: 12px;
        }
        .cam-metric-box {
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          border-radius: 10px; padding: 8px 10px; text-align: center;
        }
        .cam-metric-k { font-size: 9px; text-transform: uppercase; color: var(--text-sub); font-weight: 700; margin-bottom: 2px; }
        .cam-metric-v { font-size: 12px; font-weight: 700; color: #fff; font-family: var(--font-mono); }

        /* ── CAMERA ACTIONS & SNAPSHOT TRAY (FILLS EMPTY SPACE) ── */
        .vision-action-bar {
          display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap;
        }
        .btn-ai-scan {
          flex: 1; padding: 11px 16px; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          color: #fff; font-size: 13px; font-weight: 700; font-family: var(--font-sans);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 18px rgba(139,92,246,0.35); transition: all 0.2s;
        }
        .btn-ai-scan:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(139,92,246,0.45); }
        .btn-ai-scan:disabled { opacity: 0.55; cursor: not-allowed; }

        .btn-upload-leaf {
          padding: 11px 16px; border-radius: 12px; cursor: pointer;
          background: rgba(255,255,255,0.05); border: 1px solid var(--border);
          color: var(--text-main); font-size: 13px; font-weight: 700; font-family: var(--font-sans);
          display: flex; align-items: center; gap: 8px; transition: all 0.2s;
        }
        .btn-upload-leaf:hover:not(:disabled) { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.18); }

        .snapshot-tray { margin-top: 14px; }
        .tray-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .tray-lbl { font-size: 10.5px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.6px; }
        .tray-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 8px; }
        .tray-thumb {
          aspect-ratio: 1; border-radius: 8px; overflow: hidden;
          border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; background: rgba(0,0,0,0.3);
        }
        .tray-thumb:hover { border-color: var(--mint); transform: scale(1.06); }
        .tray-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .tray-empty-skel {
          aspect-ratio: 1; border-radius: 8px; background: rgba(255,255,255,0.03);
          border: 1px dashed rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center;
          font-size: 10px; color: var(--text-sub);
        }

        /* ── AI PLANT DOCTOR CARD (INTEGRATED UNDER CAMERA TO ELIMINATE VOID) ── */
        .ai-doctor-card {
          margin-top: 16px; border-radius: 14px; padding: 16px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
        }
        .ai-doc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .ai-doc-title { font-size: 14px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; }
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
        .ai-doc-v { font-size: 12.5px; color: var(--text-muted); line-height: 1.5; }

        .ai-ready-guide {
          display: flex; align-items: center; gap: 14px; padding: 12px 14px;
          border-radius: 12px; background: rgba(139,92,246,0.06); border: 1px dashed rgba(139,92,246,0.25);
        }
        .ai-guide-icon { font-size: 26px; }
        .ai-guide-h { font-size: 13px; font-weight: 700; color: #d8b4fe; margin-bottom: 2px; }
        .ai-guide-p { font-size: 11.5px; color: var(--text-sub); line-height: 1.4; }

        /* ── CYBER SWITCHBOARD (6 RELAYS) ── */
        .switch-grid {
          display: grid; grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 10px; margin-bottom: 16px;
        }
        @media(max-width:580px){ .switch-grid { grid-template-columns: minmax(0,1fr); } }

        .switch-tile {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 13px 15px; border-radius: 13px; cursor: pointer; text-align: left;
          border: 1px solid var(--border); background: rgba(255,255,255,0.03);
          color: var(--text-main); font-family: var(--font-sans);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .switch-tile:hover:not(:disabled) {
          border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.06);
          transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }
        .switch-tile.active {
          background: linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.08) 100%);
          border-color: rgba(52,211,153,0.5);
          box-shadow: 0 0 18px rgba(16,185,129,0.22), inset 0 1px 0 rgba(52,211,153,0.25);
        }
        .switch-left { display: flex; align-items: center; gap: 10px; }
        .switch-icon-box {
          width: 36px; height: 36px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
        }
        .switch-tile.active .switch-icon-box {
          background: rgba(52,211,153,0.2); border-color: rgba(52,211,153,0.4);
        }
        .switch-title { font-size: 13px; font-weight: 700; color: #fff; }
        .switch-sub { font-size: 10.5px; color: var(--text-sub); margin-top: 1px; }

        .switch-pill {
          padding: 4px 10px; border-radius: 100px;
          font-family: var(--font-mono); font-size: 10px; font-weight: 800;
          display: flex; align-items: center; gap: 5px;
          border: 1px solid var(--border); background: rgba(0,0,0,0.4);
          color: var(--text-sub); transition: all 0.2s;
        }
        .switch-tile.active .switch-pill {
          background: rgba(16,185,129,0.25); border-color: rgba(52,211,153,0.6);
          color: #ecfdf5; box-shadow: 0 0 8px rgba(52,211,153,0.3);
        }
        .switch-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-sub); }
        .switch-tile.active .switch-dot {
          background: var(--mint); box-shadow: 0 0 8px var(--mint);
          animation: beaconPulse 1.4s infinite;
        }

        /* ── MASTER PUMP CONTROLLER BAR ── */
        .master-pump-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 13px 16px; border-radius: 13px;
          background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.22);
          margin-bottom: 16px;
        }
        .pump-info { display: flex; align-items: center; gap: 10px; }
        .pump-icon { font-size: 20px; }
        .pump-label { font-size: 13px; font-weight: 700; color: #fff; }
        .pump-desc { font-size: 11px; color: var(--text-sub); }
        .pump-btn {
          padding: 8px 16px; border-radius: 9px; border: none; cursor: pointer;
          font-size: 11.5px; font-weight: 800; font-family: var(--font-mono);
          letter-spacing: 0.5px; transition: all 0.2s;
        }
        .pump-btn.on {
          background: var(--mint); color: #064e3b; box-shadow: 0 0 12px rgba(52,211,153,0.4);
        }
        .pump-btn.off {
          background: rgba(255,255,255,0.08); color: var(--text-muted);
        }
        .pump-btn:hover:not(:disabled) { transform: translateY(-1px); }

        /* ── INTERACTIVE TABBED TELEMETRY HUB (ZERO DEAD SPACE) ── */
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

        .telemetry-list { display: flex; flex-direction: column; gap: 7px; max-height: 270px; overflow-y: auto; padding-right: 4px; }
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
        .cockpit-footer {
          margin-top: 30px; text-align: center; font-size: 11.5px; color: var(--text-sub);
          padding-top: 20px; border-top: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
        }

        /* ── AI MODAL ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 200; padding: 20px; backdrop-filter: blur(6px);
        }
        .modal-box {
          background: #0f172a; border: 1px solid var(--border);
          border-radius: 18px; padding: 24px; maxWidth: 460px; width: 100%;
          box-shadow: 0 24px 60px rgba(0,0,0,0.7);
        }
      `}</style>

      {/* Atmospheric dynamic glow */}
      <div className="ambient-field" aria-hidden="true">
        <div className="ambient-grid"></div>
      </div>

      <div className="layout-root">
        {/* ── NAVBAR ── */}
        <header className="header-bar">
          <Link href="/" className="header-brand">
            <div className="brand-badge">🌾</div>
            <div>
              <div className="brand-title">Agro<span>Sense</span> Pro</div>
              <div className="brand-sub">Smart Greenhouse Telemetry</div>
            </div>
          </Link>
          <nav className="nav-items">
            <Link href="/" className="nav-link active">Dashboard</Link>
            <Link href="/crop" className="nav-link">Crops</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/contact" className="nav-link">Contact</Link>
            {user ? (
              <button className="nav-btn" onClick={() => { logout(); router.push("/login"); }}>
                Logout ({user.name})
              </button>
            ) : (
              <Link href="/login" className="nav-link">Login</Link>
            )}
          </nav>
        </header>

        {/* ── COMMAND DECK (HIGH-DENSITY HEADER, REPLACES BLOATED HERO) ── */}
        <div className="cmd-deck">
          <div className="cmd-left">
            <div className="system-pill">
              <span className="pulse-beacon"></span>
              {isOnline ? "ESP32-0001 ACTIVE" : "ESP32 STANDBY"}
            </div>
            <div className="meta-stat-group">
              <div className="meta-item">
                <span className="meta-lbl">Greenhouse Zone</span>
                <span className="meta-val">Sector A-1</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Last Synced</span>
                <span className="meta-val">{lastUpdated || "Live 5s Polling"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">System Risk</span>
                <span className="meta-val" style={{ color: getStatusColor(latest?.status) }}>
                  {latest?.status || "OPTIMAL"}
                </span>
              </div>
            </div>
          </div>

          <div className="cmd-actions">
            <button
              className="action-chip primary"
              onClick={handleManualRefresh}
              disabled={refreshing}
            >
              <span className={refreshing ? "spin" : ""}>🔄</span>
              {refreshing ? "Syncing..." : "Sync Telemetry"}
            </button>

            <button
              className={`action-chip ${pumpActive ? "primary" : ""}`}
              onClick={togglePump}
              disabled={pumpLoading || !devices[0]}
            >
              <span>💧</span>
              {pumpLoading ? "Updating..." : `Master Pump: ${pumpActive ? "ON" : "OFF"}`}
            </button>

            <Link href="/crop" className="action-chip">
              <span>🌱</span> 100 Crop Library →
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.3)", color: "#fca5a5", padding: "12px 18px", borderRadius: 12, marginBottom: 18, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── SENSOR BENTO STRIP (7 GAUGES IN COMPACT ROW) ── */}
        <div className="sensor-bento">
          {!latest
            ? [...Array(7)].map((_, i) => (
              <div key={i} style={{ height: 116, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}></div>
            ))
            : sensors.map((s) => {
              const st = getValueStatus(s.value, s.low, s.high);
              const pct = clamp(s.value, s.low, s.high);
              return (
                <div
                  className="s-gauge-card"
                  key={s.label}
                  style={{ "--accent-glow": st.color } as React.CSSProperties}
                >
                  <div className="s-top-row">
                    <div className="s-icon-pill">{s.icon}</div>
                    <span className="s-status-tag" style={{ background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}35` }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="s-label-txt">{s.label}</div>
                  <div className="s-val-display" style={{ color: st.color }}>
                    {s.value}
                    <span className="s-unit-sub">{s.unit}</span>
                  </div>
                  <div className="s-range-meta">
                    <span>{s.low}{s.unit}</span>
                    <span>{s.high}{s.unit}</span>
                  </div>
                  <div className="s-progress-track">
                    <div className="s-progress-fill" style={{ width: `${pct}%`, background: st.color }}></div>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* ── BALANCED MAIN COCKPIT (ZERO DEAD SPACE) ── */}
        <div className="cockpit-grid">

          {/* ══ LEFT HUB: VISION & AI DIAGNOSTICS (SEAMLESSLY STACKED) ══ */}
          <div>
            <div className="bento-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="title-dot" style={{ background: "var(--rose)" }}></span>
                  Live Field Camera · Zone A-1
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--rose)", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--rose)", animation: "beaconPulse 1.5s infinite" }}></span>
                  FEED ACTIVE
                </div>
              </div>

              {/* Camera Frame */}
              <div className="cam-frame">
                <span className="cam-corner-tag tl"></span>
                <span className="cam-corner-tag tr"></span>
                <span className="cam-corner-tag bl"></span>
                <span className="cam-corner-tag br"></span>
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt="Live camera feed"
                    className={`cam-feed ${camPulse ? "pulse" : ""}`}
                  />
                ) : (
                  <div className="cam-wait">Connecting to camera feed…</div>
                )}
                <div className="cam-badge-live">● LIVE HUD</div>
                <div className="cam-badge-right" style={{ color: isOnline ? "var(--mint)" : "var(--rose)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "var(--mint)" : "var(--rose)" }}></span>
                  {isOnline ? "1080p · ONLINE" : "OFFLINE"}
                </div>
              </div>

              {/* Camera Telemetry Bar */}
              <div className="cam-metrics-grid">
                <div className="cam-metric-box">
                  <div className="cam-metric-k">Camera Node</div>
                  <div className="cam-metric-v">ESP32-CAM</div>
                </div>
                <div className="cam-metric-box">
                  <div className="cam-metric-k">Stream Cadence</div>
                  <div className="cam-metric-v">1s Refresh</div>
                </div>
                <div className="cam-metric-box">
                  <div className="cam-metric-k">Lens Focus</div>
                  <div className="cam-metric-v">Crop Canopy</div>
                </div>
                <div className="cam-metric-box">
                  <div className="cam-metric-k">Vision Engine</div>
                  <div className="cam-metric-v">Gemini 1.5</div>
                </div>
              </div>

              {/* Action Buttons: Analyze Feed & Upload Photo */}
              <div className="vision-action-bar">
                <button
                  className="btn-ai-scan"
                  onClick={analyzeLatestImage}
                  disabled={analyzing || images.length === 0}
                >
                  {analyzing ? "⏳ Diagnosing with Gemini..." : "🤖 Analyze Camera Feed"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelected}
                  style={{ display: "none" }}
                />
                <button
                  className="btn-upload-leaf"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={aiAnalyzing}
                >
                  {aiAnalyzing ? "⏳ Uploading..." : "📤 Upload Leaf Photo"}
                </button>
              </div>

              {/* Captured Snapshots Strip */}
              <div className="snapshot-tray">
                <div className="tray-head">
                  <span className="tray-lbl">Recent Optical Frames ({images.length})</span>
                  <span style={{ fontSize: 10, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>Auto Stored</span>
                </div>
                <div className="tray-grid">
                  {images.length === 0
                    ? [...Array(6)].map((_, i) => <div key={i} className="tray-empty-skel">Frame {i+1}</div>)
                    : images.slice(0, 6).map((img, i) => (
                      <div className="tray-thumb" key={i} title={`Frame ${i+1}`}>
                        <img src={img.url} alt={`Snapshot ${i+1}`} />
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* AI Diagnosis Result or Intelligent Ready State (Fills space meaningfully) */}
              <div className="ai-doctor-card">
                <div className="ai-doc-header">
                  <div className="ai-doc-title">
                    <span>🩺</span> AI Plant Pathologist · Gemini Vision
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                    {parsedDisease ? "DIAGNOSIS ACTIVE" : "STANDBY SCANNER"}
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
                          Detected Condition
                        </div>
                        <div className="ai-diag-name" style={{ color: getSeverityColor(parsedDisease.Severity) }}>
                          {parsedDisease.Severity === "None" ? "✅ Leaf Tissue Healthy" : `⚠️ ${parsedDisease.Disease}`}
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
                      <div className="ai-guide-h">Optical Scanner Standing By</div>
                      <div className="ai-guide-p">
                        Click <strong>Analyze Camera Feed</strong> or upload a leaf photo to diagnose powdery mildew, chlorosis, blight, or nutrient deficiencies instantly.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ RIGHT HUB: AUTOMATION, RELAYS & TELEMETRY HUB ══ */}
          <div>
            {/* 1. Microclimate Advisory Banner */}
            <div className="bento-panel" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ fontSize: 24 }}>{getRecommendationIcon()}</div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--text-sub)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Microclimate Advisory Engine
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                      {getRecommendation()}
                    </div>
                  </div>
                </div>
                <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "var(--mint)", fontSize: 10.5, fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                  AUTO-BALANCED
                </div>
              </div>
            </div>

            {/* 2. Switchboard (6 Relays) + Master Pump */}
            <div className="bento-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="title-dot" style={{ background: "var(--amber)" }}></span>
                  Actuator & Relay Switchboard
                </div>
                <span style={{ fontSize: 10.5, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                  6 Independent Channels
                </span>
              </div>

              {relayError && (
                <div style={{ fontSize: 11.5, color: "var(--rose)", marginBottom: 10 }}>
                  ⚠️ {relayError}
                </div>
              )}

              {/* 6 Relay Actuator Grid */}
              <div className="switch-grid">
                {[
                  { key: "nitrogen", icon: "🧪", label: "Nitrogen Line", sub: "N dosing injector" },
                  { key: "phosphorus", icon: "⚗️", label: "Phosphorus Line", sub: "P nutrient feed" },
                  { key: "potassium", icon: "💎", label: "Potassium Line", sub: "K enrichment valve" },
                  { key: "water", icon: "🚿", label: "Drip Irrigation", sub: "Main water supply" },
                  { key: "fan", icon: "🌀", label: "Ventilation Fan", sub: "Air circulation unit" },
                  { key: "bulb", icon: "💡", label: "Growth Lighting", sub: "Photosynthesis bulb" },
                ].map((r) => {
                  const isOn = relayStatus?.[r.key] === "ON";
                  const isLoading = relayLoadingKey === r.key;
                  return (
                    <button
                      key={r.key}
                      className={`switch-tile ${isOn ? "active" : ""}`}
                      onClick={() => toggleRelay(r.key)}
                      disabled={isLoading || !devices[0]}
                      type="button"
                    >
                      <div className="switch-left">
                        <div className="switch-icon-box">{r.icon}</div>
                        <div>
                          <div className="switch-title">{r.label}</div>
                          <div className="switch-sub">{r.sub}</div>
                        </div>
                      </div>
                      <div className="switch-pill">
                        <span className="switch-dot"></span>
                        {isLoading ? "SYNC..." : isOn ? "ON" : "OFF"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Master Water Pump Override Bar */}
              <div className="master-pump-bar">
                <div className="pump-info">
                  <span className="pump-icon">🚰</span>
                  <div>
                    <div className="pump-label">Primary Drip Irrigation Pump</div>
                    <div className="pump-desc">Direct solenoid valve override for Greenhouse Zone A-1</div>
                  </div>
                </div>
                <button
                  className={`pump-btn ${pumpActive ? "on" : "off"}`}
                  onClick={togglePump}
                  disabled={pumpLoading || !devices[0]}
                  type="button"
                >
                  {pumpLoading ? "UPDATING..." : pumpActive ? "PUMP ACTIVE [ON]" : "STANDBY [OFF]"}
                </button>
              </div>
            </div>

            {/* 3. Interactive Telemetry Center (Tabs for Readings, Relays, AI logs) */}
            <div className="bento-panel">
              <div className="telemetry-tabs-bar">
                <div className="tab-switcher">
                  <button
                    className={`tab-btn ${activeLogTab === "readings" ? "active" : ""}`}
                    onClick={() => setActiveLogTab("readings")}
                    type="button"
                  >
                    📡 Live Sensor Telemetry
                  </button>
                  <button
                    className={`tab-btn ${activeLogTab === "relays" ? "active" : ""}`}
                    onClick={() => setActiveLogTab("relays")}
                    type="button"
                  >
                    ⚡ Relay Activity
                  </button>
                  <button
                    className={`tab-btn ${activeLogTab === "ai" ? "active" : ""}`}
                    onClick={() => setActiveLogTab("ai")}
                    type="button"
                  >
                    🤖 AI Scan Logs
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
                    .slice(0, 6)
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
                    relayHistory.slice(0, 6).map((item) => (
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
                    imageHistory.slice(0, 6).map((item, idx) => {
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
        </div>

        {/* ── FOOTER ── */}
        <footer className="cockpit-footer">
          <div>AgroSense Precision Agriculture · Enterprise Smart Irrigation Engine</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            Next.js 16 · NestJS 11 · PostgreSQL 15 · Gemini Vision AI · India 🇮🇳
          </div>
        </footer>

        {/* ── LOCAL FILE UPLOAD RESULT MODAL ── */}
        {aiModalOpen && (
          <div className="modal-overlay" onClick={() => setAiModalOpen(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🤖</span> AI Upload Diagnosis
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
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.8 }}>Fertilizer & Nutrition</div>
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
