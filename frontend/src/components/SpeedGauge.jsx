/**
 * SpeedGauge — visual speed indicator with animated arc and color-coded status.
 */
export default function SpeedGauge({ speed, allowedSpeed, status }) {
  const safeSpeed = speed ?? 0;
  const maxDisplay = Math.max(allowedSpeed * 1.8, 160);
  const pct = Math.min(safeSpeed / maxDisplay, 1);
  const angle = -135 + pct * 270; // arc from -135° to +135°

  const statusColors = {
    NORMAL: { ring: "#22c55e", glow: "rgba(34,197,94,0.3)" },
    WARNING: { ring: "#f97316", glow: "rgba(249,115,22,0.3)" },
    OVERSPEED: { ring: "#ef4444", glow: "rgba(239,68,68,0.4)" },
    VIOLATION: { ring: "#dc2626", glow: "rgba(220,38,38,0.5)" },
  };
  const colors = statusColors[status] || statusColors.NORMAL;

  // SVG arc path helper
  const arcPath = (startAngle, endAngle, r) => {
    const toRad = (a) => ((a - 90) * Math.PI) / 180;
    const x1 = 100 + r * Math.cos(toRad(startAngle));
    const y1 = 100 + r * Math.sin(toRad(startAngle));
    const x2 = 100 + r * Math.cos(toRad(endAngle));
    const y2 = 100 + r * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const bgArc = arcPath(-135, 135, 80);
  const valueAngle = Math.min(angle, 135);
  const valueArc = valueAngle > -135 ? arcPath(-135, valueAngle, 80) : "";

  // Limit marker position
  const limitPct = Math.min(allowedSpeed / maxDisplay, 1);
  const limitAngle = -135 + limitPct * 270;
  const limitRad = ((limitAngle - 90) * Math.PI) / 180;
  const limitX = 100 + 80 * Math.cos(limitRad);
  const limitY = 100 + 80 * Math.sin(limitRad);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 200, height: 200 }}>
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Background arc */}
          <path
            d={bgArc}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Value arc */}
          {valueArc && (
            <path
              d={valueArc}
              fill="none"
              stroke={colors.ring}
              strokeWidth="10"
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 8px ${colors.glow})`,
                transition: "d 0.3s ease, stroke 0.3s ease",
              }}
            />
          )}
          {/* Speed limit marker */}
          <circle
            cx={limitX}
            cy={limitY}
            r="5"
            fill="#fff"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="1"
          />
          <text x={limitX} y={limitY - 10} textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="600">
            {allowedSpeed}
          </text>
          {/* Center speed display */}
          <text x="100" y="92" textAnchor="middle" fill="white" fontSize="36" fontWeight="800" fontFamily="Inter, sans-serif">
            {Math.round(safeSpeed)}
          </text>
          <text x="100" y="112" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="500">
            km/h
          </text>
          {/* Status label */}
          <text x="100" y="140" textAnchor="middle" fill={colors.ring} fontSize="12" fontWeight="700" letterSpacing="1">
            {status || "—"}
          </text>
        </svg>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-400">
        <span>Limit: <span className="text-white font-semibold">{allowedSpeed} km/h</span></span>
        {safeSpeed > allowedSpeed && (
          <span>Excess: <span className="text-red-400 font-semibold">+{Math.round(safeSpeed - allowedSpeed)} km/h</span></span>
        )}
      </div>
    </div>
  );
}
