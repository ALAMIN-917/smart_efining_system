import { useEffect, useState, useCallback, useRef } from "react";
import {
  getVehicleStatus,
  getVehicleTrail,
  getSpeedZones,
  getRecentFines,
  createSSEConnection,
} from "../services/api";
import LiveMap from "../components/LiveMap";
import SpeedGauge from "../components/SpeedGauge";
import ViolationAlert from "../components/ViolationAlert";
import SimulationPanel from "../components/SimulationPanel";
import { StatusBadge } from "../components/FineCard";
import { Link } from "react-router-dom";

const DEFAULT_VEHICLE = "VH-10294";

export default function LiveDashboard() {
  const [vehicleId, setVehicleId] = useState(DEFAULT_VEHICLE);
  const [telemetry, setTelemetry] = useState(null);
  const [speedZones, setSpeedZones] = useState([]);
  const [trail, setTrail] = useState([]);
  const [recentFines, setRecentFines] = useState([]);
  const [error, setError] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef(null);

  // ── Load speed zones once ──────────────────────────────────────────────
  useEffect(() => {
    getSpeedZones()
      .then((res) => setSpeedZones(res.data))
      .catch(() => {});
  }, []);

  // ── Load recent fines periodically ─────────────────────────────────────
  const loadFines = useCallback(() => {
    getRecentFines(5)
      .then((res) => setRecentFines(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadFines();
    const interval = setInterval(loadFines, 10000);
    return () => clearInterval(interval);
  }, [loadFines]);

  // ── SSE connection for real-time updates ───────────────────────────────
  useEffect(() => {
    const sse = createSSEConnection();
    sseRef.current = sse;

    sse.addEventListener("open", () => setSseConnected(true));

    sse.addEventListener("telemetry", (e) => {
      try {
        const data = JSON.parse(e.data);
        // Only update if it's for the currently viewed vehicle or
        // if we don't have any telemetry yet.
        if (!vehicleId || data.vehicleId === vehicleId) {
          setTelemetry(data);
          setTrail((prev) => {
            const next = [...prev, { latitude: data.latitude, longitude: data.longitude, effectiveSpeed: data.speed, status: data.status }];
            return next.slice(-50);
          });
        }
      } catch {}
    });

    sse.addEventListener("violation", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!vehicleId || data.vehicleId === vehicleId) {
          setTelemetry(data);
          loadFines(); // Refresh fines after a violation
        }
      } catch {}
    });

    sse.addEventListener("warning", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!vehicleId || data.vehicleId === vehicleId) {
          setTelemetry(data);
        }
      } catch {}
    });

    sse.addEventListener("error", () => setSseConnected(false));

    return () => {
      sse.close();
      sseRef.current = null;
    };
  }, [vehicleId, loadFines]);

  // ── Load initial vehicle status ────────────────────────────────────────
  useEffect(() => {
    if (!vehicleId) return;
    getVehicleStatus(vehicleId)
      .then((res) => {
        const d = res.data;
        if (d.latestTelemetry) {
          setTelemetry({
            vehicleId: d.vehicleId,
            registrationNumber: d.registrationNumber,
            ownerName: d.ownerName,
            latitude: d.latestTelemetry.latitude,
            longitude: d.latestTelemetry.longitude,
            speed: d.latestTelemetry.speed,
            allowedSpeed: d.latestTelemetry.allowedSpeed,
            status: d.currentStatus,
            zoneName: d.latestTelemetry.zoneName,
            timestamp: d.latestTelemetry.timestamp,
          });
        }
      })
      .catch((err) => setError(err.message));

    getVehicleTrail(vehicleId)
      .then((res) => setTrail(res.data))
      .catch(() => {});
  }, [vehicleId]);

  // Simulation response handler — updates telemetry from simulation
  const handleSimResponse = useCallback((res) => {
    // SSE will handle the update, but we can also set it directly.
  }, []);

  const speed = telemetry?.speed ?? 0;
  const allowedSpeed = telemetry?.allowedSpeed ?? 60;
  const status = telemetry?.status ?? "NORMAL";

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-info/20 border border-info/40 text-info text-lg">
              📡
            </span>
            Live Vehicle Monitor
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time GPS telemetry & overspeed detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* SSE status indicator */}
          <span className="flex items-center gap-1.5 text-xs">
            <span className={`relative flex h-2 w-2`}>
              {sseConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${sseConnected ? "bg-emerald-500" : "bg-rose-500"}`} />
            </span>
            <span className={sseConnected ? "text-emerald-400" : "text-rose-400"}>
              {sseConnected ? "Live" : "Connecting…"}
            </span>
          </span>
          {/* Vehicle selector */}
          <input
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="Vehicle ID"
            className="bg-black/30 border border-white/10 rounded-md px-3 py-1.5 text-sm outline-none focus:border-info/50 w-36"
          />
        </div>
      </div>

      {error && (
        <p className="text-accent bg-accent/10 border border-accent/30 rounded-md p-3 mb-4 text-sm">{error}</p>
      )}

      {/* Violation/Warning alerts */}
      {telemetry && <div className="mb-5"><ViolationAlert telemetry={telemetry} /></div>}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Left column: Vehicle info + Gauge ─────────────────────────── */}
        <div className="space-y-5">
          {/* Vehicle info card */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">
              Vehicle Information
            </h3>
            <dl className="space-y-2.5 text-sm">
              <InfoRow label="Vehicle ID" value={telemetry?.vehicleId || vehicleId} />
              <InfoRow label="Registration" value={telemetry?.registrationNumber || "—"} />
              <InfoRow label="Owner" value={telemetry?.ownerName || "—"} />
              <InfoRow label="Device" value={telemetry?.deviceId || "—"} />
            </dl>
          </div>

          {/* Speed gauge */}
          <div className="glass rounded-xl p-5 flex flex-col items-center">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-medium self-start">
              Speed Monitor
            </h3>
            <SpeedGauge speed={speed} allowedSpeed={allowedSpeed} status={status} />
          </div>

          {/* Status card */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">
              Current Status
            </h3>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
                status === "NORMAL" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                status === "WARNING" ? "bg-orange-500/15 text-orange-400 border border-orange-500/30" :
                status === "OVERSPEED" ? "bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse" :
                status === "VIOLATION" ? "bg-red-600/20 text-red-400 border-2 border-red-600/50" :
                "bg-white/5 text-gray-400 border border-white/10"
              }`}>
                {status === "NORMAL" && "✅"}
                {status === "WARNING" && "⚠️"}
                {status === "OVERSPEED" && "🚨"}
                {status === "VIOLATION" && "❌"}
                {status}
              </span>
              {telemetry?.zoneName && (
                <span className="text-xs text-gray-400">
                  📍 {telemetry.zoneName}
                </span>
              )}
            </div>
            {telemetry?.timestamp && (
              <p className="text-[11px] text-gray-500 mt-3">
                Last update: {new Date(telemetry.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* ── Center column: Map ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Live Map — Vehicle Tracking
              </h3>
              <span className="text-[10px] text-gray-500">
                {speedZones.length} speed zone{speedZones.length !== 1 ? "s" : ""} loaded
              </span>
            </div>
            <LiveMap telemetry={telemetry} speedZones={speedZones} trail={trail} />
          </div>

          {/* Simulation Panel */}
          <SimulationPanel onTelemetryResponse={handleSimResponse} />

          {/* Recent fines */}
          {recentFines.length > 0 && (
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Recent Violations
                </h3>
                <Link to="/blacklist" className="text-xs text-info hover:underline">View all →</Link>
              </div>
              <div className="space-y-2">
                {recentFines.slice(0, 5).map((f) => (
                  <Link
                    key={f.fineId}
                    to={`/fine/${f.fineId}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 transition-colors text-sm"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{f.ownerName}</span>
                      <span className="text-gray-500 text-xs ml-2">{f.registrationNumber}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {f.recordedSpeed}/{f.allowedSpeed} km/h
                      </span>
                      <span className="text-accent2 font-semibold text-sm">৳{f.fineAmount.toLocaleString()}</span>
                      <StatusBadge status={f.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
