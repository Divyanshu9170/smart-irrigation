# 🌱 SMART FARM — Intelligent IoT-Based Smart Irrigation & Crop Monitoring System

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/NestJS-11.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Google_Gemini-AI_Vision-8E75C2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/ESP32-IoT_Hardware-E7352C?style=for-the-badge&logo=espressif&logoColor=white" alt="ESP32" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 📌 Overview

**SMART FARM** (also known as **AgroSense**) is an end-to-end, enterprise-grade Precision Agriculture and Smart Greenhouse Automation platform. Built as an advanced final-year engineering capstone project, it bridges physical **IoT sensor telemetry (ESP32)** with a scalable **NestJS & PostgreSQL** backend and a **Next.js 16 + React 19** interactive 3D frontend dashboard.

The system is equipped with **Google Gemini AI** vision diagnostics for instant plant disease detection, automated moisture-threshold irrigation, remote device relay control, and a comprehensive database of greenhouse crop profiles.

---

## 🌟 Key Highlights & Features

### 1. 📡 Real-Time IoT Telemetry & Sensor Monitoring
- **Multi-Sensor Suite**: Live monitoring of **Ambient Temperature**, **Relative Humidity**, **Soil Moisture**, **Soil pH**, and **NPK Macronutrients (Nitrogen, Phosphorus, Potassium)**.
- **Intelligent Fallback Engine**: If physical ESP32 hardware is offline or disconnected, the dashboard automatically simulates realistic dynamic agronomic conditions with clear visual status tags, ensuring smooth demo presentations anytime, anywhere.

### 2. ⚡ Intelligent Automation & Remote Relay Switching
- **4-Channel Relay Control**: Remote manual switching and automated trigger mechanisms for:
  - Submersible Water Pumps
  - Solenoid Drip Irrigation Valves
  - Greenhouse Exhaust & Ventilation Fans
  - High-Efficiency Grow Lights / Misting Sprinklers
- **Automated Irrigation Logic**: Triggers water pumps when soil moisture drops below crop-specific critical thresholds and disengages once target hydration is achieved.

### 3. 🧠 AI Plant Doctor & Leaf Disease Detection (Gemini Vision)
- **Visual Diagnostics**: Upload leaf photos directly from mobile/desktop or ingest frames from an **ESP32-CAM** module.
- **Instant AI Analysis**: Powered by `@google/generative-ai` to detect fungal, bacterial, viral, or pest infections, complete with confidence scores, prevention tips, and organic/chemical remedy plans.

### 4. 🎨 Modern 3D Interactive UI & Dashboard
- **Immersive 3D Hero Section**: Interactive Canvas particle system with glowing organic agricultural nodes.
- **Telemetry Cards & Live Gauges**: Glassmorphic cards with responsive trend indicators and color-coded safe/warning thresholds.
- **Full Device Responsiveness**: Optimized across desktop workstations, tablets, and mobile devices.

### 5. 🔐 Robust Authentication & Account Recovery
- **Security**: JWT-based session tokens with bcrypt salt-hashed passwords.
- **Forgot Password Modal**: Self-service interactive password reset flow with email trimming, case-insensitivity, and instant auto-login.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Hardware ["🌱 IoT Hardware Layer (ESP32)"]
        Sensors["DHT22 (Temp & Hum)<br/>Capacitive Moisture Sensor<br/>Soil pH & NPK Sensors"]
        Relays["4-Channel Relay Module<br/>(Pumps, Solenoids, Fans, Lights)"]
        Cam["ESP32-CAM Module"]
        ESP["ESP32 Microcontroller (Wi-Fi/HTTP)"]
        
        Sensors -->|Analog / Digital| ESP
        ESP -->|Control Signals| Relays
        Cam -->|JPEG Snapshots| ESP
    end

    subgraph Backend ["⚙️ Cloud & Backend Layer (NestJS 11)"]
        API["REST API & WebSockets"]
        AuthModule["Auth & Security (JWT + Bcrypt)"]
        SensorModule["Sensor Telemetry Engine"]
        DeviceModule["Relay & Device Controller"]
        AIModule["Google Gemini Vision AI"]
        
        ESP -->|POST /sensor-readings| SensorModule
        ESP -->|GET /devices/status| DeviceModule
        API --- AuthModule
        API --- SensorModule
        API --- DeviceModule
        API --- AIModule
    end

    subgraph Database ["🗄️ Persistence Layer"]
        PG[("PostgreSQL 15 (Docker)")]
        SensorModule -->|Store Readings| PG
        DeviceModule -->|Sync State| PG
        AuthModule -->|User Profiles| PG
    end

    subgraph Frontend ["💻 Modern Dashboard (Next.js 16 + React 19)"]
        Hero["3D Particle Canvas Banner"]
        LiveCards["Live Sensor Telemetry Grid"]
        RelayPanel["Interactive Relay Switcher"]
        AICropDoctor["AI Leaf Diagnostic Studio"]
        CropDB["100+ Crop Encyclopedia"]
        
        Frontend -->|Fetch Telemetry & Relay Control| API
    end
