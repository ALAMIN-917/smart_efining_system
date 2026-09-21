import { useSearchParams, Link } from "react-router-dom";

export default function PaymentCancel() {
  const [params] = useSearchParams();
  const fineId = params.get("fineId");

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center fade-in">
      <div className="glass rounded-2xl p-8">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-1">Payment Failed</h1>
        <p className="text-gray-400 mb-6">
          Your payment was cancelled or could not be completed. No changes were made to your fine.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {fineId && (
            <>
              <Link
                to={`/fine/${fineId}`}
                className="flex-1 bg-accent hover:bg-accent/90 px-4 py-2.5 rounded-md text-sm font-medium"
              >
                Try Again
              </Link>
              <Link
                to={`/fine/${fineId}`}
                className="flex-1 border border-white/20 hover:border-white/40 px-4 py-2.5 rounded-md text-sm font-medium"
              >
                Back to Fine
              </Link>
            </>
          )}
          <Link to="/" className="flex-1 border border-white/20 hover:border-white/40 px-4 py-2.5 rounded-md text-sm font-medium">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
