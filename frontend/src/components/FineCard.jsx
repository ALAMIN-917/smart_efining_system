import { Link } from "react-router-dom";

export function StatusBadge({ status }) {
  const cls = status === "PAID" ? "status-paid" : status === "CANCELLED" ? "status-cancelled" : "status-unpaid";
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{status}</span>;
}

export default function FineCard({ fine }) {
  return (
    <Link
      to={`/fine/${fine.fineId}`}
      className="glass rounded-xl p-5 hover:border-accent/40 transition-colors block fade-in"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{fine.ownerName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Vehicle ID: {fine.vehicleId}</p>
        </div>
        <StatusBadge status={fine.status} />
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-gray-300">
        <p>Registration: <span className="text-white">{fine.registrationNumber}</span></p>
        <p>Violation: <span className="text-white">{fine.violationType}</span></p>
        <p>Date: <span className="text-white">{new Date(fine.violationDate).toLocaleDateString()}</span></p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-semibold text-accent2">৳{fine.fineAmount.toLocaleString()}</span>
        <span className="text-xs text-gray-400">View details →</span>
      </div>
    </Link>
  );
}

export function FineCardSkeleton() {
  return (
    <div className="glass rounded-xl p-5">
      <div className="skeleton h-4 w-1/2 rounded mb-3" />
      <div className="skeleton h-3 w-1/3 rounded mb-5" />
      <div className="skeleton h-3 w-full rounded mb-2" />
      <div className="skeleton h-3 w-2/3 rounded mb-2" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}
