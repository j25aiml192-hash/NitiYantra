"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSidebar } from "@/lib/SidebarContext";
import { fetchComplaints, ComplaintResponse } from "@/lib/api";
import "leaflet/dist/leaflet.css";

/* ─── types ─── */
interface DistrictMarker {
  district: string;
  state: string;
  lat: number;
  lng: number;
  total: number;
  delayed: number;
  active: number;
  resolved: number;
  categories: string[];
  severity: "critical" | "warning" | "normal";
}

/* ─── State → LatLng + zoom mapping ─── */
const STATE_COORDS: Record<string, { center: [number, number]; zoom: number }> = {
  "Delhi":                { center: [28.6139, 77.2090], zoom: 11 },
  "NCT of Delhi":        { center: [28.6139, 77.2090], zoom: 11 },
  "Haryana":             { center: [29.0588, 76.0856], zoom: 7 },
  "Punjab":              { center: [31.1471, 75.3412], zoom: 7 },
  "Himachal Pradesh":    { center: [31.1048, 77.1734], zoom: 7 },
  "Jammu & Kashmir":     { center: [33.7782, 76.5762], zoom: 7 },
  "Ladakh":              { center: [34.1526, 77.5771], zoom: 7 },
  "Uttarakhand":         { center: [30.0668, 79.0193], zoom: 7 },
  "Chandigarh":          { center: [30.7333, 76.7794], zoom: 11 },
  "Uttar Pradesh":       { center: [26.8467, 80.9462], zoom: 7 },
  "Madhya Pradesh":      { center: [23.4735, 77.9479], zoom: 7 },
  "Bihar":               { center: [25.0961, 85.3131], zoom: 7 },
  "Jharkhand":           { center: [23.6102, 85.2799], zoom: 7 },
  "Chhattisgarh":        { center: [21.2787, 81.8661], zoom: 7 },
  "Rajasthan":           { center: [27.0238, 74.2179], zoom: 7 },
  "Gujarat":             { center: [22.2587, 71.1924], zoom: 7 },
  "Maharashtra":         { center: [19.7515, 75.7139], zoom: 7 },
  "Goa":                 { center: [15.2993, 74.1240], zoom: 11 },
  "Karnataka":           { center: [15.3173, 75.7139], zoom: 7 },
  "Tamil Nadu":          { center: [11.1271, 78.6569], zoom: 7 },
  "Kerala":              { center: [10.8505, 76.2711], zoom: 8 },
  "Andhra Pradesh":      { center: [15.9129, 79.7400], zoom: 7 },
  "Telangana":           { center: [18.1124, 79.0193], zoom: 7 },
  "Puducherry":          { center: [11.9416, 79.8083], zoom: 11 },
  "West Bengal":         { center: [22.9868, 87.8550], zoom: 7 },
  "Odisha":              { center: [20.9517, 85.0985], zoom: 7 },
  "Assam":               { center: [26.2006, 92.9376], zoom: 7 },
  "Meghalaya":           { center: [25.4670, 91.3662], zoom: 8 },
  "Tripura":             { center: [23.9408, 91.9882], zoom: 9 },
  "Mizoram":             { center: [23.1645, 92.9376], zoom: 9 },
  "Manipur":             { center: [24.6637, 93.9063], zoom: 9 },
  "Nagaland":            { center: [26.1584, 94.5624], zoom: 9 },
  "Arunachal Pradesh":   { center: [28.2180, 94.7278], zoom: 7 },
  "Sikkim":              { center: [27.5330, 88.5122], zoom: 10 },
  "Andaman & Nicobar":   { center: [11.7401, 92.6586], zoom: 7 },
  "Lakshadweep":         { center: [10.5667, 72.6417], zoom: 9 },
  "Dadra and Nagar Haveli and Daman and Diu": { center: [20.4283, 72.8397], zoom: 9 },
};



