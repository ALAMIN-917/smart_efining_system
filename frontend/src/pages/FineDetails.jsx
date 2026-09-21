import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getFineById, createCheckoutSession } from "../services/api";
import { StatusBadge } from "../components/FineCard";

export default function FineDetails() {
  const { fineId } = useParams();
  const [fine, setFine] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);

  useEffect(() => {
    getFineById(fineId)
      .then((res) => setFine(res.data))
      .catch((err) => setError(err.message));
  }, [fineId]);

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await createCheckoutSession(fineId);
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      setPayError(err.message || "We couldn't initiate the payment. Please try again.");
      setPaying(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-2">Fine Not Found</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <Link to="/blacklist" className="text-accent2">← Back to Blacklist</Link>
      </div>
    );
  }

  if (!fine) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24">
        <div className="skeleton h-8 w-2/3 rounded mb-4" />
        <div className="skeleton h-40 w-full rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 fade-in">
      <Link to="/blacklist" className="text-sm text-gray-400 hover:text-white">← Back to Blacklist</Link>

      <div className="glass rounded-2xl p-6 md:p-8 mt-4">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">Fine Details</h1>
          <StatusBadge status={fine.status} />
        </div>

        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mt-6 text-sm">
          <Field label="Fine ID" value={fine.fineId} />
          <Field label="Vehicle ID" value={fine.vehicleId} />
          <Field label="Registration" value={fine.registrationNumber} />
          <Field label="Owner" value={fine.ownerName} />
          <Field label="Violation" value={fine.violationType} />
          <Field label="Recorded Speed" value={`${fine.recordedSpeed} km/h`} />
          <Field label="Allowed Speed" value={`${fine.allowedSpeed} km/h`} />
          <Field label="Excess Speed" value={`${fine.excessSpeed} km/h`} />
          <Field label="Violation Date" value={new Date(fine.violationDate).toLocaleString()} />
          <Field label="Location" value={fine.location || "—"} />
        </dl>

        <div className="border-t border-white/10 mt-6 pt-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Fine Amount</p>
            <p className="text-3xl font-bold text-accent2">৳{fine.fineAmount.toLocaleString()}</p>
          </div>

          {fine.status === "UNPAID" && (
            <button
              onClick={handlePay}
              disabled={paying}
              className="bg-accent hover:bg-accent/90 disabled:opacity-60 px-6 py-3 rounded-md font-medium transition-colors"
            >
              {paying ? "Redirecting to Stripe…" : "Proceed to Secure Payment"}
            </button>
          )}
        </div>

        {fine.status === "PAID" && (
          <p className="mt-4 text-ok bg-ok/10 border border-ok/30 rounded-md p-3 text-sm">
            Fine Already Paid — this fine has already been settled and is no longer an active outstanding violation.
          </p>
        )}
        {fine.status === "CANCELLED" && (
          <p className="mt-4 text-gray-400 bg-white/5 border border-white/10 rounded-md p-3 text-sm">
            This fine has been cancelled and is not payable.
          </p>
        )}
        {payError && (
          <p className="mt-4 text-accent bg-accent/10 border border-accent/30 rounded-md p-3 text-sm">{payError}</p>
        )}

        <p className="text-xs text-gray-500 mt-6 text-center">
          🔒 TEST PAYMENT MODE — all payments are simulated via Stripe test checkout.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-white mt-0.5">{value}</dd>
    </div>
  );
}
