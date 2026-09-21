import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { adminDashboard, adminListFines, adminCancelFine } from "../../services/api";
import { StatusBadge } from "../../components/FineCard";
import RealtimeBadge from "../../components/RealtimeBadge";

export default function AdminDashboard() {
  const token = localStorage.getItem("efine_admin_token");
  const [stats, setStats] = useState(null);
  const [fines, setFines] = useState([]);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(() => {
    return Promise.all([
      adminDashboard().then((res) => setStats(res.data)),
      adminListFines({ limit: 20 }).then((res) => setFines(res.data)),
    ])
      .then(() => setLastUpdated(new Date()))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (token) {
      load();
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }
  }, [token, load]);

  if (!token) return <Navigate to="/admin/login" replace />;

  const cancel = async (fineId) => {
    if (!confirm(`Cancel fine ${fineId}?`)) return;
    await adminCancelFine(fineId).catch((err) => setError(err.message));
    load();
  };

  const logout = () => {
    localStorage.removeItem("efine_admin_token");
    window.location.href = "/admin/login";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-md">
          Log out
        </button>
      </div>

      <RealtimeBadge onRefresh={load} lastUpdated={lastUpdated} />

      {error && <p className="text-accent bg-accent/10 border border-accent/30 rounded-md p-3 mb-6 text-sm">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <StatCard label="Vehicles" value={stats.totalVehicles} />
          <StatCard label="Active Devices" value={stats.activeDevices} />
          <StatCard label="Outstanding" value={stats.outstandingFines} accent />
          <StatCard label="Paid" value={stats.paidFines} />
          <StatCard label="Total Fines (৳)" value={stats.totalFineAmount.toLocaleString()} />
          <StatCard label="Collected (৳)" value={stats.collectedAmount.toLocaleString()} />
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Fines</h2>
      <div className="glass rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400 text-left border-b border-white/10">
            <tr>
              <th className="p-3">Fine ID</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Registration</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {fines.map((f) => (
              <tr key={f.fineId} className="border-b border-white/5">
                <td className="p-3">{f.fineId}</td>
                <td className="p-3">{f.ownerName}</td>
                <td className="p-3">{f.registrationNumber}</td>
                <td className="p-3">৳{f.fineAmount.toLocaleString()}</td>
                <td className="p-3"><StatusBadge status={f.status} /></td>
                <td className="p-3 text-right">
                  {f.status === "UNPAID" && (
                    <button onClick={() => cancel(f.fineId)} className="text-xs text-accent hover:underline">
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${accent ? "text-accent" : "text-white"}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
