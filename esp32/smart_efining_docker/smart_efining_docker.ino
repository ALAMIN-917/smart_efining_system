/*
 * ══════════════════════════════════════════════════════════════════════════════
 * Smart E-Fining System — ESP32 + NEO-6M GPS Firmware
 * ──────────────────────────────────────────────────────────────────────────────
 *         ██████╗  ██████╗  ██████╗██╗  ██╗███████╗██████╗
 *         ██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
 *         ██║  ██║██║   ██║██║     █████╔╝ █████╗  ██████╔╝
 *         ██║  ██║██║   ██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗
 *         ██████╔╝╚██████╔╝╚██████╗██║  ██╗███████╗██║  ██║
 *         ╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
 *                    LOCAL DOCKER BACKEND VERSION
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Target: Docker backend running on local PC via docker compose
 * Protocol: HTTP (plain, fast, no SSL overhead)
 * Endpoint: http://<YOUR_PC_IP>:5000/api/telemetry
 *
 * Features:
 *   - NEO-6M GPS via Hardware UART2 (GPIO16 RX, GPIO17 TX)
 *   - Stationary GPS drift filtering & baseline calibration
 *   - Moving-average position smoothing during stops
 *   - Clamps noisy 0-2 km/h stationary speed to 0.0 km/h
 *   - GPS quality validation (satellites >= 4, HDOP <= 3.5)
 *   - Wi-Fi auto-reconnect with non-blocking backoff
 *   - Rich server response parsing (Speed Zone, Fines, Warnings)
 *
 * Hardware Wiring:
 *   NEO-6M TX  ──→ ESP32 GPIO 16 (RX2)
 *   NEO-6M RX  ──→ ESP32 GPIO 17 (TX2)
 *   NEO-6M VCC ──→ 3.3V or 5V
 *   NEO-6M GND ──→ GND
 *
 * IMPORTANT:
 *   Before uploading, run fix-firewall.bat (as Admin) on your PC
 *   to open port 5000 in Windows Firewall!
 *
 * Required Libraries: TinyGPS++ (by Mikal Hart)
 * ══════════════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>

// ═════════════════════════════════════════════════════════════════════════════
// 1. USER CONFIGURATION — CHANGE THESE FOR YOUR SETUP
// ═════════════════════════════════════════════════════════════════════════════

// Your Wi-Fi network credentials
const char* WIFI_SSID     = "Do IT!";
const char* WIFI_PASSWORD = "do683times";

// Your PC's local Wi-Fi IP address (find with: ipconfig → IPv4 Address)
const char* DOCKER_HOST_IP = "192.168.0.111";
const int   DOCKER_PORT    = 5000;

// Device & Vehicle ID — must match MongoDB records
const char* DEVICE_ID  = "ESP32-DVC-45821";
const char* VEHICLE_ID = "VH-10294";

// ═════════════════════════════════════════════════════════════════════════════
// 2. TIMING & GPS PIN CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

const unsigned long SEND_INTERVAL_MS       = 5000;  // Send telemetry every 5 sec
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000; // Retry Wi-Fi every 10 sec

#define GPS_RX_PIN  16
#define GPS_TX_PIN  17
#define GPS_BAUD    9600
#define SERIAL_BAUD 115200

// ═════════════════════════════════════════════════════════════════════════════
// 3. GPS DRIFT CALIBRATION SETTINGS
// ═════════════════════════════════════════════════════════════════════════════

#define FILTER_SIZE            8    // Stationary averaging window (samples)
#define STATIONARY_SPEED_KMH   2.0  // Below this → stationary, speed = 0
#define DRIFT_THRESHOLD_METERS 3.0  // Below this drift → suppress jitter
#define MIN_SATELLITES         4    // Minimum for 3D fix
#define MAX_HDOP               3.5  // Maximum acceptable HDOP
#define MAX_GPS_AGE_MS         3000 // Reject stale fixes

// ═════════════════════════════════════════════════════════════════════════════
// 4. GLOBALS
// ═════════════════════════════════════════════════════════════════════════════

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

char API_ENDPOINT[128];
unsigned long lastSendTime    = 0;
unsigned long lastWiFiAttempt = 0;
int sendCount = 0;

// Drift filter buffers
double latitudeBuffer[FILTER_SIZE];
double longitudeBuffer[FILTER_SIZE];
int bufferIndex = 0;
int bufferCount = 0;

double filteredLatitude  = 0.0;
double filteredLongitude = 0.0;
bool   filteredPositionValid = false;

// ═════════════════════════════════════════════════════════════════════════════
// 5. FUNCTION DECLARATIONS
// ═════════════════════════════════════════════════════════════════════════════

void connectWiFi();
void maintainWiFi();
bool getFilteredGPS(double &lat, double &lng, double &speed, int &sats, double &hdop, bool &isStationary);
void addGPSPoint(double lat, double lng);
double calculateAverage(double values[], int count);
double distanceMeters(double lat1, double lon1, double lat2, double lon2);
void sendTelemetry();
String getISO8601Timestamp();
void printServerResponse(const String& response);
String extractJsonString(const String& json, const String& key);
String extractJsonValue(const String& json, const String& key);

// ═════════════════════════════════════════════════════════════════════════════
// 6. SETUP
// ═════════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);

  // Build Docker endpoint URL
  snprintf(API_ENDPOINT, sizeof(API_ENDPOINT),
           "http://%s:%d/api/telemetry", DOCKER_HOST_IP, DOCKER_PORT);

  Serial.println();
  Serial.println("╔═══════════════════════════════════════════════════════════╗");
  Serial.println("║   Smart E-Fining System — ESP32 + NEO-6M GPS            ║");
  Serial.println("║   >>> DOCKER LOCAL BACKEND MODE <<<                      ║");
  Serial.println("╚═══════════════════════════════════════════════════════════╝");
  Serial.printf(" Device ID        : %s\n", DEVICE_ID);
  Serial.printf(" Vehicle ID       : %s\n", VEHICLE_ID);
  Serial.printf(" Backend          : Docker (Local LAN — HTTP)\n");
  Serial.printf(" Target Endpoint  : %s\n", API_ENDPOINT);
  Serial.println("─────────────────────────────────────────────────────────────");
  Serial.println(" [GPS Filter] Drift Calibration    : ACTIVE");
  Serial.printf(" [GPS Filter] Stationary Threshold : <= %.1f km/h\n", STATIONARY_SPEED_KMH);
  Serial.printf(" [GPS Filter] Drift Suppression    : %.1f meters\n", DRIFT_THRESHOLD_METERS);
  Serial.printf(" [GPS Filter] Smoothing Buffer     : %d samples\n", FILTER_SIZE);
  Serial.printf(" [GPS Filter] Min Satellites       : %d\n", MIN_SATELLITES);
  Serial.println("═════════════════════════════════════════════════════════════");
  Serial.println();

  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] UART2 initialized on GPIO16 (RX) & GPIO17 (TX) @ 9600 baud.");

  WiFi.mode(WIFI_STA);
  connectWiFi();
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. MAIN LOOP
// ═════════════════════════════════════════════════════════════════════════════

void loop() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  maintainWiFi();

  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;
    sendTelemetry();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. WI-FI MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to \"%s\" ", WIFI_SSID);
  WiFi.disconnect(true);
  delay(300);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] Connected!");
    Serial.printf("[WiFi] ESP32 IP : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WiFi] Signal   : %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("[WiFi] Failed. Will retry automatically...");
  }
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  unsigned long now = millis();
  if (now - lastWiFiAttempt >= WIFI_RETRY_INTERVAL_MS) {
    lastWiFiAttempt = now;
    Serial.println("[WiFi] Reconnecting...");
    connectWiFi();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. GPS DRIFT CALIBRATION & FILTER ENGINE
// ═════════════════════════════════════════════════════════════════════════════

bool getFilteredGPS(
  double &latitude, double &longitude, double &speed,
  int &satellites, double &hdop, bool &isStationary
) {
  if (!gps.location.isValid()) return false;
  if (gps.location.age() > MAX_GPS_AGE_MS) return false;

  double rawLat   = gps.location.lat();
  double rawLng   = gps.location.lng();
  double rawSpeed = gps.speed.isValid() ? gps.speed.kmph() : 0.0;
  satellites      = gps.satellites.isValid() ? gps.satellites.value() : 0;
  hdop            = gps.hdop.isValid() ? gps.hdop.hdop() : 99.0;

  if (satellites < MIN_SATELLITES) {
    Serial.printf("[GPS] Low satellites (%d < %d) — waiting.\n", satellites, MIN_SATELLITES);
    return false;
  }
  if (hdop > MAX_HDOP) {
    Serial.printf("[GPS] Poor HDOP (%.2f > %.2f) — waiting.\n", hdop, MAX_HDOP);
    return false;
  }

  // ── MOVING ──
  if (rawSpeed > STATIONARY_SPEED_KMH) {
    isStationary = false;
    latitude  = rawLat;
    longitude = rawLng;
    speed     = rawSpeed;

    filteredLatitude  = rawLat;
    filteredLongitude = rawLng;
    filteredPositionValid = true;

    bufferCount = 0;
    bufferIndex = 0;
    return true;
  }

  // ── STATIONARY ──
  isStationary = true;
  speed = 0.0;

  addGPSPoint(rawLat, rawLng);

  if (bufferCount < FILTER_SIZE) {
    if (filteredPositionValid) {
      latitude  = filteredLatitude;
      longitude = filteredLongitude;
      return true;
    }
    filteredLatitude  = rawLat;
    filteredLongitude = rawLng;
    filteredPositionValid = true;
    latitude  = rawLat;
    longitude = rawLng;
    return true;
  }

  double avgLat = calculateAverage(latitudeBuffer, bufferCount);
  double avgLng = calculateAverage(longitudeBuffer, bufferCount);

  if (!filteredPositionValid) {
    filteredLatitude  = avgLat;
    filteredLongitude = avgLng;
    filteredPositionValid = true;
  } else {
    double driftDist = distanceMeters(filteredLatitude, filteredLongitude, avgLat, avgLng);
    if (driftDist <= DRIFT_THRESHOLD_METERS) {
      Serial.printf("[GPS Drift] %.2fm jitter suppressed (baseline locked).\n", driftDist);
    } else {
      Serial.printf("[GPS Calibration] New baseline (shifted %.2fm).\n", driftDist);
      filteredLatitude  = avgLat;
      filteredLongitude = avgLng;
    }
  }

  latitude  = filteredLatitude;
  longitude = filteredLongitude;
  return true;
}

void addGPSPoint(double lat, double lng) {
  latitudeBuffer[bufferIndex]  = lat;
  longitudeBuffer[bufferIndex] = lng;
  bufferIndex = (bufferIndex + 1) % FILTER_SIZE;
  if (bufferCount < FILTER_SIZE) bufferCount++;
}

double calculateAverage(double values[], int count) {
  if (count <= 0) return 0.0;
  double sum = 0.0;
  for (int i = 0; i < count; i++) sum += values[i];
  return sum / count;
}

double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000.0;
  double dLat = radians(lat2 - lat1);
  double dLon = radians(lon2 - lon1);
  double a = sin(dLat / 2.0) * sin(dLat / 2.0) +
             cos(radians(lat1)) * cos(radians(lat2)) *
             sin(dLon / 2.0) * sin(dLon / 2.0);
  return R * 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. TELEMETRY TRANSMISSION (HTTP POST → Docker Backend)
// ═════════════════════════════════════════════════════════════════════════════

void sendTelemetry() {
  double latitude = 0, longitude = 0, speed_kmh = 0, hdop = 0;
  int satellites = 0;
  bool isStationary = true;

  if (!getFilteredGPS(latitude, longitude, speed_kmh, satellites, hdop, isStationary)) {
    Serial.println("[GPS] Acquiring fix... (place antenna near window/sky)");
    Serial.printf("[GPS] Satellites: %d | HDOP: %.2f\n", satellites, hdop);
    return;
  }

  sendCount++;

  Serial.println("─────────────────────────────────────────────────────────────");
  Serial.printf("[TELEMETRY #%d] → Docker Backend\n", sendCount);
  Serial.printf("  Lat: %.6f | Lng: %.6f\n", latitude, longitude);
  Serial.printf("  Speed: %.1f km/h %s\n", speed_kmh, isStationary ? "(STATIONARY)" : "(MOVING)");
  Serial.printf("  Satellites: %d | HDOP: %.2f\n", satellites, hdop);

  // Build JSON
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"vehicleId\":\"" + String(VEHICLE_ID) + "\",";
  payload += "\"latitude\":" + String(latitude, 6) + ",";
  payload += "\"longitude\":" + String(longitude, 6) + ",";
  payload += "\"gpsSpeed\":" + String(speed_kmh, 1) + ",";
  payload += "\"satellites\":" + String(satellites);

  String ts = getISO8601Timestamp();
  if (ts.length() > 0) {
    payload += ",\"timestamp\":\"" + ts + "\"";
  }
  payload += "}";

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi disconnected — skipping.");
    return;
  }

  // Docker uses plain HTTP — no SSL needed
  HTTPClient http;
  WiFiClient client;
  http.begin(client, API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  Serial.printf("[HTTP] POST %s\n", API_ENDPOINT);
  int code = http.POST(payload);

  if (code > 0) {
    Serial.printf("[HTTP] Response: %d\n", code);
    printServerResponse(http.getString());
  } else {
    Serial.printf("[HTTP] FAILED: %s (code %d)\n", http.errorToString(code).c_str(), code);
    Serial.println("[HINT] Check: 1) Docker running  2) fix-firewall.bat ran  3) IP correct");
  }

  http.end();
  Serial.println("─────────────────────────────────────────────────────────────\n");
}

// ═════════════════════════════════════════════════════════════════════════════
// 11. SERVER RESPONSE PARSER
// ═════════════════════════════════════════════════════════════════════════════

void printServerResponse(const String& response) {
  String status     = extractJsonString(response, "status");
  String speedStr   = extractJsonValue(response, "speed");
  String limitStr   = extractJsonValue(response, "allowedSpeed");
  String roadStr    = extractJsonString(response, "road");
  String message    = extractJsonString(response, "message");
  String fineId     = extractJsonString(response, "fineId");
  String fineAmount = extractJsonValue(response, "fineAmount");

  Serial.println("  ┌────────────── SERVER RESPONSE ──────────────┐");
  Serial.printf("  │ Status     : %-30s│\n", status.c_str());
  if (roadStr.length() > 0)
    Serial.printf("  │ Zone       : %-30s│\n", roadStr.c_str());
  if (limitStr.length() > 0)
    Serial.printf("  │ Speed Limit: %s km/h\n", limitStr.c_str());
  if (speedStr.length() > 0)
    Serial.printf("  │ Your Speed : %s km/h\n", speedStr.c_str());

  if (status == "WARNING") {
    Serial.println("  │ ⚠ REDUCE SPEED IMMEDIATELY!                 │");
  } else if (status == "OVERSPEED" || status == "VIOLATION") {
    Serial.println("  │ 🚨 OVERSPEED VIOLATION RECORDED!             │");
    if (fineId.length() > 0) {
      Serial.printf("  │ Fine ID    : %-30s│\n", fineId.c_str());
      Serial.printf("  │ Fine       : BDT %-26s│\n", fineAmount.c_str());
    }
  } else {
    Serial.println("  │ ✓ NORMAL — Within speed limit               │");
  }

  if (message.length() > 0)
    Serial.printf("  │ Message    : %-30s│\n", message.c_str());
  Serial.println("  └──────────────────────────────────────────────┘");
}

// ═════════════════════════════════════════════════════════════════════════════
// 12. JSON HELPERS & TIMESTAMP
// ═════════════════════════════════════════════════════════════════════════════

String extractJsonString(const String& json, const String& key) {
  String sk = "\"" + key + "\":\"";
  int s = json.indexOf(sk);
  if (s < 0) return "";
  s += sk.length();
  int e = json.indexOf("\"", s);
  return (e < 0) ? "" : json.substring(s, e);
}

String extractJsonValue(const String& json, const String& key) {
  String sk = "\"" + key + "\":";
  int s = json.indexOf(sk);
  if (s < 0) return "";
  s += sk.length();
  while (s < (int)json.length() && (json.charAt(s) == ' ' || json.charAt(s) == '\t')) s++;
  if (json.charAt(s) == '"') return extractJsonString(json, key);
  int e = s;
  while (e < (int)json.length()) {
    char c = json.charAt(e);
    if (c == ',' || c == '}' || c == ']') break;
    e++;
  }
  return json.substring(s, e);
}

String getISO8601Timestamp() {
  if (gps.date.isValid() && gps.time.isValid() && gps.date.year() >= 2024) {
    char buf[30];
    snprintf(buf, sizeof(buf), "%04d-%02d-%02dT%02d:%02d:%02dZ",
             gps.date.year(), gps.date.month(), gps.date.day(),
             gps.time.hour(), gps.time.minute(), gps.time.second());
    return String(buf);
  }
  return "";
}
