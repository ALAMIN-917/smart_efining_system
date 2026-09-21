/**
 * ViolationAlert — warning and violation alert banners.
 * Shows contextual alerts based on vehicle status.
 */
export default function ViolationAlert({ telemetry }) {
  if (!telemetry || telemetry.status === "NORMAL") return null;

  const { status, speed, allowedSpeed, vehicleId, registrationNumber, zoneName, fineId, fineAmount } = telemetry;

  if (status === "WARNING") {
    return (
      <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-5 fade-in">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">⚠️</span>
          <div className="flex-1">
            <h3 className="font-bold text-orange-400 text-lg">OVERSPEED WARNING</h3>
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
              {registrationNumber && (
                <AlertRow label="Vehicle" value={registrationNumber} />
              )}
              <AlertRow label="Current Speed" value={`${Math.round(speed)} km/h`} highlight />
              <AlertRow label="Allowed Speed" value={`${allowedSpeed} km/h`} />
              <AlertRow
                label="Excess Speed"
                value={`+${Math.round(speed - allowedSpeed)} km/h`}
                highlight
              />
              {zoneName && <AlertRow label="Location" value={zoneName} span />}
            </div>
            <p className="text-orange-300/60 text-xs mt-3">
              ⚠ Reduce speed immediately to avoid a fine.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "OVERSPEED") {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 fade-in animate-pulse-slow">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">🚨</span>
          <div className="flex-1">
            <h3 className="font-bold text-red-400 text-lg">OVERSPEED DETECTED</h3>
            <p className="text-red-300/70 text-sm mt-1">
              Continuous overspeeding detected. A violation will be confirmed if speed is not reduced.
            </p>
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
              {registrationNumber && (
                <AlertRow label="Vehicle" value={registrationNumber} />
              )}
              <AlertRow label="Current Speed" value={`${Math.round(speed)} km/h`} highlight />
              <AlertRow label="Allowed Speed" value={`${allowedSpeed} km/h`} />
              <AlertRow
                label="Excess Speed"
                value={`+${Math.round(speed - allowedSpeed)} km/h`}
                highlight
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "VIOLATION") {
    return (
      <div className="rounded-xl border-2 border-red-600/60 bg-red-600/15 p-5 fade-in shadow-lg shadow-red-900/20">
        <div className="flex items-start gap-3">
          <span className="text-3xl mt-0.5">🚨</span>
          <div className="flex-1">
            <h3 className="font-extrabold text-red-400 text-xl">SPEED VIOLATION CONFIRMED</h3>
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
              {fineId && <AlertRow label="Fine ID" value={fineId} />}
              {registrationNumber && <AlertRow label="Vehicle" value={registrationNumber} />}
              <AlertRow label="Recorded Speed" value={`${Math.round(speed)} km/h`} highlight />
              <AlertRow label="Allowed Speed" value={`${allowedSpeed} km/h`} />
              {fineAmount && (
                <AlertRow label="Fine Amount" value={`৳${fineAmount.toLocaleString()}`} highlight />
              )}
              <AlertRow label="Status" value="UNPAID" highlight />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function AlertRow({ label, value, highlight, span }) {
  return (
    <div className={`flex justify-between ${span ? "sm:col-span-2" : ""}`}>
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${highlight ? "text-white" : "text-gray-200"}`}>
        {value}
      </span>
    </div>
  );
}
