import { useEffect, useState } from "react";
import { getHealthStatus } from "../services/api";

export default function RealtimeBadge({ onRefresh, lastUpdated }) {
  const [health, setHealth] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = () => {
    getHealthStatus()
      .then((res) => setHealth(res))
      .catch(() => setHealth({ success: false }));
  };

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    fetchHealth();
    if (onRefresh) {
      try {
        await onRefresh();
      } catch {}
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  const isConnected = health?.database?.connected;
  const dbName = health?.database?.name || "test";
  const clusterHost = health?.database?.host?.split(".")[0] || "cluster0";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs glass rounded-lg px-4 py-2 border border-white/10 mb-6 bg-white/[0.02]">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isConnected ? "bg-emerald-500" : "bg-rose-500"
            }`}
          ></span>
        </span>
        <span className="text-gray-300 font-medium">
          {isConnected ? (
            <>
              <span className="text-emerald-400 font-semibold">MongoDB Atlas Realtime:</span>{" "}
              <span className="text-gray-400 font-mono text-[11px]">{clusterHost}... ({dbName})</span>
            </>
          ) : (
            <span className="text-rose-400">Connecting to MongoDB Atlas...</span>
          )}
        </span>
        {health?.counts && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 text-gray-400 font-mono text-[11px]">
            <span>{health.counts.fines} fines</span>
            <span>•</span>
            <span>{health.counts.vehicles} vehicles</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-gray-400 ml-auto">
        {lastUpdated && (
          <span className="text-[11px]">
            Synced: {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/10 disabled:opacity-50"
          title="Refresh realtime data from MongoDB Atlas"
        >
          <svg
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-accent" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{refreshing ? "Syncing..." : "Sync"}</span>
        </button>
      </div>
    </div>
  );
}
