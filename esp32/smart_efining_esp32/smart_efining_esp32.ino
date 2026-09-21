/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  Smart E-Fining System — ESP32 + NEO-6M GPS Telemetry Firmware
 * ══════════════════════════════════════════════════════════════════════════════
 *
 *  Hardware:
 *    - ESP32 development board
 *    - u-blox NEO-6M GPS module
 *        NEO-6M TX  →  ESP32 GPIO16 (RX2)
 *        NEO-6M RX  →  ESP32 GPIO17 (TX2)
 *
 *  Libraries required (install via Arduino Library Manager):
 *    - TinyGPS++   (by Mikal Hart)
 *    - WiFi.h      (built-in with ESP32 board package)
 *    - HTTPClient  (built-in with ESP32 board package)
 *
 *  This firmware reads GPS data, calculates speed, and sends rich
 *  telemetry to the Smart E-Fining backend via HTTP POST.
 *
 *  The server responds with a JSON status that is printed to Serial
 *  for driver/debug visibility.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <TinyGPS++.h>

// ─── USER CONFIGURATION ─────────────────────────────────────────────────────

// Wi-Fi credentials — configure for your local network.
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend API endpoint:
// Cloud production URL (Render):
const char* API_ENDPOINT  = "https://smart-efining-system-1.onrender.com/api/telemetry";
// Local IP alternative (when running on localhost):
// const char* API_ENDPOINT  = "http://192.168.100.163:5000/api/telemetry";

// Device and vehicle identification — must match the database records.
const char* DEVICE_ID     = "ESP32-DVC-45821";
const char* VEHICLE_ID    = "VH-10294";

// Telemetry send interval (milliseconds).
const unsigned long SEND_INTERVAL_MS = 5000;  // 5 seconds

// GPS serial configuration.
#define GPS_RX_PIN 16   // ESP32 GPIO16 ← NEO-6M TX
#define GPS_TX_PIN 17   // ESP32 GPIO17 → NEO-6M RX
#define GPS_BAUD   9600

// Serial monitor baud rate.
#define SERIAL_BAUD 115200

/**
 * Debug mode: when true, sends test GPS coordinates and speed instead
 * of waiting for actual satellite lock.  Useful for indoor testing.
 */
#define DEBUG_MODE false

// Debug test coordinates (Trishal, Mymensingh - N3 Highway).
#define DEBUG_LAT      24.5822
#define DEBUG_LNG      90.3958
#define DEBUG_SPEED    65.0
#define DEBUG_SATS     10

// ─── GLOBALS ─────────────────────────────────────────────────────────────────

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);  // UART2

unsigned long lastSendTime   = 0;
unsigned long wifiRetryDelay = 5000;  // ms between Wi-Fi reconnect attempts
int           sendCount      = 0;

// ─── SETUP ───────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(500);

  Serial.println();
  Serial.println("══════════════════════════════════════════════");
  Serial.println("  Smart E-Fining System — ESP32 GPS Telemetry");
  Serial.println("══════════════════════════════════════════════");
  Serial.printf("  Device ID  : %s\n", DEVICE_ID);
  Serial.printf("  Vehicle ID : %s\n", VEHICLE_ID);
  Serial.printf("  Debug Mode : %s\n", DEBUG_MODE ? "ON" : "OFF");
  Serial.println("══════════════════════════════════════════════");
  Serial.println();

  // Initialise GPS serial.
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] UART2 initialised (9600 baud, GPIO16/17)");

  // Connect to Wi-Fi.
  connectWiFi();
}

// ─── MAIN LOOP ───────────────────────────────────────────────────────────────

void loop() {
  // Feed GPS parser with incoming serial data.
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Ensure Wi-Fi stays connected.
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Connection lost — reconnecting...");
    connectWiFi();
  }

  // Send telemetry at the configured interval.
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;
    sendTelemetry();
  }
}

// ─── WI-FI CONNECTION ────────────────────────────────────────────────────────

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to \"%s\"", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.printf("[WiFi] Connected!  IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println();
    Serial.println("[WiFi] Connection FAILED — will retry later.");
  }
}

// ─── SEND TELEMETRY ──────────────────────────────────────────────────────────

