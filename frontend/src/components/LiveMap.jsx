import { useEffect, useRef } from "react";

/**
 * LiveMap — Leaflet map component showing vehicle position, speed zones,
 * and recent vehicle trail. Uses the global L (Leaflet) loaded from CDN.
 * Adheres to BRTA 2024 Speed Limit Guidelines and filters out GPS teleport jumps.
 */
export default function LiveMap({ telemetry, speedZones, trail, onClearTrail }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const trailLineRef = useRef(null);
  const zoneLayersRef = useRef([]);

  // ── Initialise map once ────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    const L = window.L;
    if (!L) return;

    // Initial center: Trishal / Dhaka corridor
    const initialLat = telemetry?.latitude || 24.5822;
    const initialLng = telemetry?.longitude || 90.3958;

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors | BRTA Guideline 2024",
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Draw speed zones with BRTA category-specific styling ────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L || !speedZones?.length) return;

    // Remove previous zone layers
    zoneLayersRef.current.forEach((layer) => map.removeLayer(layer));
    zoneLayersRef.current = [];

    // Color code based on speed limit / road type
    const getZoneColor = (zone) => {
      if (zone.roadType?.includes("School") || zone.speedLimit <= 30) return "#10b981"; // Emerald
      if (zone.roadType?.includes("Urban") || zone.speedLimit <= 40) return "#f97316";  // Orange
      if (zone.roadType?.includes("Expressway")) return "#a855f7";                     // Purple
      return "#38bdf8"; // Sky Blue (National Highway)
    };

    speedZones.forEach((zone) => {
      const color = getZoneColor(zone);
      const circle = L.circle([zone.center.latitude, zone.center.longitude], {
        radius: zone.radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.1,
        weight: 1.5,
        dashArray: "6 4",
      }).addTo(map);

      circle.bindTooltip(
        `<div style="font-family:Inter,sans-serif; text-align:left;">
          <strong>${zone.name}</strong><br/>
          <span style="color:${color}; font-weight:600;">Limit: ${zone.speedLimit} km/h</span> | 
          <span style="color:#aaa;">${zone.roadCode || "Highway"}</span>
        </div>`,
        { direction: "top", className: "zone-tooltip" }
      );

      zoneLayersRef.current.push(circle);
    });
  }, [speedZones]);

  // ── Update vehicle marker ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L || !telemetry) return;

    const {
      latitude,
      longitude,
      speed,
      allowedSpeed,
      status,
      vehicleId,
      registrationNumber,
      zoneName,
      roadCode,
      roadType,
    } = telemetry;

    if (!latitude || !longitude) return;

    const latLng = [latitude, longitude];

    // Status-based marker colour
    const statusColors = {
      NORMAL: "#22c55e",
      WARNING: "#f97316",
      OVERSPEED: "#ef4444",
      VIOLATION: "#dc2626",
    };
    const color = statusColors[status] || "#38bdf8";

    const icon = L.divIcon({
      className: "vehicle-marker",
      html: `<div style="
        width: 22px; height: 22px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 0 15px ${color}aa, 0 2px 8px rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: white;"></div>
      </div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    if (!markerRef.current) {
      markerRef.current = L.marker(latLng, { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng(latLng);
      markerRef.current.setIcon(icon);
    }

    // Popup content with official BRTA reference
    const popupHtml = `
      <div style="font-family:Inter,sans-serif; font-size:12px; min-width:180px; color:#1a1a1a;">
        <div style="font-weight:700; font-size:13px; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
          <span>🚗 ${vehicleId || "Vehicle"}</span>
          <span style="font-size:10px; background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:600;">
            ${roadCode || "N3 Highway"}
          </span>
        </div>
        ${registrationNumber ? `<div style="color:#555; font-weight:500; font-size:11px; margin-bottom:6px;">${registrationNumber}</div>` : ""}
        <div style="display:flex; justify-content:space-between; margin-top:4px; border-top:1px solid #eee; padding-top:4px;">
          <span style="color:#666;">Current Speed:</span>
          <strong style="color:${color}; font-size:13px;">${speed != null ? Math.round(speed) + " km/h" : "N/A"}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:2px;">
          <span style="color:#666;">BRTA Speed Limit:</span>
          <strong style="color:#111;">${allowedSpeed || "80"} km/h</strong>
        </div>
        <div style="margin-top:6px; padding:3px 8px; border-radius:4px; text-align:center;
          background:${color}22; color:${color}; font-weight:700; font-size:11px;">
          ${status || "NORMAL"}
        </div>
        ${zoneName ? `<div style="color:#666; font-size:11px; margin-top:6px;">📍 ${zoneName}</div>` : ""}
        <div style="color:#888; font-size:10px; margin-top:4px; text-align:right;">Ref: BRTA Guideline 2024</div>
      </div>
    `;

    markerRef.current.bindPopup(popupHtml, { maxWidth: 240 });

    // Smoothly pan & focus on vehicle position if out of bounds or zoomed out
    if (!map.getBounds().contains(latLng) || map.getZoom() < 13) {
      map.setView(latLng, 15, { animate: true });
    }
  }, [telemetry]);

  // ── Draw vehicle trail polyline (with jump filter to prevent cross-country lines) ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (trailLineRef.current) {
      map.removeLayer(trailLineRef.current);
      trailLineRef.current = null;
    }

    if (!trail?.length || trail.length < 2) return;

    // Segment the trail: if two consecutive points are > 3.0 km apart,
    // break the trail into separate segments to eliminate unrealistic jumps.
    const segments = [];
    let currentSegment = [];

    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      if (!p.latitude || !p.longitude) continue;

      if (currentSegment.length === 0) {
        currentSegment.push([p.latitude, p.longitude]);
      } else {
        const lastP = trail[i - 1];
        const dLat = p.latitude - lastP.latitude;
        const dLng = (p.longitude - lastP.longitude) * Math.cos((p.latitude * Math.PI) / 180);
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.0;

        if (distKm > 3.0) {
          // Unrealistic jump (stale test point) — start a new segment!
          if (currentSegment.length >= 2) segments.push(currentSegment);
          currentSegment = [[p.latitude, p.longitude]];
        } else {
          currentSegment.push([p.latitude, p.longitude]);
        }
      }
    }
    if (currentSegment.length >= 2) segments.push(currentSegment);

    // Add segments to map
    const layerGroup = L.featureGroup();
    segments.forEach((seg) => {
      L.polyline(seg, {
        color: "#38bdf8",
        weight: 3.5,
        opacity: 0.75,
        dashArray: "6 4",
      }).addTo(layerGroup);
    });

    layerGroup.addTo(map);
    trailLineRef.current = layerGroup;
  }, [trail]);

  // Recenter map to current vehicle
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !telemetry?.latitude) return;
    mapInstanceRef.current.setView([telemetry.latitude, telemetry.longitude], 15, { animate: true });
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/10">
      <div
        ref={mapRef}
        id="live-map"
        style={{ height: "460px", background: "#14171c" }}
      />

      {/* Floating Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        {telemetry?.latitude && (
          <button
            onClick={handleRecenter}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-black/75 hover:bg-black text-white border border-white/20 backdrop-blur transition shadow-md flex items-center gap-1.5"
            title="Recenter on vehicle"
          >
            <span>🎯</span> Center Vehicle
          </button>
        )}

        {onClearTrail && (
          <button
            onClick={onClearTrail}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-black/75 hover:bg-rose-950/80 text-rose-300 border border-rose-500/30 backdrop-blur transition shadow-md flex items-center gap-1.5"
            title="Clear old test trail points"
          >
            <span>🧹</span> Clear Trail
          </button>
        )}
      </div>

      {/* Road Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-black/80 backdrop-blur px-3 py-2 rounded-lg border border-white/15 text-[11px] text-gray-300 flex flex-wrap items-center gap-3">
        <span className="font-semibold text-white">BRTA 2024 Zones:</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]"></span> N3 Highway (80 km/h)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span> Trishal Bazar (40 km/h)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> JKKNIU Zone (30 km/h)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></span> N8 Expressway (80 km/h)</span>
      </div>
    </div>
  );
}
