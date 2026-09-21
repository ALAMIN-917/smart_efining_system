import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getSessionStatus } from "../services/api";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing payment session reference.");
      return;
    }
    getSessionStatus(sessionId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message));
  }, [sessionId]);

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center fade-in">
      {error && (
        <>
          <h1 className="text-2xl font-bold mb-2">Something Went Wrong</h1>
          <p className="text-gray-400 mb-6">{error}</p>
        </>
      )}

      {!error && !data && <p className="text-gray-400">Confirming your payment…</p>}

      {data && (
        <div className="glass rounded-2xl p-8">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-1">
            {data.status === "SUCCEEDED" ? "Payment Successful" : "Payment Processing"}
          </h1>
          <p className="text-gray-400 mb-6">
            {data.status === "SUCCEEDED"
              ? "Your traffic fine has been successfully paid."
              : "We're confirming your payment with Stripe — this can take a few seconds."}
          </p>

          <dl className="text-left space-y-2 text-sm">
            <Row label="Fine ID" value={data.fineId} />
            <Row label="Vehicle" value={data.registrationNumber || "—"} />
            <Row label="Amount Paid" value={`৳${data.amount?.toLocaleString()}`} />
            <Row label="Payment Status" value={data.status} />
          </dl>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => window.print()}
              className="flex-1 border border-white/20 hover:border-white/40 px-4 py-2.5 rounded-md text-sm font-medium"
            >
              Download Receipt
            </button>
            <Link to="/" className="flex-1 bg-accent hover:bg-accent/90 px-4 py-2.5 rounded-md text-sm font-medium">
              Back to Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