```

---

## 🛠️ Tech Stack Details

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16.1 (App Router)** | Turbo-packed React 19 server and client components |
| **Styling & Icons** | **Tailwind CSS v4** + Syne / DM Sans | Modern glassmorphism, responsive grid, bespoke typography |
| **3D & Canvas** | **HTML5 Canvas 2D/3D Engine** | Physics-based particle simulation with dynamic cursor gravity |
| **Backend Framework** | **NestJS 11** | Modular, enterprise TypeScript server architecture |
| **Database & ORM** | **PostgreSQL 15** via **TypeORM** | Relational data persistence with migrations and entity schemas |
| **Authentication** | **Passport JWT** + **Bcrypt** | Stateless token auth with password reset workflows |
| **Artificial Intelligence** | **Google Gemini 1.5 / 2.0 Flash** | Multimodal image understanding and agronomic diagnostics |
| **Hardware & IoT** | **ESP32** (C++ / Arduino IDE) | Wi-Fi HTTP client sending telemetry payloads via JSON |
| **Containerization** | **Docker & Docker Compose** | Isolated microservice orchestration for DB and cache |
| **Deployment** | **Vercel** (Frontend) + Cloud Server | Global edge deployment with high availability |

---

## 🔌 Hardware Specifications & Wiring Guide

| Component | ESP32 Pin | Voltage | Function |
| :--- | :--- | :--- | :--- |
| **DHT22 Sensor** | GPIO 4 | 3.3V - 5V | Ambient Temperature & Relative Humidity |
| **Capacitive Soil Moisture** | GPIO 34 (ADC1) | 3.3V | Volumetric Soil Moisture % (Corrosion-resistant) |
| **Analog pH Sensor** | GPIO 35 (ADC1) | 5V | Soil Acidity / Alkalinity level (0 - 14 pH) |
| **NPK Sensor (RS485)** | GPIO 16 (RX) / 17 (TX) | 5V | Nitrogen, Phosphorus, Potassium content (mg/kg) |
| **Relay 1 (Water Pump)** | GPIO 26 | 5V | Submersible 12V DC Irrigation Pump |
| **Relay 2 (Solenoid Valve)**| GPIO 27 | 5V | Drip Zone Control Solenoid |
| **Relay 3 (Ventilation Fan)**| GPIO 14 | 5V | Greenhouse Cooling Fan |
| **Relay 4 (Grow Lights)** | GPIO 12 | 5V | Full Spectrum Photosynthetic LED Bar |

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.x or newer recommended)
- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL database)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Divyanshu9170/smart-irrigation.git
cd smart-irrigation
```

---

### Step 2: Launch Database via Docker
Start the PostgreSQL database container:
```bash
docker compose up -d
```
*This launches PostgreSQL 15 on port `5432` with credentials defined in `docker-compose.yml`.*

---

### Step 3: Configure & Start Backend (NestJS)
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:
```env
PORT=5000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=smartfarm
DATABASE_PASSWORD=smartfarm123
DATABASE_NAME=smartfarm_db
JWT_SECRET=super_secret_jwt_key_smart_farm_2026
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Build and run the backend server:
```bash
# Development mode
npm run start:dev

# Production build
npm run build
node dist/main.js
```
*Backend will be running at:* `http://localhost:5000`

---

### Step 4: Configure & Start Frontend (Next.js)
Open a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env.local` file inside `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the Next.js development server:
```bash
npm run dev
```
*Frontend will be running at:* `http://localhost:3000`

---

## 📡 REST API Reference

### 🔐 Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | Register a new farmer account | No |
| `POST` | `/auth/login` | Sign in with email and password | No |
| `POST` | `/auth/reset-password` | Reset password using registered email | No |

### 🌡️ Sensor Readings (IoT Ingestion)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/sensor-readings` | Get latest sensor reading with fallback | Optional |
| `GET` | `/sensor-readings/history` | Get historical readings for telemetry charts | Optional |
| `POST` | `/sensor-readings` | Ingest sensor data payload from ESP32 | No |

**ESP32 Payload Format:**
```json
{
  "deviceId": "ESP32-0001",
  "temperature": 27.4,
  "humidity": 65.2,
  "soilMoisture": 48.0,
  "soilPH": 6.8,
  "nitrogen": 42.0,
  "phosphorus": 28.5,
  "potassium": 135.0
}
```

### ⚡ Devices & Relays
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/devices` | List all connected devices and relay states | Yes |
| `PATCH` | `/devices/:id/toggle` | Toggle relay switch (ON / OFF) | Yes |

### 🌿 AI Plant Doctor
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/ai/diagnose` | Upload leaf image (multipart/form-data) for Gemini AI analysis | Optional |

---

## 🎓 Academic Capstone Project Presentation Notes

This project satisfies all requirements for a **Final-Year B.Tech / B.E. (Computer Science / Information Technology / IoT)** Capstone Project:
1. **Hardware Integration**: Real-world microcontroller sensor acquisition and actuator switching.
2. **Distributed Microservices**: Separation of concerns between edge IoT, REST API backend, and modern client.
3. **Artificial Intelligence**: Practical deployment of Generative AI (LLM / Multimodal Vision) to solve an agricultural domain problem.
4. **DevOps & Production Readiness**: Containerized PostgreSQL via Docker, GitHub Version Control, and deployment on Vercel.

---

## 👨‍💻 Author & Maintainer

- **Developer**: Divyanshu Kumawat
- **GitHub**: [@Divyanshu9170](https://github.com/Divyanshu9170)
- **Repository**: [https://github.com/Divyanshu9170/smart-irrigation.git](https://github.com/Divyanshu9170/smart-irrigation.git)

---

## 📄 License

This project is licensed under the **MIT License** — you are free to use, modify, and distribute it with attribution.
