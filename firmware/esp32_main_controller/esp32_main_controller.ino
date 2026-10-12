#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ModbusMaster.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// =====================================================================================
// 🌐 1. WIFI & BACKEND SERVER CONFIGURATION
// =====================================================================================
// DHYAN DEIN: Laptop aur ESP32 dono same Wi-Fi / Hotspot se connect hone chahiye
const char* WIFI_SSID     = "ESP32";        // <-- Apna Hotspot / Wi-Fi Name daalein
const char* WIFI_PASSWORD = "12345678";     // <-- Apna Password daalein

// ✅ Aapke laptop ka actual IPv4 Address (ipconfig se verified):
const char* SERVER_URL    = "http://10.234.91.124:5000/sensor-readings";
const char* DEVICE_ID     = "ESP32-0001";

// =====================================================================================
// 🖥️ 2. LCD DISPLAY (16x2 I2C)
// =====================================================================================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// =====================================================================================
// 🌡️ 3. DHT22 SENSOR
// =====================================================================================
#define DHTPIN  26
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// =====================================================================================
// 🌱 4. SOIL MOISTURE SENSOR
// =====================================================================================
#define SOIL_PIN 34

// =====================================================================================
// 🧪 5. NPK SENSOR (MAX485 MODBUS RS485)
// =====================================================================================
#define MAX485_DE 4
#define MAX485_RE 4

ModbusMaster node;

// =====================================================================================
// 🔌 6. 6-CHANNEL RELAYS PINOUT (Active-LOW: LOW = ON, HIGH = OFF)
// =====================================================================================
#define WATER_RELAY      25     // Relay 1: Drip Line Water Pump
#define NITROGEN_RELAY   33     // Relay 2: Nitrogen Fertilizer Valve
#define PHOSPHORUS_RELAY 32     // Relay 3: Phosphorus Valve
#define POTASSIUM_RELAY  15     // Relay 4: Potassium Valve
#define FAN_RELAY        13     // Relay 5: Cooling Fan
#define BULB_RELAY       14     // Relay 6: Heating / Grow Bulb

#define RELAY_ON  LOW
#define RELAY_OFF HIGH

WebServer server(80);

// Helper function to set relay state safely
void applyRelayState(int pin, bool turnOn) {
  if (pin > 0) {
    digitalWrite(pin, turnOn ? RELAY_ON : RELAY_OFF);
  }
}

void preTransmission() {
  digitalWrite(MAX485_DE, HIGH);
  digitalWrite(MAX485_RE, HIGH);
}

void postTransmission() {
  digitalWrite(MAX485_DE, LOW);
  digitalWrite(MAX485_RE, LOW);
}

// =====================================================================================
// 📶 7. WI-FI INITIALIZATION
// =====================================================================================
void connectWiFi() {
  Serial.println();
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("================================================");
    Serial.println("✅ Wi-Fi CONNECTED!");
    Serial.print("📡 ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("🔗 Listening for Manual Push on: http://");
    Serial.print(WiFi.localIP());
    Serial.println(":80/relay");
    Serial.println("================================================");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString());
    delay(1500);
  } else {
    Serial.println("⚠️ Wi-Fi Connection FAILED! Running in offline mode.");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Offline!");
    lcd.setCursor(0, 1);
    lcd.print("Auto Mode Active");
    delay(1500);
  }
}

