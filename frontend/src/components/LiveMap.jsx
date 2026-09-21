import { useEffect, useRef } from "react";

/**
 * LiveMap — Leaflet map component showing vehicle position, speed zones,
 * and recent vehicle trail. Uses the global L (Leaflet) loaded from CDN.
 */
export default function LiveMap({ telemetry, speedZones, trail }) {
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

    const map = L.map(mapRef.current, {
      center: [23.77, 90.40], // Dhaka default
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Draw speed zones ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L || !speedZones?.length) return;

    // Remove previous zone layers.
    zoneLayersRef.current.forEach((layer) => map.removeLayer(layer));
    zoneLayersRef.current = [];

    speedZones.forEach((zone) => {
      const circle = L.circle(
        [zone.center.latitude, zone.center.longitude],
        {
          radius: zone.radius,
          color: "#38bdf8",
          fillColor: "#38bdf8",
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: "6 4",
        }
      ).addTo(map);

      circle.bindTooltip(
        `<strong>${zone.name}</strong><br/>Limit: ${zone.speedLimit} km/h`,
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

    const { latitude, longitude, speed, allowedSpeed, status, vehicleId, registrationNumber, zoneName } = telemetry;
    if (!latitude || !longitude) return;

    const latLng = [latitude, longitude];

    // Status-based marker colour.
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
        width: 18px; height: 18px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 0 12px ${color}88, 0 2px 8px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (!markerRef.current) {
      markerRef.current = L.marker(latLng, { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng(latLng);
      markerRef.current.setIcon(icon);
    }

    // Popup content.
    const popupHtml = `
      <div style="font-family:Inter,sans-serif; font-size:12px; min-width:160px; color:#1a1a1a;">
        <div style="font-weight:700; font-size:13px; margin-bottom:6px;">
          🚗 ${vehicleId || "Unknown"}
        </div>
        ${registrationNumber ? `<div style="color:#666; margin-bottom:4px;">${registrationNumber}</div>` : ""}
        <div style="display:flex; justify-content:space-between; margin-top:4px;">
          <span>Speed:</span>
          <strong style="color:${color}">${speed != null ? Math.round(speed) + " km/h" : "N/A"}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Limit:</span>
          <strong>${allowedSpeed || "—"} km/h</strong>
        </div>
        <div style="margin-top:6px; padding:3px 8px; border-radius:4px; text-align:center;
          background:${color}22; color:${color}; font-weight:600; font-size:11px;">
          ${status || "NORMAL"}
        </div>
        ${zoneName ? `<div style="color:#888; font-size:11px; margin-top:4px;">📍 ${zoneName}</div>` : ""}
      </div>
    `;

    markerRef.current.bindPopup(popupHtml, { maxWidth: 220 });

    // Pan map to vehicle if it's far from current view.
    if (!map.getBounds().contains(latLng)) {
      map.flyTo(latLng, 14, { duration: 1.5 });
    }
  }, [telemetry]);

  // ── Draw vehicle trail polyline ────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (trailLineRef.current) {
      map.removeLayer(trailLineRef.current);
      trailLineRef.current = null;
    }

    if (!trail?.length || trail.length < 2) return;

    const latlngs = trail.map((p) => [p.latitude, p.longitude]);
    trailLineRef.current = L.polyline(latlngs, {
      color: "#38bdf8",
      weight: 3,
      opacity: 0.6,
      dashArray: "8 6",
    }).addTo(map);
  }, [trail]);

  return (
    <div
      ref={mapRef}
      id="live-map"
      className="w-full rounded-xl overflow-hidden border border-white/10"
      style={{ height: "420px", background: "#14171c" }}
    />
  );
}