void sendTelemetry() {
  double latitude  = 0.0;
  double longitude = 0.0;
  double speed_kmh = 0.0;
  int    sats      = 0;
  bool   valid     = false;

  if (DEBUG_MODE) {
    // ── Debug mode: use hardcoded test values ──────────────────────────
    latitude  = DEBUG_LAT;
    longitude = DEBUG_LNG;
    speed_kmh = DEBUG_SPEED;
    sats      = DEBUG_SATS;
    valid     = true;
    Serial.println("[GPS] DEBUG MODE — using test coordinates");
  } else {
    // ── Production mode: read from NEO-6M ─────────────────────────────
    if (gps.location.isValid()) {
      latitude  = gps.location.lat();
      longitude = gps.location.lng();
      valid     = true;
    }
    if (gps.speed.isValid()) {
      speed_kmh = gps.speed.kmph();
    }
    if (gps.satellites.isValid()) {
      sats = gps.satellites.value();
    }
  }

  if (!valid) {
    Serial.printf("[GPS] Waiting for satellite lock... (satellites: %d)\n", sats);
    return;
  }

  // ── Print GPS data to serial monitor ──────────────────────────────────
  sendCount++;
  Serial.println("──────────────────────────────────────");
  Serial.printf("[GPS] #%d | Lat: %.6f | Lng: %.6f\n", sendCount, latitude, longitude);
  Serial.printf("[GPS] Speed: %.1f km/h | Satellites: %d\n", speed_kmh, sats);

  // ── Build JSON payload ────────────────────────────────────────────────
  // Note: the backend determines ownerName, fineAmount, and speedLimit
  // from the database — the ESP32 NEVER sends these values.
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"vehicleId\":\"" + String(VEHICLE_ID) + "\",";
  payload += "\"latitude\":" + String(latitude, 6) + ",";
  payload += "\"longitude\":" + String(longitude, 6) + ",";
  payload += "\"gpsSpeed\":" + String(speed_kmh, 1) + ",";
  payload += "\"satellites\":" + String(sats) + ",";
  payload += "\"timestamp\":\"" + getISO8601Timestamp() + "\"";
  payload += "}";

  Serial.printf("[HTTP] POST %s\n", API_ENDPOINT);
  Serial.printf("[HTTP] Payload: %s\n", payload.c_str());

  // ── Send HTTP/HTTPS POST ──────────────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi not connected — skipping send.");
    return;
  }

  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient standardClient;

  if (String(API_ENDPOINT).startsWith("https://")) {
    secureClient.setInsecure();  // Allows connecting to Render HTTPS without CA bundle
    http.begin(secureClient, API_ENDPOINT);
  } else {
    http.begin(standardClient, API_ENDPOINT);
  }

  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);  // 15 second timeout for cloud latency

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Response code: %d\n", httpCode);
    Serial.printf("[HTTP] Response: %s\n", response.c_str());

    // ── Parse and display server response ─────────────────────────────
    // The server returns: { status, speed, allowedSpeed, message?, fineId?, fineAmount? }
    printServerResponse(response);
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  Serial.println("──────────────────────────────────────");
  Serial.println();
}

// ─── PARSE & DISPLAY SERVER RESPONSE ─────────────────────────────────────────

void printServerResponse(const String& response) {
  // Simple manual JSON parsing (avoids ArduinoJson dependency).
  // The response format is: {"status":"NORMAL","speed":72,"allowedSpeed":80,...}

  String status = extractJsonString(response, "status");
  String speedStr = extractJsonValue(response, "speed");
  String allowedStr = extractJsonValue(response, "allowedSpeed");
  String message = extractJsonString(response, "message");
  String fineId = extractJsonString(response, "fineId");
  String fineAmountStr = extractJsonValue(response, "fineAmount");

  Serial.println();
  Serial.println("┌────────── SERVER RESPONSE ──────────┐");

  if (status == "NORMAL") {
    Serial.println("│  ✅ Status: NORMAL                  │");
  } else if (status == "WARNING") {
    Serial.println("│  ⚠️  Status: WARNING                │");
    Serial.println("│  ⚠️  REDUCE SPEED IMMEDIATELY!      │");
  } else if (status == "OVERSPEED") {
    Serial.println("│  🚨 Status: OVERSPEED               │");
    Serial.println("│  🚨 VIOLATION PENDING!               │");
  } else if (status == "VIOLATION") {
    Serial.println("│  ❌ Status: VIOLATION CONFIRMED      │");
  }

  if (speedStr.length() > 0) {
    Serial.printf("│  Speed: %s km/h                     \n", speedStr.c_str());
  }
  if (allowedStr.length() > 0) {
    Serial.printf("│  Limit: %s km/h                     \n", allowedStr.c_str());
  }
  if (message.length() > 0) {
    Serial.printf("│  Message: %s                    \n", message.c_str());
  }
  if (fineId.length() > 0) {
    Serial.printf("│  Fine ID: %s               \n", fineId.c_str());
    Serial.printf("│  Fine Amount: BDT %s              \n", fineAmountStr.c_str());
  }

  Serial.println("└─────────────────────────────────────┘");
}

// ─── SIMPLE JSON HELPERS (avoids ArduinoJson dependency) ─────────────────────

/**
 * Extract a string value from a JSON key.
 * e.g. extractJsonString(json, "status") from {"status":"NORMAL"} → "NORMAL"
 */
String extractJsonString(const String& json, const String& key) {
  String searchKey = "\"" + key + "\":\"";
  int startIdx = json.indexOf(searchKey);
  if (startIdx < 0) return "";
  startIdx += searchKey.length();
  int endIdx = json.indexOf("\"", startIdx);
  if (endIdx < 0) return "";
  return json.substring(startIdx, endIdx);
}

/**
 * Extract a numeric or raw value from a JSON key.
 * e.g. extractJsonValue(json, "speed") from {"speed":72} → "72"
 */
String extractJsonValue(const String& json, const String& key) {
  String searchKey = "\"" + key + "\":";
  int startIdx = json.indexOf(searchKey);
  if (startIdx < 0) return "";
  startIdx += searchKey.length();

  // Skip past any quotes if it's a string value.
  if (json.charAt(startIdx) == '"') {
    return extractJsonString(json, key);
  }

  int endIdx = startIdx;
  while (endIdx < (int)json.length()) {
    char c = json.charAt(endIdx);
    if (c == ',' || c == '}' || c == ']') break;
    endIdx++;
  }
  return json.substring(startIdx, endIdx);
}

// ─── TIMESTAMP ───────────────────────────────────────────────────────────────

/**
 * Generate an ISO 8601 timestamp.
 * If GPS date/time is available, use it; otherwise use millis-based approximation.
 */
String getISO8601Timestamp() {
  if (!DEBUG_MODE && gps.date.isValid() && gps.time.isValid()) {
    char buf[30];
    snprintf(buf, sizeof(buf), "%04d-%02d-%02dT%02d:%02d:%02dZ",
      gps.date.year(), gps.date.month(), gps.date.day(),
      gps.time.hour(), gps.time.minute(), gps.time.second()
    );
    return String(buf);
  }
  // Fallback: let the server use its receive time.
  return "";
}
