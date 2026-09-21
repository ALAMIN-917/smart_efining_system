import { useState, useCallback } from "react";
import { sendSimulatedTelemetry } from "../services/api";

/**
 * SimulationPanel — controls for testing the system without hardware.
 * Sends simulated telemetry at configurable speed/coordinates.
 */

const PRESETS = [
  { label: "N3 Trishal (75 km/h)", speed: 75, lat: 24.5822, lng: 90.3958, desc: "N3 National Highway — 80 km/h Limit" },
  { label: "N3 Trishal Bazar (48 km/h)", speed: 48, lat: 24.5855, lng: 90.3942, desc: "Trishal Bazar — 40 km/h Urban Limit" },
  { label: "JKKNIU Zone (42 km/h)", speed: 42, lat: 24.5802, lng: 90.3831, desc: "JKKNIU University Zone — 30 km/h Limit" },
  { label: "N3 Overspeed (92 km/h)", speed: 92, lat: 24.5822, lng: 90.3958, desc: "Overspeed on N3 — ৳1500 Fine" },
  { label: "N8 Padma Bridge (80 km/h)", speed: 80, lat: 23.4721, lng: 90.2814, desc: "Padma Bridge Expressway" },
];

const DEFAULT_DEVICE = "ESP32-DVC-45821";
const DEFAULT_VEHICLE = "VH-10294";

export default function SimulationPanel({ onTelemetryResponse }) {
  const [speed, setSpeed] = useState(75);
  const [lat, setLat] = useState(24.5822);
  const [lng, setLng] = useState(90.3958);
  const [deviceId, setDeviceId] = useState(DEFAULT_DEVICE);
  const [vehicleId, setVehicleId] = useState(DEFAULT_VEHICLE);
  const [sending, setSending] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [error, setError] = useState(null);

  const send = useCallback(async (overrideSpeed) => {
    setSending(true);
    setError(null);
    try {
      const data = {
        deviceId,
        vehicleId,
        latitude: lat,
        longitude: lng,
        gpsSpeed: overrideSpeed ?? speed,
        satellites: 10,
      };
      const res = await sendSimulatedTelemetry(data);
      setLastResponse(res);
      if (onTelemetryResponse) onTelemetryResponse(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }, [deviceId, vehicleId, lat, lng, speed, onTelemetryResponse]);

  // Auto-send mode
  const toggleAuto = useCallback(() => {
    setAutoMode((prev) => !prev);
  }, []);

  // Auto-send effect using interval
  useState(() => {
    if (!autoMode) return;
    const interval = setInterval(() => send(), 3000);
    return () => clearInterval(interval);
  }, [autoMode, send]);

  const applyPreset = (preset) => {
    setSpeed(preset.speed);
    setLat(preset.lat);
    setLng(preset.lng);
  };

  return (
    <div className="glass rounded-xl p-5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-info/20 text-info text-xs">🧪</span>
          Simulation Panel
        </h3>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">
          Test Mode
        </span>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className="text-[11px] px-2.5 py-1.5 rounded-md border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Speed slider */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 block mb-1">
          Speed: <span className="text-white font-semibold">{speed} km/h</span>
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #22c55e ${Math.min(speed/200*100, 40)}%, #f97316 ${Math.min(speed/200*100, 60)}%, #ef4444 ${speed/200*100}%, rgba(255,255,255,0.1) ${speed/200*100}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>200</span>
        </div>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Device ID</label>
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs outline-none focus:border-info/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Vehicle ID</label>
          <input
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs outline-none focus:border-info/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Latitude</label>
          <input
            type="number"
            step="0.001"
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs outline-none focus:border-info/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Longitude</label>
          <input
            type="number"
            step="0.001"
            value={lng}
            onChange={(e) => setLng(Number(e.target.value))}
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs outline-none focus:border-info/50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => send()}
          disabled={sending}
          className="flex-1 bg-info hover:bg-info/90 disabled:opacity-60 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors"
        >
          {sending ? "Sending…" : "📡 Send Telemetry"}
        </button>
        <button
          onClick={toggleAuto}
          className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
            autoMode
              ? "bg-red-500/20 border-red-500/40 text-red-400"
              : "border-white/10 hover:border-white/30 text-gray-300"
          }`}
        >
          {autoMode ? "⏹ Stop" : "▶ Auto"}
        </button>
      </div>

      {/* Response */}
      {error && (
        <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">{error}</p>
      )}
      {lastResponse && !error && (
        <div className="mt-3 text-[11px] bg-black/30 rounded p-2.5 font-mono border border-white/5">
          <div className="text-gray-400 mb-1">ESP32 Response:</div>
          <pre className="text-gray-200 whitespace-pre-wrap">{JSON.stringify(lastResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