/* ─── district → coords lookup ─── */
const DISTRICT_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  "delhi":             { lat: 28.6139, lng: 77.209,  state: "Delhi" },
  "new delhi":         { lat: 28.6139, lng: 77.209,  state: "Delhi" },
  "south delhi":       { lat: 28.53,   lng: 77.22,   state: "Delhi" },
  "north delhi":       { lat: 28.72,   lng: 77.20,   state: "Delhi" },
  "east delhi":        { lat: 28.63,   lng: 77.30,   state: "Delhi" },
  "west delhi":        { lat: 28.65,   lng: 77.10,   state: "Delhi" },
  "central delhi":     { lat: 28.64,   lng: 77.22,   state: "Delhi" },
  "gautam buddha nagar":{ lat: 28.5355, lng: 77.391, state: "Uttar Pradesh" },
  "noida":             { lat: 28.5355, lng: 77.391,  state: "Uttar Pradesh" },
  "ghaziabad":         { lat: 28.6692, lng: 77.4538, state: "Uttar Pradesh" },
  "lucknow":           { lat: 26.8467, lng: 80.9462, state: "Uttar Pradesh" },
  "agra":              { lat: 27.1767, lng: 78.0081, state: "Uttar Pradesh" },
  "varanasi":          { lat: 25.3176, lng: 82.9739, state: "Uttar Pradesh" },
  "prayagraj":         { lat: 25.4358, lng: 81.8463, state: "Uttar Pradesh" },
  "meerut":            { lat: 28.9845, lng: 77.7064, state: "Uttar Pradesh" },
  "kanpur":            { lat: 26.4499, lng: 80.3319, state: "Uttar Pradesh" },
  "gurugram":          { lat: 28.4595, lng: 77.0266, state: "Haryana" },
  "gurgaon":           { lat: 28.4595, lng: 77.0266, state: "Haryana" },
  "faridabad":         { lat: 28.4089, lng: 77.3178, state: "Haryana" },
  "hisar":             { lat: 29.1492, lng: 75.7217, state: "Haryana" },
  "panipat":           { lat: 29.3909, lng: 76.9635, state: "Haryana" },
  "karnal":            { lat: 29.6857, lng: 76.9905, state: "Haryana" },
  "ambala":            { lat: 30.3782, lng: 76.7767, state: "Haryana" },
  "rohtak":            { lat: 28.8955, lng: 76.5892, state: "Haryana" },
  "mumbai":            { lat: 19.076,  lng: 72.8777, state: "Maharashtra" },
  "pune":              { lat: 18.5204, lng: 73.8567, state: "Maharashtra" },
  "bangalore":         { lat: 12.9716, lng: 77.5946, state: "Karnataka" },
  "bengaluru":         { lat: 12.9716, lng: 77.5946, state: "Karnataka" },
  "chennai":           { lat: 13.0827, lng: 80.2707, state: "Tamil Nadu" },
  "kolkata":           { lat: 22.5726, lng: 88.3639, state: "West Bengal" },
  "hyderabad":         { lat: 17.385,  lng: 78.4867, state: "Telangana" },
  "jaipur":            { lat: 26.9124, lng: 75.7873, state: "Rajasthan" },
  "chandigarh":        { lat: 30.7333, lng: 76.7794, state: "Chandigarh" },
  "bhopal":            { lat: 23.2599, lng: 77.4126, state: "Madhya Pradesh" },
  "patna":             { lat: 25.6093, lng: 85.1376, state: "Bihar" },
  /* ── Additional cities for national coverage ── */
  "surat":             { lat: 21.1702, lng: 72.8311, state: "Gujarat" },
  "ahmedabad":         { lat: 23.0225, lng: 72.5714, state: "Gujarat" },
  "vadodara":          { lat: 22.3072, lng: 73.1812, state: "Gujarat" },
  "rajkot":            { lat: 22.3039, lng: 70.8022, state: "Gujarat" },
  "indore":            { lat: 22.7196, lng: 75.8577, state: "Madhya Pradesh" },
  "jabalpur":          { lat: 23.1815, lng: 79.9864, state: "Madhya Pradesh" },
  "gwalior":           { lat: 26.2183, lng: 78.1828, state: "Madhya Pradesh" },
  "raipur":            { lat: 21.2514, lng: 81.6296, state: "Chhattisgarh" },
  "ranchi":            { lat: 23.3441, lng: 85.3096, state: "Jharkhand" },
  "howrah":            { lat: 22.5958, lng: 88.2636, state: "West Bengal" },
  "siliguri":          { lat: 26.7271, lng: 88.3953, state: "West Bengal" },
  "bhubaneswar":       { lat: 20.2961, lng: 85.8245, state: "Odisha" },
  "coimbatore":        { lat: 11.0168, lng: 76.9558, state: "Tamil Nadu" },
  "madurai":           { lat: 9.9252,  lng: 78.1198, state: "Tamil Nadu" },
  "tiruchirappalli":   { lat: 10.7905, lng: 78.7047, state: "Tamil Nadu" },
  "visakhapatnam":     { lat: 17.6868, lng: 83.2185, state: "Andhra Pradesh" },
  "kochi":             { lat: 9.9312,  lng: 76.2673, state: "Kerala" },
  "kozhikode":         { lat: 11.2588, lng: 75.7804, state: "Kerala" },
  "thiruvananthapuram":{ lat: 8.5241,  lng: 76.9366, state: "Kerala" },
  "ludhiana":          { lat: 30.9010, lng: 75.8573, state: "Punjab" },
  "amritsar":          { lat: 31.6340, lng: 74.8723, state: "Punjab" },
  "jodhpur":           { lat: 26.2389, lng: 73.0243, state: "Rajasthan" },
  "udaipur":           { lat: 24.5854, lng: 73.7125, state: "Rajasthan" },
  "kota":              { lat: 25.2138, lng: 75.8648, state: "Rajasthan" },
  "mangaluru":         { lat: 12.9141, lng: 74.8560, state: "Karnataka" },
  "mysuru":            { lat: 12.2958, lng: 76.6394, state: "Karnataka" },
  "hubli":             { lat: 15.3647, lng: 75.1240, state: "Karnataka" },
  "nashik":            { lat: 19.9975, lng: 73.7898, state: "Maharashtra" },
  "thane":             { lat: 19.2183, lng: 72.9781, state: "Maharashtra" },
};

