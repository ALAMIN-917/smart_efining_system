import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getRecentFines } from "../services/api";
import FineCard, { FineCardSkeleton } from "./FineCard";
import RealtimeBadge from "./RealtimeBadge";

export default function RecentFines() {
  const [fines, setFines] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchFines = useCallback(async () => {
    try {
      const res = await getRecentFines(6);
      setFines(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchFines();
    const interval = setInterval(fetchFines, 6000);
    return () => clearInterval(interval);
  }, [fetchFines]);

  return (
    <section id="recent-fines" className="max-w-6xl mx-auto px-4 md:px-6 py-20">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Recent Traffic Violations</h2>
        <p className="text-gray-400 mt-2">Vehicles and individuals with currently outstanding fines</p>
      </div>

      <RealtimeBadge onRefresh={fetchFines} lastUpdated={lastUpdated} />

      {error && (
        <p className="text-accent bg-accent/10 border border-accent/30 rounded-md p-4">
          Unable to connect to the fine management server. Please try again later.
        </p>
      )}

      {!error && !fines && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <FineCardSkeleton key={i} />
          ))}
        </div>
      )}

      {fines && fines.length === 0 && (
        <div className="glass rounded-xl p-10 text-center">
          <h3 className="text-xl font-semibold mb-2">No Outstanding Fines</h3>
          <p className="text-gray-400">There are currently no active unpaid traffic fines.</p>
        </div>
      )}

      {fines && fines.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {fines.map((f) => (
              <FineCard key={f.fineId} fine={f} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/blacklist"
              className="inline-block border border-white/20 hover:border-white/40 px-6 py-3 rounded-md font-medium transition-colors"
            >
              View More
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
