import { useEffect, useState, useCallback } from "react";
import { getFines } from "../services/api";
import FineCard, { FineCardSkeleton } from "../components/FineCard";
import RealtimeBadge from "../components/RealtimeBadge";

const FILTERS = ["All", "Overspeeding", "Other"];
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest Fine" },
];

export default function Blacklist() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchFines = useCallback((showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    setError(null);
    return getFines({ status: "UNPAID", page, limit: 9, violationType: filter, sort, q: query })
      .then((res) => {
        setResult(res);
        setLastUpdated(new Date());
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        if (showSkeleton) setLoading(false);
      });
  }, [filter, sort, page, query]);

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchFines(true);
    }, 350); // debounce search
    return () => clearTimeout(handle);
  }, [fetchFines]);

  // Periodic realtime background sync every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFines(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchFines]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-14">
      <h1 className="text-3xl font-bold">Outstanding Traffic Fines</h1>
      <p className="text-gray-400 mt-2 mb-6">Currently active unpaid traffic violations</p>

      <RealtimeBadge onRefresh={() => fetchFines(false)} lastUpdated={lastUpdated} />

      <div className="glass rounded-xl p-4 md:p-5 flex flex-col md:flex-row gap-3 md:items-center mb-8">
        <input
          value={query}
          onChange={(e) => { setPage(1); setQuery(e.target.value); }}
          placeholder="Enter Fine ID, Vehicle ID, Registration or Owner Name"
          className="flex-1 bg-black/30 border border-white/10 rounded-md px-4 py-2.5 text-sm outline-none focus:border-accent/50"
        />
        <select
          value={filter}
          onChange={(e) => { setPage(1); setFilter(e.target.value); }}
          className="bg-black/30 border border-white/10 rounded-md px-3 py-2.5 text-sm"
        >
          {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-md px-3 py-2.5 text-sm"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {error && (
        <p className="text-accent bg-accent/10 border border-accent/30 rounded-md p-4">
          Unable to connect to the fine management server. Please try again later.
        </p>
      )}

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <FineCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && result && result.data.length === 0 && (
        <div className="glass rounded-xl p-10 text-center">
          <h3 className="text-xl font-semibold mb-2">No outstanding fine was found</h3>
          <p className="text-gray-400">Try a different search term or clear the filters.</p>
        </div>
      )}

      {!loading && result && result.data.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {result.data.map((f) => <FineCard key={f.fineId} fine={f} />)}
          </div>

          <div className="flex items-center justify-center gap-2 mt-10 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-md border border-white/10 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-gray-400 px-2">
              Page {result.pagination.page} of {result.pagination.totalPages}
            </span>
            <button
              disabled={page >= result.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md border border-white/10 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