const DEFAULT_COORDS = { lat: 28.6, lng: 77.2, state: "Delhi" };

const CATEGORY_COLORS: Record<string, string> = {
  Roads: "#f59e0b", "Water Supply": "#06b6d4", Water: "#06b6d4",
  Electricity: "#6366f1", Sanitation: "#10b981", "Public Safety": "#ef4444",
  Infrastructure: "#8b5cf6", Healthcare: "#ec4899", Education: "#14b8a6",
  Transport: "#f97316", Housing: "#a855f7", Environment: "#22c55e",
};

const getSeverityColor = (s: string) =>
  ({ critical: "#dc2626", warning: "#eab308", normal: "#16a34a" }[s] ?? "#6b7280");

/* ─── group complaints into district markers ─── */
function buildMarkers(complaints: ComplaintResponse[]): DistrictMarker[] {
  const grouped: Record<string, ComplaintResponse[]> = {};
  for (const c of complaints) {
    const key = (c.district || "unknown").toLowerCase().trim();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  return Object.entries(grouped).map(([key, items]) => {
    const coords = DISTRICT_COORDS[key] || DEFAULT_COORDS;
    const total = items.length;
    const resolved = items.filter((i) => i.status === "resolved").length;
    const escalated = items.filter((i) => i.escalated || i.status === "escalated" || i.status === "delayed" || i.status === "overdue").length;
    const active = total - resolved;
    const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

    /* Severity thresholds: escalated + unresolved ratio */
    const unresolved = total - resolved;
    const severity: "critical" | "warning" | "normal" =
      escalated >= 3 || (unresolved >= 4 && resolved === 0) ? "critical"
      : escalated >= 1 || unresolved >= 2 ? "warning"
      : "normal";

    return {
      district: items[0]?.district || key,
      state: coords.state,
      lat: coords.lat,
      lng: coords.lng,
      total,
      delayed: escalated,
      active,
      resolved,
      categories,
      severity,
    };
  });
}

/* ═══════════════ COMPONENT ═══════════════ */
export default function HeatmapPage() {
  const { isOpen: sidebarOpen } = useSidebar();
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionLevel, setRegionLevel] = useState("state");
  const [filterState, setFilterState] = useState("All");
  const [notifOpen, setNotifOpen] = useState(false);

  /* Listen for notification panel toggle from Header */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setNotifOpen(detail?.open ?? false);
    };
    window.addEventListener("notif-toggle", handler);
    return () => window.removeEventListener("notif-toggle", handler);
  }, []);

  /* Leaflet refs */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  /* Fetch complaints from backend */
  const loadComplaints = useCallback(async () => {
    try {
      const data = await fetchComplaints();
      setComplaints(data);
    } catch (err) {
      console.error("Error fetching complaints:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
    const interval = setInterval(loadComplaints, 30000);
    return () => clearInterval(interval);
  }, [loadComplaints]);

  /* Build markers from real data */
  const markers = useMemo(() => buildMarkers(complaints), [complaints]);

  /* State list for filter dropdown */
  const stateList = useMemo(() => {
    const states = Array.from(new Set(markers.map((m) => m.state)));
    return states.sort();
  }, [markers]);

  /* Filtered markers */
  const filteredMarkers = useMemo(() => {
    if (filterState === "All") return markers;
    return markers.filter((m) => m.state === filterState);
  }, [markers, filterState]);

  const totalComplaints = filteredMarkers.reduce((a, d) => a + d.total, 0);
  const criticalCount = filteredMarkers.filter((d) => d.severity === "critical").length;
  const stateIssues = selectedState ? filteredMarkers.filter((d) => d.state === selectedState) : [];
  const selectedData = selectedDistrict ? filteredMarkers.find((m) => m.district === selectedDistrict) ?? null : null;

  /* ═══ Initialise Leaflet map (once, client-side) ═══ */
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");

      leafletRef.current = L;

      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const indiaBounds: [[number, number], [number, number]] = [
        [5.0, 67.0],
        [37.0, 98.0]
      ];

      const map = L.map(mapContainerRef.current!, {
        zoomControl: false,
        attributionControl: false,
        maxBounds: [[5.0, 66.0], [38.0, 99.0]],
        maxBoundsViscosity: 1.0,
        minZoom: 4,
        maxZoom: 10,
      });

      /* Fit map to India bounds instead of static center/zoom */
      map.fitBounds(indiaBounds, { padding: [20, 20] });

      /* Clean, minimal tile layer */
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19, attribution: "" }
      ).addTo(map);

      /* ── Mask everything outside India ── */
      try {
        const geoRes = await fetch(
          "https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson"
        );
        if (geoRes.ok) {
          const indiaGeo = await geoRes.json();
          // Build a world polygon with India as a hole
          const worldOuter: [number, number][] = [
            [-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]
          ];
          // Extract India coordinates (handle FeatureCollection or Feature)
          const features = indiaGeo.features || [indiaGeo];
          const indiaHoles: [number, number][][] = [];
          for (const feature of features) {
            const geom = feature.geometry;
            if (geom.type === "Polygon") {
              indiaHoles.push(geom.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]));
            } else if (geom.type === "MultiPolygon") {
              for (const poly of geom.coordinates) {
                indiaHoles.push(poly[0].map((c: number[]) => [c[1], c[0]] as [number, number]));
              }
            }
          }
          // Create mask polygon: world exterior with India holes
          const maskCoords = [worldOuter, ...indiaHoles];
          L.polygon(maskCoords, {
            fillColor: "#f8f4ec",
            fillOpacity: 0.97,
            stroke: true,
            color: "#6366f1",
            weight: 2,
            opacity: 0.3,
            interactive: false,
          }).addTo(map);

          // Add India border outline
          L.geoJSON(indiaGeo, {
            style: {
              color: "#6366f1",
              weight: 1.5,
              fillColor: "transparent",
              fillOpacity: 0,
              opacity: 0.5,
            },
            interactive: false,
          }).addTo(map);
        }
      } catch (e) {
        console.warn("Could not load India boundary:", e);
      }

      L.control.zoom({ position: "topleft" }).addTo(map);
      L.control.attribution({ position: "bottomleft" }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      /* Click empty map area → smooth zoom-out to India */
      map.on("click", () => {
        setTimeout(() => {
          setSelectedState(null);
          setSelectedDistrict(null);
        }, 100);
      });

      /* Initial size fix */
      setTimeout(() => map.invalidateSize(), 300);

      setMapReady(true);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  /* ═══ Invalidate map size when sidebar toggles ═══ */
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 350);
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  /* ═══ Re-render markers when data changes ═══ */
  useEffect(() => {
    const L = leafletRef.current;
    const markersLayer = markersLayerRef.current;
    if (!L || !markersLayer || !mapReady) return;

    markersLayer.clearLayers();

    const visibleMarkers = selectedState
      ? filteredMarkers.filter((d) => d.state === selectedState)
      : filteredMarkers;

    visibleMarkers.forEach((d) => {
      const color = getSeverityColor(d.severity);
      const icon = L.divIcon({
        className: "leaflet-custom-marker",
        html: `
          <div style="
            width: 30px; height: 30px; border-radius: 50%;
            background: ${color}; border: 3px solid white;
            box-shadow: 0 2px 8px ${color}80, 0 0 0 4px ${color}20;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 11px; font-weight: 700;
            cursor: pointer;
            animation: markerFadeIn 0.4s ease-out;
          ">${d.total}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([d.lat, d.lng], { icon });
      marker.bindPopup(`
        <div style="font-family: Inter, system-ui, sans-serif; min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 4px;">${d.district}</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
            <span style="font-size: 11px; color: #64748b; text-transform: capitalize;">${d.severity}</span>
          </div>
          <div style="font-size: 11px; color: #475569;">
            <strong style="color: #1e293b;">${d.total}</strong> total •
            <strong style="color: #16a34a;">${d.resolved}</strong> resolved •
            <strong style="color: #dc2626;">${d.delayed}</strong> delayed
          </div>
        </div>
      `, { className: "leaflet-premium-popup" });

      marker.on("click", () => {
        setSelectedState(d.state);
        setSelectedDistrict(d.district);
      });

      markersLayer.addLayer(marker);
    });
  }, [filteredMarkers, selectedState, mapReady]);

  /* ═══ FlyTo when state changes ═══ */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (selectedState && STATE_COORDS[selectedState]) {
      const { center, zoom } = STATE_COORDS[selectedState];
      map.flyTo(center, Math.min(zoom, 10), {
        duration: 1.5,
        easeLinearity: 0.25
      });
    } else {
      /* Reset to full India view — smooth zoom-out */
      map.flyToBounds(
        [[5.5, 67.0], [37.5, 98.0]],
        { duration: 1.2, padding: [10, 10], easeLinearity: 0.25 }
      );
    }
  }, [selectedState, mapReady]);

  /* Handlers */
  const handleStateClick = (name: string) => {
    setSelectedState(name);
    setSelectedDistrict(null);
  };

  const resetView = () => {
    setSelectedState(null);
    setSelectedDistrict(null);
  };

  const handleFilterStateChange = (val: string) => {
    setFilterState(val);
    if (val !== "All") {
      setSelectedState(val);
      setSelectedDistrict(null);
    } else {
      resetView();
    }
  };

  const legend = [
    { label: "High", color: "#dc2626" },
    { label: "Medium", color: "#eab308" },
    { label: "Low", color: "#16a34a" },
  ];

  return (
    <div className="h-screen bg-[var(--card)] text-[var(--text)] flex flex-col">
      <style>{`
        .leaflet-premium-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          border: 1px solid #e2e8f0;
        }
        .leaflet-premium-popup .leaflet-popup-tip {
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        .leaflet-custom-marker {
          background: transparent !important;
          border: none !important;
        }
        @keyframes markerFadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ TOP BAR — Modern Glassmorphism ═══ */}
      <div className="h-[56px] bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between px-6 shrink-0 backdrop-blur-sm">
        {/* Left: Title + Status */}
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-[var(--text)] tracking-tight leading-tight">Geographic Monitor</span>
            <div className="flex items-center gap-1.5">
              {loading ? (
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Loading data…
                </span>
              ) : (
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {complaints.length} complaints • Live
                </span>
              )}
            </div>
          </div>

          {/* Breadcrumb navigation */}
          {selectedState && (
            <>
              <div className="w-px h-6 bg-[var(--border)] mx-1" />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={resetView}
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer bg-transparent border-none font-medium transition-colors duration-200"
                >
                  India
                </button>
                <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[11px] font-semibold text-[var(--text)] bg-[var(--accent-light)] px-2.5 py-0.5 rounded-full">
                  {selectedState}
                </span>
                {selectedDistrict && (
                  <>
                    <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-[11px] font-semibold text-[var(--accent)]">
                      {selectedDistrict}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Stats + Legend */}
        <div className="flex items-center gap-4">
          {/* Mini stats pills */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--bg)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
              {filteredMarkers.length} districts
            </span>
            {criticalCount > 0 && (
              <span className="text-[10px] font-semibold text-red-500 bg-red-500/8 px-2.5 py-1 rounded-lg border border-red-500/15">
                {criticalCount} critical
              </span>
            )}
          </div>

          {/* Severity legend */}
          <div className="flex items-center gap-0.5 bg-[var(--bg)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
            {legend.map((l, i) => (
              <div key={l.label} className="flex items-center gap-1" style={{ marginLeft: i > 0 ? 8 : 0 }}>
                <span className="w-2 h-2 rounded-full inline-block ring-1 ring-white/50" style={{ background: l.color }} />
                <span className="text-[10px] font-medium text-[var(--text-muted)]">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 flex min-h-0 relative">

        {/* ─── LEAFLET MAP (inline, respects sidebar) ─── */}
        <div className="flex-1 relative overflow-hidden rounded-xl border border-[var(--border)] shadow-[0_10px_30px_rgba(0,0,0,0.04)] m-1.5 transition-all duration-300 ease-in-out">
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ minHeight: "calc(100vh - 260px)" }}
          />

          {/* Hint at bottom */}
          {!selectedState && !loading && (
            <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-[#8ea4b8] z-[400] pointer-events-none">
              Click a marker or select a state from the panel to zoom in • <strong>{markers.length}</strong> districts with complaints
            </p>
          )}
        </div>

        {/* ═══ FLOATING GLASSMORPHISM PANEL (overlaps map) ═══ */}
        <div
          className="absolute w-80 z-[500] bg-[var(--card)]/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/5 hover:shadow-[0_25px_70px_rgba(0,0,0,0.18)] overflow-auto"
          style={{
            padding: 20,
            maxHeight: "calc(100vh - 64px - 52px - 48px)",
            top: notifOpen ? undefined : 24,
            right: notifOpen ? undefined : 24,
            bottom: notifOpen ? 24 : undefined,
            left: notifOpen ? 24 : undefined,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            animation: notifOpen ? undefined : "panelScaleIn 0.3s ease-out",
          }}
        >
          <style>{`
            @keyframes panelScaleIn {
              from { opacity: 0; transform: scale(0.97) translateY(8px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>

          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-4">Geo-Intelligence</p>

          {selectedState && (
            <button
              onClick={resetView}
              className="flex items-center gap-1.5 mb-4 text-[11px] text-[#4f7df3] hover:text-blue-800 cursor-pointer bg-transparent border-none font-semibold transition-colors"
            >
              ← Back to India
            </button>
          )}

          {/* Region Level */}
          <div className="mb-4">
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium block mb-1.5">Region Level</label>
            <select
              value={regionLevel}
              onChange={(e) => setRegionLevel(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[var(--card)]/50 backdrop-blur-md border border-white/40 text-xs text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[#6495ED]/40 transition-all cursor-pointer"
            >
              <option value="state">State / UT</option>
              <option value="district">District</option>
            </select>
          </div>

          {/* Target State */}
          <div className="mb-4">
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium block mb-1.5">Target State</label>
            <select
              value={filterState}
              onChange={(e) => handleFilterStateChange(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[var(--card)]/50 backdrop-blur-md border border-white/40 text-xs text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[#6495ED]/40 transition-all cursor-pointer"
            >
              <option value="All">National (All States)</option>
              {stateList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Quick state buttons (states with data) */}
          {!selectedState && stateList.length > 0 && (
            <div className="mb-4">
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium block mb-2">Quick Access</label>
              <div className="flex flex-wrap gap-1.5">
                {stateList.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStateClick(s)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-[var(--card)]/50 border border-white/40 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all duration-200 cursor-pointer font-medium"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live stats */}
          <div className="border-t border-black/5 pt-4 mt-1 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[var(--text-muted)]">Complaints</span>
              <span className="text-xs font-semibold text-[#4f7df3]">{totalComplaints}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[var(--text-muted)]">Districts</span>
              <span className="text-xs font-semibold text-[#6495ED]">{filteredMarkers.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[var(--text-muted)]">High Priority</span>
              <span className="text-xs font-semibold text-[#3b6fd4]">{criticalCount}</span>
            </div>
          </div>

          {/* State detail (when zoomed) */}
          <div className={`overflow-hidden transition-all duration-700 ${selectedState ? "max-h-[600px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}>
            {selectedState && (
              <div className="border-t border-black/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-[var(--text)] m-0">{selectedState}</h3>
                  <button onClick={resetView} className="text-[10px] text-blue-600 hover:underline cursor-pointer bg-transparent border-none">← Back</button>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">{stateIssues.length} district{stateIssues.length !== 1 ? "s" : ""} • Live data</p>

                {/* State stats */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {[
                    { label: "Total",    val: stateIssues.reduce((a, d) => a + d.total, 0),    c: "#3b82f6" },
                    { label: "Delayed",  val: stateIssues.reduce((a, d) => a + d.delayed, 0),  c: "#60a5fa" },
                    { label: "Resolved", val: stateIssues.reduce((a, d) => a + d.resolved, 0), c: "#93c5fd" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[var(--card)]/50 rounded-lg p-1.5 text-center border border-white/30">
                      <p className="text-xs font-bold m-0" style={{ color: s.c }}>{s.val}</p>
                      <p className="text-[8px] text-[var(--text-muted)] m-0">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* District list */}
                <div className="flex flex-col gap-1 max-h-[150px] overflow-auto">
                  {stateIssues.map((d) => (
                    <button
                      key={d.district}
                      onClick={() => setSelectedDistrict(selectedDistrict === d.district ? null : d.district)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left w-full cursor-pointer transition-all duration-500 border text-xs ${
                        selectedDistrict === d.district
                          ? "bg-blue-50/80 border-blue-200"
                          : "bg-[var(--card)]/40 border-transparent hover:bg-[var(--card)]/60"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: getSeverityColor(d.severity) }} />
                      <span className="text-[var(--text)] flex-1">{d.district}</span>
                      <span className="text-[10px] text-gray-400">{d.total}</span>
                    </button>
                  ))}
                </div>

                {/* District detail */}
                <div className={`overflow-hidden transition-all duration-700 ${selectedData ? "max-h-60 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}>
                  {selectedData && (
                    <div className="pt-2 border-t border-black/5">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xs font-bold text-[var(--text)] m-0">{selectedData.district}</h4>
                        <span className="text-[8px] font-semibold text-white px-1.5 py-0.5 rounded-full" style={{ background: getSeverityColor(selectedData.severity) }}>
                          {selectedData.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-1.5 mb-2">
                        {[
                          { label: "Active", val: selectedData.active, max: selectedData.total, c: "#3b82f6" },
                          { label: "Resolved", val: selectedData.resolved, max: selectedData.total, c: "#93c5fd" },
                        ].map((bar) => (
                          <div key={bar.label}>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-[9px] text-[var(--text-muted)]">{bar.label}</span>
                              <span className="text-[9px] font-semibold" style={{ color: bar.c }}>
                                {bar.label === "Resolved" ? `${bar.max > 0 ? Math.round((bar.val / bar.max) * 100) : 0}%` : bar.val}
                              </span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ background: bar.c, width: `${bar.max > 0 ? (bar.val / bar.max) * 100 : 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedData.categories.map((cat) => (
                          <span key={cat} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: (CATEGORY_COLORS[cat] ?? "#94a3b8") + "18", color: CATEGORY_COLORS[cat] ?? "#64748b" }}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
