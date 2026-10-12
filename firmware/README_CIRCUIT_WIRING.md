# 🔌 Smart Farm Hardware Circuit & Pinout Guide

This guide details the exact GPIO pin connections for both microcontrollers:
1. **ESP32 Node (Main Sensor & 6-Channel Relay Controller)**
2. **ESP32-CAM Node (AI-Thinker Video & Image Streamer)**

---

## 📌 1. ESP32 Main Controller Pinout Connections

### A. Sensors to ESP32:
| Sensor Name | Sensor Pin | ESP32 GPIO Pin | Description / Notes |
|---|---|---|---|
| **DHT11 / DHT22** | VCC | 3.3V / 5V | Power |
| | GND | GND | Ground |
| | DATA | **GPIO 4** | 10k pull-up resistor recommended |
| **Soil Moisture** | VCC | 3.3V | Capacitive sensor (Corrosion free) |
| | GND | GND | Ground |
| | AOUT | **GPIO 34** | ADC1_CH6 (Safe input-only pin, no Wi-Fi conflict) |
| **pH Sensor** | VCC | 5V | Analog BNC amplifier board |
| | GND | GND | Ground |
| | Po (Analog) | **GPIO 35** | ADC1_CH7 (Safe input-only pin) |
| **NPK (N)** | Analog / Pot | **GPIO 32** | ADC1_CH4 (0-3.3V) |
| **NPK (P)** | Analog / Pot | **GPIO 33** | ADC1_CH5 (0-3.3V) |
| **NPK (K)** | Analog / Pot | **GPIO 39 (VN)**| ADC1_CH3 (0-3.3V) |

### B. 6-Channel Relay Board to ESP32:
| Relay Channel | Actuator Device | ESP32 GPIO Pin | Trigger Logic |
|---|---|---|---|
| **Relay 1** | Water Pump (Drip Line) | **GPIO 26** | Active LOW (LOW = ON, HIGH = OFF) |
| **Relay 2** | Nitrogen (N) Dosing Valve | **GPIO 27** | Active LOW |
| **Relay 3** | Phosphorus (P) Valve | **GPIO 14** | Active LOW |
| **Relay 4** | Potassium (K) Valve | **GPIO 12** | Active LOW |
| **Relay 5** | Greenhouse Cooling Fan | **GPIO 13** | Active LOW |
| **Relay 6** | Heating / Grow Lamp | **GPIO 25** | Active LOW |
| **Relay VCC** | 5V External Adapter | 5V | Power for relay coils |
| **Relay GND** | Common Ground | GND | Must connect ESP32 GND to Relay GND |

---

## 📷 2. ESP32-CAM Node Pinout Connections

The AI-Thinker ESP32-CAM has standard internal camera connections for the OV2640 sensor.

### Power & Programming:
- **5V:** Connect to regulated 5V DC (at least 2A adapter; ESP32-CAM draws high current during Wi-Fi transmission).
- **GND:** Connect to power supply Ground.
- **Flashing with FTDI / USB-to-UART Adapter:**
  - FTDI `TX` $\rightarrow$ ESP32-CAM `U0R` (GPIO 3)
  - FTDI `RX` $\rightarrow$ ESP32-CAM `U0T` (GPIO 1)
  - FTDI `VCC` $\rightarrow$ ESP32-CAM `5V`
  - FTDI `GND` $\rightarrow$ ESP32-CAM `GND`
  - **IMPORTANT FOR UPLOADING CODE:** Connect `GPIO 0` to `GND` before powering on or pressing RESET to put ESP32-CAM into bootloader mode. Disconnect `GPIO 0` from `GND` after flashing is complete!

---

## ⚙️ 3. How to Setup in Arduino IDE

1. Open **Arduino IDE**.
2. Go to **File > Preferences** and add ESP32 Board URL:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Go to **Tools > Board > Boards Manager**, search **ESP32** and click Install.
4. Go to **Tools > Manage Libraries** and install:
   - **ArduinoJson** (by Benoit Blanchon)
   - **DHT sensor library** (by Adafruit)
5. Select Board:
   - For Main Controller: **"ESP32 Dev Module"**
   - For Camera Module: **"AI Thinker ESP32-CAM"**
6. In both `.ino` files, update:
   - `WIFI_SSID` & `WIFI_PASSWORD`
   - `BACKEND_URL` (Your laptop's IP address, e.g. `http://192.168.1.15:5000/sensor-readings`)
7. Click **Upload** and open Serial Monitor at **115200 baud**!
