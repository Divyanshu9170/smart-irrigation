/*
  =====================================================================================
  🌿 SMART FARM - ESP32 MAIN CONTROLLER FIRMWARE
  =====================================================================================
  Features:
  - Multi-Sensor Telemetry (Soil Moisture, DHT22/11 Temp & Humidity, NPK, pH)
  - 6-Channel Relay Matrix (Water Pump, Nitrogen, Phosphorus, Potassium, Fan, Lamp)
  - Bi-Directional HTTP REST Communication with NestJS Backend
  - Autonomous Closed-Loop Actuation (Reads backend relay commands in JSON)
  - Offline Autonomous Fallback: Irrigates if Wi-Fi drops and soil moisture is critical
  - Calibrated pH baseline at 6.5 (Fault-tolerant for inoperative pH probe)
  
  Libraries Required (Install from Arduino IDE Library Manager):
  1. ArduinoJson by Benoit Blanchon (Version 6.x or 7.x)
  2. DHT sensor library by Adafruit
  3. Adafruit Unified Sensor
  =====================================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// =====================================================================================
// 🌐 1. NETWORK & BACKEND CONFIGURATION
// =====================================================================================
// Apna Wi-Fi SSID aur Password yaha enter karein:
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend Server IP & Port (Laptop/Server ka Local IP jaise "http://192.168.1.15:5000"):
// Note: Agar laptop par backend chal raha hai toh "ipconfig" se IPv4 address dekhkar yaha dalein.
const char* BACKEND_URL   = "http://192.168.1.100:5000/sensor-readings";
const char* DEVICE_ID     = "ESP32-0001";

// Sensor reading bhejane ka interval (milliseconds): 5 seconds
const unsigned long SEND_INTERVAL_MS = 5000;
unsigned long lastSendTime = 0;

// =====================================================================================
// 📌 2. SENSOR PIN DEFINITIONS
// =====================================================================================
#define DHTPIN            4         // DHT11 / DHT22 Data Pin
#define DHTTYPE           DHT11     // Ya DHT22 agar white sensor hai

#define PIN_SOIL_MOISTURE 34        // Analog Input (ADC1_CH6 - Input Only Pin)
#define PIN_PH_SENSOR     35        // Analog Input (ADC1_CH7 - Input Only Pin)

// NPK Sensor inputs (Demo / Potentiometer ya Analog Probes):
#define PIN_NITROGEN      32        // Analog Input
#define PIN_PHOSPHORUS    33        // Analog Input
#define PIN_POTASSIUM     39        // Analog Input (ADC1_CH3)

// =====================================================================================
// 🔌 3. 6-CHANNEL RELAY PIN DEFINITIONS
// =====================================================================================
// Most 5V relay modules are ACTIVE-LOW (LOW = ON, HIGH = OFF)
#define RELAY_ACTIVE_LOW  true

#define PIN_RELAY_WATER   26        // Relay 1: Drip Line Water Pump
#define PIN_RELAY_NITRO   27        // Relay 2: Nitrogen Dosing Solenoid
#define PIN_RELAY_PHOS    14        // Relay 3: Phosphorus Dosing Solenoid
#define PIN_RELAY_POTAS   12        // Relay 4: Potassium Dosing Solenoid
#define PIN_RELAY_FAN     13        // Relay 5: Greenhouse Ventilation Fan
#define PIN_RELAY_BULB    25        // Relay 6: Heating / Grow Lamp

DHT dht(DHTPIN, DHTTYPE);

// =====================================================================================
// ⚙️ HELPER: Set Relay State (Active-LOW or Active-HIGH)
// =====================================================================================
void setRelay(int pin, bool turnOn) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(pin, turnOn ? LOW : HIGH);
  } else {
    digitalWrite(pin, turnOn ? HIGH : LOW);
  }
}

// =====================================================================================
// 📶 4. WI-FI INITIALIZATION
// =====================================================================================
void connectToWiFi() {
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Wi-Fi Connected!");
    Serial.print("📡 ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n⚠️ Wi-Fi Connection Failed. Running in Autonomous Offline Mode.");
  }
}

// =====================================================================================
// 📊 5. SENSOR READING ROUTINES
// =====================================================================================

// Soil Moisture reading (Maps raw 12-bit ADC 0-4095 to 0-100% moisture)
float readSoilMoisture() {
  int raw = analogRead(PIN_SOIL_MOISTURE);
  // Air/Dry value ~ 3200-3600, Submerged/Wet value ~ 1200-1500
  // Invert map because high ADC = dry, low ADC = wet
  int moisture = map(raw, 3300, 1400, 0, 100);
  moisture = constrain(moisture, 0, 100);
  return (float)moisture;
}

// pH Sensor reading with safe fallback calibration (6.5 pH baseline)
float readPH() {
  int raw = analogRead(PIN_PH_SENSOR);
  float voltage = (raw / 4095.0) * 3.3;
  float calculatedPh = 7.0 - ((voltage - 1.65) * 3.5);

  // Failsafe: Agar sensor disconnect ya kharab hai, baseline 6.5 return karo
  if (calculatedPh <= 1.5 || calculatedPh >= 13.0 || isnan(calculatedPh)) {
    return 6.5; // Drinking water / optimal agronomic baseline
  }
  return constrain(calculatedPh, 4.0, 9.0);
}

// NPK readings (Normalized in mg/kg)
float readNitrogen() {
  int raw = analogRead(PIN_NITROGEN);
  return map(raw, 0, 4095, 20, 200);
}

float readPhosphorus() {
  int raw = analogRead(PIN_PHOSPHORUS);
  return map(raw, 0, 4095, 10, 150);
}

float readPotassium() {
  int raw = analogRead(PIN_POTASSIUM);
  return map(raw, 0, 4095, 30, 250);
}

// =====================================================================================
// 🚀 6. SETUP
// =====================================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("🌿 SMART FARM - ESP32 AUTOMATION SYSTEM BOOTING");
  Serial.println("==================================================");

  // Initialize Relay pins as OUTPUT and set them OFF initially
  pinMode(PIN_RELAY_WATER, OUTPUT);
  pinMode(PIN_RELAY_NITRO, OUTPUT);
  pinMode(PIN_RELAY_PHOS,  OUTPUT);
  pinMode(PIN_RELAY_POTAS, OUTPUT);
  pinMode(PIN_RELAY_FAN,   OUTPUT);
  pinMode(PIN_RELAY_BULB,  OUTPUT);

  setRelay(PIN_RELAY_WATER, false);
  setRelay(PIN_RELAY_NITRO, false);
  setRelay(PIN_RELAY_PHOS,  false);
  setRelay(PIN_RELAY_POTAS, false);
  setRelay(PIN_RELAY_FAN,   false);
  setRelay(PIN_RELAY_BULB,  false);

  // Initialize Sensors
  dht.begin();
  analogReadResolution(12); // ESP32 12-bit ADC (0 to 4095)

  // Connect to Wi-Fi
  connectToWiFi();
}

// =====================================================================================
// 🔁 7. MAIN LOOP
// =====================================================================================
void loop() {
  // Reconnect Wi-Fi if connection dropped
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnectAttempt = 0;
    if (millis() - lastReconnectAttempt > 10000) {
      lastReconnectAttempt = millis();
      Serial.println("Reconnecting Wi-Fi...");
      WiFi.reconnect();
    }
  }

  // Periodic sensor read and telemetry transmit
  if (millis() - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = millis();

    // 1. Read all sensors
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    float moisture    = readSoilMoisture();
    float phVal       = readPH();
    float nitrogen    = readNitrogen();
    float phosphorus  = readPhosphorus();
    float potassium   = readPotassium();

    // Fallback if DHT sensor read fails (e.g. pin loose)
    if (isnan(temperature)) temperature = 27.5;
    if (isnan(humidity))    humidity    = 63.0;

    Serial.println("\n--------------------------------------------------");
    Serial.printf("📊 TELEMETRY | Temp: %.1f°C | Hum: %.1f%% | Moist: %.0f%%\n", temperature, humidity, moisture);
    Serial.printf("🧪 SOIL NPK  | N: %.0f | P: %.0f | K: %.0f | pH: %.2f\n", nitrogen, phosphorus, potassium, phVal);

    // 2. Transmit to Backend if Online
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(BACKEND_URL);
      http.addHeader("Content-Type", "application/json");

      // Construct JSON payload
      StaticJsonDocument<384> doc;
      doc["deviceId"]     = DEVICE_ID;
      doc["temperature"]  = temperature;
      doc["humidity"]     = humidity;
      doc["soilMoisture"] = moisture;
      doc["nitrogen"]     = nitrogen;
      doc["phosphorus"]   = phosphorus;
      doc["potassium"]    = potassium;
      doc["ph"]           = phVal;

      String requestBody;
      serializeJson(doc, requestBody);

      int httpResponseCode = http.POST(requestBody);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✅ Backend Response (%d): %s\n", httpResponseCode, response.c_str());

        // Parse backend response for updated relay actuation commands
        StaticJsonDocument<512> resDoc;
        DeserializationError err = deserializeJson(resDoc, response);

        if (!err && resDoc.containsKey("relays")) {
          JsonObject relays = resDoc["relays"];
          
          bool waterOn = (String(relays["water"] | "OFF") == "ON");
          bool nitroOn = (String(relays["nitrogen"] | "OFF") == "ON");
          bool phosOn  = (String(relays["phosphorus"] | "OFF") == "ON");
          bool potasOn = (String(relays["potassium"] | "OFF") == "ON");
          bool fanOn   = (String(relays["fan"] | "OFF") == "ON");
          bool bulbOn  = (String(relays["bulb"] | "OFF") == "ON");

          // Actuate Relays
          setRelay(PIN_RELAY_WATER, waterOn);
          setRelay(PIN_RELAY_NITRO, nitroOn);
          setRelay(PIN_RELAY_PHOS,  phosOn);
          setRelay(PIN_RELAY_POTAS, potasOn);
          setRelay(PIN_RELAY_FAN,   fanOn);
          setRelay(PIN_RELAY_BULB,  bulbOn);

          Serial.printf("⚡ RELAYS APPLIED | Water: %s | N: %s | P: %s | K: %s | Fan: %s | Bulb: %s\n",
            waterOn ? "ON" : "OFF", nitroOn ? "ON" : "OFF",
            phosOn ? "ON" : "OFF",  potasOn ? "ON" : "OFF",
            fanOn ? "ON" : "OFF",   bulbOn ? "ON" : "OFF");
        }
      } else {
        Serial.printf("❌ HTTP Error: %s\n", http.errorToString(httpResponseCode).c_str());
      }
      http.end();
    } else {
      // 3. Offline Autonomous Failsafe Logic:
      // If Wi-Fi is down, operate pump locally based on soil moisture
      Serial.println("⚠️ Offline Mode: Executing local fallback rules...");
      if (moisture < 45.0) {
        setRelay(PIN_RELAY_WATER, true);
        Serial.println("💧 Low moisture detected (<45%) -> Water Pump turned ON locally");
      } else if (moisture > 75.0) {
        setRelay(PIN_RELAY_WATER, false);
        Serial.println("🛑 Optimal moisture reached (>75%) -> Water Pump turned OFF locally");
      }
    }
  }
}
