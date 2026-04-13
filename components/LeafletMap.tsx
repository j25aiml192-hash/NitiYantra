"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ─── Fix Leaflet default icon paths (broken by bundlers) ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ─── State → LatLng mapping ─── */
const STATE_COORDS: Record<string, [number, number]> = {
  "Delhi":                [28.6139, 77.2090],
  "NCT of Delhi":        [28.6139, 77.2090],
  "Haryana":             [29.0588, 76.0856],
  "Punjab":              [31.1471, 75.3412],
  "Himachal Pradesh":    [31.1048, 77.1734],
  "Jammu & Kashmir":     [33.7782, 76.5762],
  "Ladakh":              [34.1526, 77.5771],
  "Uttarakhand":         [30.0668, 79.0193],
  "Chandigarh":          [30.7333, 76.7794],
  "Uttar Pradesh":       [26.8467, 80.9462],
  "Madhya Pradesh":      [23.4735, 77.9479],
  "Bihar":               [25.0961, 85.3131],
  "Jharkhand":           [23.6102, 85.2799],
  "Chhattisgarh":        [21.2787, 81.8661],
  "Rajasthan":           [27.0238, 74.2179],
  "Gujarat":             [22.2587, 71.1924],
  "Maharashtra":         [19.7515, 75.7139],
  "Goa":                 [15.2993, 74.1240],
  "Karnataka":           [15.3173, 75.7139],
  "Tamil Nadu":          [11.1271, 78.6569],
  "Kerala":              [10.8505, 76.2711],
  "Andhra Pradesh":      [15.9129, 79.7400],
  "Telangana":           [18.1124, 79.0193],
  "Puducherry":          [11.9416, 79.8083],
  "West Bengal":         [22.9868, 87.8550],
  "Odisha":              [20.9517, 85.0985],
  "Assam":               [26.2006, 92.9376],
  "Meghalaya":           [25.4670, 91.3662],
  "Tripura":             [23.9408, 91.9882],
  "Mizoram":             [23.1645, 92.9376],
  "Manipur":             [24.6637, 93.9063],
  "Nagaland":            [26.1584, 94.5624],
  "Arunachal Pradesh":   [28.2180, 94.7278],
  "Sikkim":              [27.5330, 88.5122],
  "Andaman & Nicobar":   [11.7401, 92.6586],
  "Lakshadweep":         [10.5667, 72.6417],
  "Dadra and Nagar Haveli and Daman and Diu": [20.4283, 72.8397],
};

interface LeafletMapProps {
  stateName: string;
  sidebarOpen?: boolean;
  districtMarkers?: {
    district: string;
    lat: number;
    lng: number;
    total: number;
    severity: string;
  }[];
  onClose: () => void;
}

export default function LeafletMap({ stateName, sidebarOpen, districtMarkers = [], onClose }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  /* Invalidate map size when sidebar toggles */
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
      window.dispatchEvent(new Event("resize"));
    }, 400);
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  const coords = STATE_COORDS[stateName] || [20.5937, 78.9629];
  const zoom = stateName === "Delhi" || stateName === "NCT of Delhi" || stateName === "Chandigarh" || stateName === "Goa" || stateName === "Puducherry"
    ? 11
    : stateName === "Lakshadweep" || stateName === "Andaman & Nicobar"
      ? 8
      : 7;

  /* Initialise the map once */
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: coords,
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
    });

    /* Tile layer — CartoDB Voyager for a premium, clean look */
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 19 }
    ).addTo(map);

    /* Zoom control bottom-right */
    L.control.zoom({ position: "bottomright" }).addTo(map);

    /* Attribution bottom-left */
    L.control.attribution({ position: "bottomleft" }).addTo(map);

    /* Create a layer group for markers (so we can clear & re-add) */
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapInstanceRef.current = map;

    /* Ensure tiles render correctly after container layout settles */
    const handleResize = () => {
      setTimeout(() => map.invalidateSize(), 300);
    };
    handleResize(); // initial call
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fly to new state when stateName changes ── */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const targetCoords = STATE_COORDS[stateName] || [20.5937, 78.9629];
    const targetZoom =
      stateName === "Delhi" || stateName === "NCT of Delhi" || stateName === "Chandigarh" || stateName === "Goa" || stateName === "Puducherry"
        ? 11
        : stateName === "Lakshadweep" || stateName === "Andaman & Nicobar"
          ? 8
          : 7;

    map.flyTo(targetCoords, targetZoom, { duration: 1.2 });
  }, [stateName]);

  /* ── Re-render markers when stateName or districtMarkers change ── */
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    // Clear previous markers
    markersLayer.clearLayers();

    /* Severity color helper */
    const sevColor = (s: string) =>
      ({ critical: "#dc2626", warning: "#eab308", normal: "#16a34a" }[s] ?? "#6b7280");

    /* Add district markers */
    districtMarkers.forEach((d) => {
      const color = sevColor(d.severity);
      const icon = L.divIcon({
        className: "leaflet-custom-marker",
        html: `
          <div style="
            width: 28px; height: 28px; border-radius: 50%;
            background: ${color}; border: 3px solid white;
            box-shadow: 0 2px 8px ${color}80, 0 0 0 4px ${color}20;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 10px; font-weight: 700;
            transition: transform 0.2s;
          ">${d.total}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([d.lat, d.lng], { icon });
      marker.bindPopup(`
        <div style="font-family: Inter, system-ui, sans-serif; min-width: 160px;">
          <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 4px;">${d.district}</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
            <span style="font-size: 11px; color: #64748b; text-transform: capitalize;">${d.severity}</span>
          </div>
          <div style="font-size: 11px; color: #475569;">
            <strong style="color: #1e293b;">${d.total}</strong> total complaints
          </div>
        </div>
      `, { className: "leaflet-premium-popup" });
      markersLayer.addLayer(marker);
    });

    /* State center marker (if no district markers) */
    if (districtMarkers.length === 0) {
      const stateCoords = STATE_COORDS[stateName] || [20.5937, 78.9629];
      const icon = L.divIcon({
        className: "leaflet-state-marker",
        html: `
          <div style="
            width: 14px; height: 14px; border-radius: 50%;
            background: #6366f1; border: 3px solid white;
            box-shadow: 0 2px 8px rgba(99,102,241,0.5);
          "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const centerMarker = L.marker(stateCoords as [number, number], { icon });
      centerMarker.bindPopup(`<strong>${stateName}</strong>`);
      markersLayer.addLayer(centerMarker);
    }
  }, [stateName, districtMarkers]);

  return (
    <div
      className="fixed inset-0 z-[60]"
      style={{ animation: "leafletFadeIn 0.4s ease-out" }}
    >
      <style>{`
        @keyframes leafletFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .leaflet-premium-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          border: 1px solid #e2e8f0;
        }
        .leaflet-premium-popup .leaflet-popup-tip {
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
      `}</style>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={onClose} />

      {/* Map container */}
      <div className="absolute inset-4 md:inset-8 rounded-2xl overflow-hidden shadow-2xl border border-white/40 bg-white">
        {/* Header bar */}
        <div className="absolute top-0 left-0 right-0 z-[1000] h-14 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 m-0">{stateName}</p>
              <p className="text-[10px] text-slate-400 m-0">
                Interactive Map View • {districtMarkers.length} district{districtMarkers.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>

        {/* Leaflet map */}
        <div ref={mapRef} className="w-full h-full" style={{ paddingTop: 0 }} />
      </div>
    </div>
  );
}
