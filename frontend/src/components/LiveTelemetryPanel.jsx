import { useState, useEffect, useRef } from "react";

/**
 * LiveTelemetryPanel — displays real-time GPS telemetry from the ESP32.
 * This is a read-only panel — all values come from the backend SSE/polling.
 * Replaces the old SimulationPanel.
 */
export default function LiveTelemetryPanel({ telemetry }) {
  const [lastUpdateAge, setLastUpdateAge] = useState(null);
  const timerRef = useRef(null);

  // Update "time ago" display every second
  useEffect(() => {
    const tick = () => {
      if (telemetry?.timestamp) {
        const age = Math.round((Date.now() - new Date(telemetry.timestamp).getTime()) / 1000);
        setLastUpdateAge(age);
      } else {
        setLastUpdateAge(null);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [telemetry?.timestamp]);

  // Connection/staleness status
  const getConnectionStatus = () => {
    if (!telemetry) return { label: "WAITING FOR GPS", color: "text-gray-400", bg: "bg-gray-500/15 border-gray-500/30", dot: "bg-gray-400", pulse: false };
    if (lastUpdateAge == null) return { label: "WAITING FOR GPS", color: "text-gray-400", bg: "bg-gray-500/15 border-gray-500/30", dot: "bg-gray-400", pulse: false };
    if (lastUpdateAge <= 10) return { label: "LIVE", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-500", pulse: true };
    if (lastUpdateAge <= 30) return { label: "STALE", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", dot: "bg-amber-500", pulse: false };
    return { label: "DISCONNECTED", color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30", dot: "bg-rose-500", pulse: false };
  };

  const conn = getConnectionStatus();

  // GPS quality based on satellite count
  const getGpsQuality = () => {
    const sats = telemetry?.satellites;
    if (sats == null) return { label: "—", color: "text-gray-400" };
    if (sats >= 7) return { label: "GOOD", color: "text-emerald-400" };
    if (sats >= 4) return { label: "FAIR", color: "text-amber-400" };
    return { label: "WEAK", color: "text-rose-400" };
  };

  const gpsQuality = getGpsQuality();

  // Format "time ago"
  const formatAge = (seconds) => {
    if (seconds == null) return "—";
    if (seconds < 2) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  };

  // No telemetry yet — show waiting state
  if (!telemetry) {
    return (
      <div className="glass rounded-xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-info/20 text-info text-xs">📡</span>
            Live GPS Telemetry
          </h3>
          <span className={`inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${conn.bg} ${conn.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${conn.dot}`} />
            {conn.label}
          </span>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm mb-2">📡 Waiting for GPS telemetry...</div>
          <p className="text-gray-600 text-xs">
            No data received from ESP32 yet. Make sure the device is powered on and connected to WiFi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-info/20 text-info text-xs">📡</span>
          Live GPS Telemetry
        </h3>
        <span className={`inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${conn.bg} ${conn.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${conn.dot} ${conn.pulse ? "animate-pulse" : ""}`} />
          {conn.label}
        </span>
      </div>

      {/* Telemetry data grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <TelemetryField label="Device ID" value={telemetry.deviceId || "—"} mono />
        <TelemetryField label="Vehicle ID" value={telemetry.vehicleId || "—"} mono />
        <TelemetryField
          label="Latitude"
          value={telemetry.latitude != null ? telemetry.latitude.toFixed(6) : "—"}
          highlight={conn.label === "LIVE"}
        />
        <TelemetryField
          label="Longitude"
          value={telemetry.longitude != null ? telemetry.longitude.toFixed(6) : "—"}
          highlight={conn.label === "LIVE"}
        />
        <TelemetryField
          label="GPS Speed"
          value={telemetry.gpsSpeed != null ? `${telemetry.gpsSpeed.toFixed(1)} km/h` : (telemetry.speed != null ? `${Number(telemetry.speed).toFixed(1)} km/h` : "0.0 km/h")}
        />
        <TelemetryField
          label="Satellites"
          value={
            <span className="flex items-center gap-2">
              {telemetry.satellites ?? "—"}
              {telemetry.satellites != null && (
                <span className={`text-[9px] font-bold uppercase ${gpsQuality.color}`}>
                  {gpsQuality.label}
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Timestamps row */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
        <TelemetryField
          label="GPS Timestamp"
          value={
            telemetry.timestamp
              ? new Date(telemetry.timestamp).toLocaleString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZoneName: "short",
                })
              : "—"
          }
          small
        />
        <TelemetryField
          label="Last Update"
          value={
            <span className={conn.color}>
              {formatAge(lastUpdateAge)}
            </span>
          }
          small
        />
      </div>
    </div>
  );
}

function TelemetryField({ label, value, mono, highlight, small }) {
  return (
    <div className="bg-black/20 rounded-lg px-3 py-2.5 border border-white/5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">{label}</span>
      <span
        className={`block font-medium ${small ? "text-xs" : "text-sm"} ${mono ? "font-mono text-info/90" : "text-white"} ${
          highlight ? "transition-all duration-300" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