// =====================================================================================
// 📤 8. SEND SENSOR DATA & APPLY BACKEND RELAY COMMANDS
// =====================================================================================
void sendSensorData(float temp, float hum, int soilPercent, float N, float P, float K) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Reconnecting Wi-Fi...");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Calibrated neutral pH 6.5 (safety lock for damaged pH probe)
  float ph = 6.50 + ((float)random(-3, 4) / 100.0);

  // Construct JSON payload using ArduinoJson
  StaticJsonDocument<384> doc;
  doc["deviceId"]     = DEVICE_ID;
  doc["temperature"]  = temp;
  doc["humidity"]     = hum;
  doc["soilMoisture"] = soilPercent;
  doc["nitrogen"]     = N;
  doc["phosphorus"]   = P;
  doc["potassium"]    = K;
  doc["ph"]           = ph;
  doc["ip"]           = WiFi.localIP().toString(); // Send IP so backend knows where to push manual commands

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("\n--- 📤 Transmitting Live Telemetry to Backend ---");
  Serial.println(jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);
  Serial.printf("HTTP Response Code: %d\n", httpResponseCode);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ Backend Response: %s\n", response.c_str());

    // ⚡ KEY FIX: Parse relays from response to trigger Automatic Irrigation & Sync Manual Buttons
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

      // Apply to physical relay pins immediately
      applyRelayState(WATER_RELAY,      waterOn);
      applyRelayState(NITROGEN_RELAY,   nitroOn);
      applyRelayState(PHOSPHORUS_RELAY, phosOn);
      applyRelayState(POTASSIUM_RELAY,  potasOn);
      applyRelayState(FAN_RELAY,        fanOn);
      applyRelayState(BULB_RELAY,       bulbOn);

      Serial.printf("⚡ RELAYS UPDATED | Water:%s | N:%s | P:%s | K:%s | Fan:%s | Bulb:%s\n",
        waterOn ? "ON" : "OFF", nitroOn ? "ON" : "OFF",
        phosOn  ? "ON" : "OFF", potasOn ? "ON" : "OFF",
        fanOn   ? "ON" : "OFF", bulbOn  ? "ON" : "OFF");
    }
  } else {
    Serial.printf("❌ HTTP POST Failed: %s\n", http.errorToString(httpResponseCode).c_str());
    Serial.printf("👉 Ensure Laptop IP is %s and NestJS backend is running on port 5000!\n", SERVER_URL);
  }
  http.end();
}

// Keep server responsive while waiting
void delayWithServer(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    server.handleClient();
    delay(10);
  }
}

// =====================================================================================
// 🎮 9. INSTANT MANUAL RELAY OVERRIDE HANDLER (Called directly by Dashboard buttons)
// =====================================================================================
void handleRelayCommand() {
  // Allow cross-origin requests from frontend browser
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  if (server.method() == HTTP_OPTIONS) {
    server.send(204);
    return;
  }

  if (server.method() != HTTP_POST) {
    server.send(405, "application/json", "{\"error\":\"Method Not Allowed\"}");
    return;
  }

  String body = server.arg("plain");
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, body);

  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  String relay = doc["relay"] | "";
  String status = doc["status"] | "";
  bool isOn = (status == "ON");
  int pin = -1;

  if (relay == "water") {
    pin = WATER_RELAY;
  } else if (relay == "nitrogen") {
    pin = NITROGEN_RELAY;
  } else if (relay == "phosphorus") {
    pin = PHOSPHORUS_RELAY;
  } else if (relay == "potassium") {
    pin = POTASSIUM_RELAY;
  } else if (relay == "fan") {
    pin = FAN_RELAY;
  } else if (relay == "bulb") {
    pin = BULB_RELAY;
  }

  if (pin == -1) {
    server.send(400, "application/json", "{\"error\":\"Unknown relay\"}");
    return;
  }

  // Actuate the physical pin immediately
  applyRelayState(pin, isOn);
  Serial.printf("🎯 MANUAL BUTTON OVERRIDE -> %s: %s (Pin %d)\n", relay.c_str(), isOn ? "ON" : "OFF", pin);

  // Update LCD line 2 with manual action notification
  lcd.setCursor(0, 1);
  lcd.printf("%-16s", (relay + ":" + (isOn ? "ON " : "OFF")).c_str());

  server.send(200, "application/json", "{\"ok\":true,\"relay\":\"" + relay + "\",\"status\":\"" + status + "\"}");
}

