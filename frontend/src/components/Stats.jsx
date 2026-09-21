import { useEffect, useState } from "react";
import { getStats } from "../services/api";

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = () => {
      getStats()
        .then((res) => {
          if (isMounted) setStats(res.data);
        })
        .catch(() => {});
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 -mt-16 relative z-10">
      <div className="grid grid-cols-2 gap-4 glass rounded-xl p-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-accent">{stats ? stats.outstanding : "—"}</p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Active Outstanding Fines</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-ok">{stats ? stats.resolved : "—"}</p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Recently Resolved</p>
        </div>
      </div>
    </section>
  );
}