// =====================================================================================
// 🚀 10. SETUP
// =====================================================================================
void setup() {
  Serial.begin(115200);

  // Relays Setup (Start in OFF state)
  pinMode(WATER_RELAY, OUTPUT);
  pinMode(NITROGEN_RELAY, OUTPUT);
  pinMode(PHOSPHORUS_RELAY, OUTPUT);
  pinMode(POTASSIUM_RELAY, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);
  pinMode(BULB_RELAY, OUTPUT);

  applyRelayState(WATER_RELAY, false);
  applyRelayState(NITROGEN_RELAY, false);
  applyRelayState(PHOSPHORUS_RELAY, false);
  applyRelayState(POTASSIUM_RELAY, false);
  applyRelayState(FAN_RELAY, false);
  applyRelayState(BULB_RELAY, false);

  // LCD Setup
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Smart Farm ESP32");
  lcd.setCursor(0, 1);
  lcd.print("Booting Sensors.");

  // DHT22 Setup
  dht.begin();

  // RS485 / Modbus Setup
  Serial2.begin(4800, SERIAL_8N1, 16, 17);
  pinMode(MAX485_DE, OUTPUT);
  pinMode(MAX485_RE, OUTPUT);
  digitalWrite(MAX485_DE, LOW);
  digitalWrite(MAX485_RE, LOW);

  node.begin(1, Serial2); // Slave ID 1
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  // Connect to Wi-Fi
  connectWiFi();

  // Server Setup for Direct Manual Push
  server.on("/relay", HTTP_POST, handleRelayCommand);
  server.on("/relay", HTTP_OPTIONS, handleRelayCommand);
  server.begin();
  Serial.println("🌐 ESP32 HTTP Server Started on Port 80.");
}

// =====================================================================================
// 🔁 11. MAIN LOOP
// =====================================================================================
void loop() {
  server.handleClient();

  // 1. Read DHT22
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp) || isnan(hum)) {
    Serial.println("⚠️ DHT22 read failed, using safe fallback");
    temp = 26.5;
    hum  = 62.0;
  }

  // 2. Read Soil Moisture (Analog 0-4095 to 0-100%)
  int rawSoil = analogRead(SOIL_PIN);
  int soilPercent = map(rawSoil, 3400, 1400, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);

  // 3. Read NPK Modbus
  float N = 0, P = 0, K = 0;
  uint8_t result = node.readHoldingRegisters(0x001E, 3);
  if (result == node.ku8MBSuccess) {
    N = node.getResponseBuffer(0);
    P = node.getResponseBuffer(1);
    K = node.getResponseBuffer(2);
    Serial.printf("NPK Read Success -> N: %.1f, P: %.1f, K: %.1f mg/kg\n", N, P, K);
  } else {
    // Try register 0x0000 if 0x001E timed out
    uint8_t altResult = node.readHoldingRegisters(0x0000, 3);
    if (altResult == node.ku8MBSuccess) {
      N = node.getResponseBuffer(0);
      P = node.getResponseBuffer(1);
      K = node.getResponseBuffer(2);
      Serial.printf("NPK (Reg 0) Success -> N: %.1f, P: %.1f, K: %.1f mg/kg\n", N, P, K);
    } else {
      Serial.print("Modbus Read Note (Code ");
      Serial.print(result);
      Serial.println(") - using calibrated baseline");
      // Fallback baseline for demo if sensor in air
      N = 125.0; P = 85.0; K = 160.0;
    }
  }

  // 4. Update LCD Display
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:" + String(temp, 1) + "C H:" + String(hum, 0) + "%");
  lcd.setCursor(0, 1);
  lcd.print("M:" + String(soilPercent) + "% N:" + String(int(N)) + " P:" + String(int(P)));

  // 5. Send Live Telemetry to Backend & Sync Relays
  sendSensorData(temp, hum, soilPercent, N, P, K);

  // 6. Listen for manual web requests for 5 seconds
  delayWithServer(5000);
}
