"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSidebar } from "@/lib/SidebarContext";
import { fetchComplaints, fetchReadinessIndex, ComplaintResponse, ReadinessState } from "@/lib/api";
import "leaflet/dist/leaflet.css";
import { 
  Globe, 
  CaretRight, 
  Clock, 
  ClipboardText, 
  WarningCircle, 
  MagnifyingGlass,
  ArrowRight,
  ChartLineUp,
  MapTrifold,
  Info
} from "@phosphor-icons/react";

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
  pending: number;
  categories: string[];
  severity: "critical" | "warning" | "normal";
  complaints: ComplaintResponse[];
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

/* ─── Category colors for markers ─── */
const MARKER_CATEGORY_COLORS: Record<string, string> = {
  'Roads': '#E24B4A',
  'Water Supply': '#378ADD',
  'Electricity': '#EF9F27',
  'Sanitation': '#1D9E75',
  'Public Safety': '#7F77DD',
  'Healthcare': '#D4537E',
  'Education': '#639922',
  'Other': '#888780',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#EF9F27',
  in_progress: '#378ADD',
  resolved: '#1D9E75',
  escalated: '#E24B4A',
};

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
    const pending = items.filter((i) => i.status === "pending").length;
    const escalated = items.filter((i) => i.escalated || i.status === "escalated").length;
    const active = total - resolved;
    const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

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
      pending,
      categories,
      severity,
      complaints: items,
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
  const [filterState, setFilterState] = useState("All");
  const [notifOpen, setNotifOpen] = useState(false);

  /* ONOE overlay state */
  const [onoeOverlay, setOnoeOverlay] = useState(false);
  const [readinessData, setReadinessData] = useState<ReadinessState[]>([]);
  const [showMarkers, setShowMarkers] = useState(true);

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
  const geoLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  /* Fetch complaints */
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

  /* Fetch readiness data when overlay toggled on */
  useEffect(() => {
    if (!onoeOverlay || readinessData.length > 0) return;
    fetchReadinessIndex(2029).then(data => {
      setReadinessData(data.readiness_index || []);
    }).catch(err => console.error("Readiness fetch error:", err));
  }, [onoeOverlay, readinessData.length]);

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
  const totalPending = filteredMarkers.reduce((a, d) => a + d.pending, 0);
  const highRiskStates = readinessData.filter(r => r.score < 50).length;
  const stateIssues = selectedState ? filteredMarkers.filter((d) => d.state === selectedState) : [];
  const selectedData = selectedDistrict ? filteredMarkers.find((m) => m.district === selectedDistrict) ?? null : null;

  /* ═══ Initialise Leaflet map (once, client-side) ═══ */
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      leafletRef.current = L;

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
        maxZoom: 12,
      });

      map.fitBounds(indiaBounds, { padding: [20, 20] });

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
          const worldOuter: [number, number][] = [
            [-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]
          ];
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
          const maskCoords = [worldOuter, ...indiaHoles];
          L.polygon(maskCoords, {
            fillColor: "#f8f4ec",
            fillOpacity: 0.97,
            stroke: true,
            color: "#2563EB",
            weight: 2,
            opacity: 0.3,
            interactive: false,
          }).addTo(map);

          L.geoJSON(indiaGeo, {
            style: {
              color: "#2563EB",
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

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      map.on("click", () => {
        setTimeout(() => {
          setSelectedState(null);
          setSelectedDistrict(null);
        }, 100);
      });

      setTimeout(() => map.invalidateSize(), 300);
      setMapReady(true);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        geoLayerRef.current = null;
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

  /* ═══ Re-render complaint markers ═══ */
  useEffect(() => {
    const L = leafletRef.current;
    const markersLayer = markersLayerRef.current;
    if (!L || !markersLayer || !mapReady) return;

    markersLayer.clearLayers();

    if (!showMarkers) return;

    /* Instead of district-level grouped markers, show individual complaint pins */
    const visibleMarkers = selectedState
      ? filteredMarkers.filter((d) => d.state === selectedState)
      : filteredMarkers;

    visibleMarkers.forEach((d) => {
      /* Show each complaint as an individual marker with slight offset */
      d.complaints.forEach((c, idx) => {
        const category = c.category || 'Other';
        const status = c.status || 'pending';
        const color = MARKER_CATEGORY_COLORS[category] || '#888780';
        const statusColor = STATUS_COLORS[status] || '#888780';

        /* Slight offset per complaint so they don't stack exactly */
        const offsetLat = d.lat + (idx % 5) * 0.003 - 0.006;
        const offsetLng = d.lng + (Math.floor(idx / 5) % 3) * 0.004 - 0.004;

        const isEscalated = status === 'escalated';
        const isResolved = status === 'resolved';
        const isPending = status === 'pending';
        const size = isEscalated ? 14 : isResolved ? 8 : 10;
        const outerSize = size + 8;
        const opacity = isResolved ? 0.4 : 1;
        const pulseSpeed = isEscalated ? '1.2s' : '2s';

        const shouldPulse = isPending || isEscalated;

        const pulseHtml = shouldPulse ? `
          <div style="
            position:absolute;
            top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:${outerSize}px;height:${outerSize}px;
            border-radius:50%;
            background:${color};
            opacity:0.3;
            animation:markerPulse ${pulseSpeed} infinite;
          "></div>` : '';

        const icon = L.divIcon({
          html: `
            <div style="position:relative;width:${outerSize}px;height:${outerSize}px;opacity:${opacity}">
              ${pulseHtml}
              <div style="
                position:absolute;
                top:50%;left:50%;
                transform:translate(-50%,-50%);
                width:${size}px;height:${size}px;
                border-radius:50%;
                background:${color};
                border:2px solid white;
                box-shadow:0 1px 4px rgba(0,0,0,0.3);
              "></div>
            </div>`,
          className: '',
          iconSize: [outerSize, outerSize],
          iconAnchor: [outerSize / 2, outerSize / 2],
        });

        const truncatedText = c.text.length > 80 ? c.text.slice(0, 80) + '…' : c.text;
        const dateStr = (() => {
          try {
            return new Date(c.date_submitted).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          } catch { return 'N/A'; }
        })();

        const marker = L.marker([offsetLat, offsetLng], { icon });
        marker.bindPopup(`
          <div style="min-width:200px;padding:4px;font-family:Inter,system-ui,sans-serif">
            <div style="font-weight:600;font-size:14px;margin-bottom:4px;color:#1e293b">${category}</div>
            <div style="font-size:12px;color:#666;margin-bottom:6px">${c.district}</div>
            <div style="font-size:12px;margin-bottom:8px;color:#475569;line-height:1.4">${truncatedText}</div>
            <div style="display:flex;gap:6px;align-items:center">
              <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${statusColor};color:white;text-transform:capitalize">${status.replace('_', ' ')}</span>
              <span style="font-size:11px;color:#888">${dateStr}</span>
            </div>
          </div>
        `, { className: 'leaflet-premium-popup' });

        marker.on("click", () => {
          setSelectedState(d.state);
          setSelectedDistrict(d.district);
        });

        markersLayer.addLayer(marker);
      });
    });
  }, [filteredMarkers, selectedState, mapReady, showMarkers]);

  /* ═══ ONOE GeoJSON Overlay ═══ */
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map || !mapReady) return;

    /* Remove old GeoJSON layer */
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

    if (!onoeOverlay || readinessData.length === 0) return;

    /* Build readiness lookup — case-insensitive */
    const readinessMap = new Map<string, ReadinessState>();
    readinessData.forEach(r => {
      readinessMap.set(r.state.toLowerCase(), r);
    });

    const getReadinessColor = (score: number) => {
      if (score >= 70) return '#1D9E75';
      if (score >= 50) return '#EF9F27';
      return '#E24B4A';
    };

    const getGrade = (score: number) => {
      if (score >= 90) return 'A+';
      if (score >= 80) return 'A';
      if (score >= 70) return 'B+';
      if (score >= 60) return 'B';
      if (score >= 50) return 'C';
      if (score >= 40) return 'D';
      return 'F';
    };

    /* Try loading India state GeoJSON */
    const loadGeoJSON = async () => {
      let geoData = null;
      const urls = [
        'https://cdn.jsdelivr.net/npm/india-geojson@1.0.0/state.json',
        'https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson',
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            geoData = await res.json();
            break;
          }
        } catch { continue; }
      }

      if (!geoData) {
        console.warn("Could not load India state GeoJSON for ONOE overlay");
        return;
      }

      /* Count complaints per state */
      const complaintsByState = new Map<string, { total: number; pending: number }>();
      complaints.forEach(c => {
        const d = (c.district || '').toLowerCase().trim();
        const stName = DISTRICT_COORDS[d]?.state || '';
        if (stName) {
          const existing = complaintsByState.get(stName.toLowerCase()) || { total: 0, pending: 0 };
          existing.total++;
          if (c.status === 'pending') existing.pending++;
          complaintsByState.set(stName.toLowerCase(), existing);
        }
      });

      const geoLayer = L.geoJSON(geoData, {
        style: (feature: { properties?: { NAME_1?: string; name?: string; ST_NM?: string } }) => {
          const name = (feature?.properties?.NAME_1 || feature?.properties?.name || feature?.properties?.ST_NM || '').toLowerCase();
          const rState = readinessMap.get(name);
          const color = rState ? getReadinessColor(rState.score) : '#B4B2A9';
          return {
            fillColor: color,
            fillOpacity: 0.35,
            weight: 1,
            color: 'white',
            opacity: 0.8,
          };
        },
        onEachFeature: (feature: { properties?: { NAME_1?: string; name?: string; ST_NM?: string } }, layer: { on: (event: string, handler: () => void) => void; setStyle: (style: object) => void; bindPopup: (content: string, options?: object) => void }) => {
          const name = (feature?.properties?.NAME_1 || feature?.properties?.name || feature?.properties?.ST_NM || '');
          const nameLower = name.toLowerCase();
          const rState = readinessMap.get(nameLower);
          const cData = complaintsByState.get(nameLower);
          const color = rState ? getReadinessColor(rState.score) : '#B4B2A9';
          const grade = rState ? getGrade(rState.score) : '—';
          const riskBadgeColor = rState ? (rState.score >= 70 ? '#1D9E75' : rState.score >= 50 ? '#EF9F27' : '#E24B4A') : '#B4B2A9';
          const riskLabel = rState ? (rState.score >= 70 ? 'Low Risk' : rState.score >= 50 ? 'Moderate Risk' : 'High Risk') : 'No Data';

          layer.on('mouseover', () => {
            layer.setStyle({ fillOpacity: 0.6, weight: 2 });
          });
          layer.on('mouseout', () => {
            layer.setStyle({ fillOpacity: 0.35, weight: 1 });
          });

          const popupContent = `
            <div style="min-width:220px;padding:4px;font-family:Inter,system-ui,sans-serif">
              <div style="font-weight:700;font-size:15px;color:#1e293b;margin-bottom:6px">${name}</div>
              ${rState ? `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                  <span style="font-size:22px;font-weight:800;color:${color}">${rState.score}</span>
                  <span style="font-size:14px;color:#64748b;font-weight:600">— ${grade}</span>
                  <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${riskBadgeColor};color:white;font-weight:600">${riskLabel}</span>
                </div>
                <div style="font-size:11px;color:#475569;margin-bottom:3px">
                  📅 ${rState.years_until_election}y to election • ${rState.status}
                </div>
                <div style="font-size:11px;color:#475569;margin-bottom:3px">
                  🗳 ${rState.constituencies} constituencies • ${rState.booths.toLocaleString()} booths
                </div>
                ${cData ? `<div style="font-size:11px;color:#475569;margin-bottom:3px">
                  📋 ${cData.total} complaints (${cData.pending} pending)
                </div>` : ''}
                <div style="font-size:10px;color:#94a3b8;margin-bottom:6px">
                  ⚠ Key risk: ${rState.key_risk}
                </div>
                <a href="/simulator" style="display:inline-block;font-size:11px;padding:4px 12px;border-radius:8px;background:#6366f1;color:white;text-decoration:none;font-weight:600">View full analysis →</a>
              ` : `<div style="font-size:12px;color:#94a3b8">No readiness data available</div>`}
            </div>
          `;

          layer.bindPopup(popupContent, { className: 'leaflet-premium-popup', maxWidth: 280 });
        },
      });

      geoLayer.addTo(map);
      geoLayerRef.current = geoLayer;
    };

    loadGeoJSON();
  }, [onoeOverlay, readinessData, mapReady, complaints]);

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

  const categoryLegend = Object.entries(MARKER_CATEGORY_COLORS);

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
        @keyframes markerPulse {
          0% { transform: translate(-50%,-50%) scale(1); opacity: 0.3; }
          70% { transform: translate(-50%,-50%) scale(1.8); opacity: 0; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
        }
        @keyframes markerFadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ TOP BAR ═══ */}
      <div className="h-[56px] bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between px-6 shrink-0 backdrop-blur-sm">
        {/* Left: Title + Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Globe size={18} weight="duotone" className="text-white" />
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

          {/* Breadcrumb */}
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
                <CaretRight size={10} weight="bold" className="text-[var(--text-muted)]" />
                <span className="text-[11px] font-semibold text-[var(--text)] bg-[var(--accent-light)] px-2.5 py-0.5 rounded-full">
                  {selectedState}
                </span>
                {selectedDistrict && (
                  <>
                    <CaretRight size={10} weight="bold" className="text-[var(--text-muted)]" />
                    <span className="text-[11px] font-semibold text-[var(--accent)]">
                      {selectedDistrict}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Stat pills */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--bg)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
            <ClipboardText size={12} weight="duotone" className="inline mr-1" /> {totalComplaints} complaints
          </span>
          <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/8 px-2.5 py-1 rounded-lg border border-amber-500/15">
            <Hourglass size={12} weight="duotone" className="inline mr-1" /> {totalPending} pending
          </span>
          {onoeOverlay && highRiskStates > 0 && (
            <span className="text-[10px] font-semibold text-red-500 bg-red-500/8 px-2.5 py-1 rounded-lg border border-red-500/15">
              <WarningCircle size={12} weight="duotone" className="inline mr-1" /> {highRiskStates} high risk states
            </span>
          )}
        </div>
      </div>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 flex min-h-0 relative">

        {/* ─── LEAFLET MAP ─── */}
        <div className="flex-1 relative overflow-hidden rounded-xl border border-[var(--border)] shadow-[0_10px_30px_rgba(0,0,0,0.04)] m-1.5 transition-all duration-300 ease-in-out">
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ minHeight: "calc(100vh - 260px)" }}
          />

          {/* ── ONOE Toggle Button ── */}
          <button
            onClick={() => setOnoeOverlay(!onoeOverlay)}
            className={`absolute top-3 right-3 z-[500] px-3 py-2 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 ${
              onoeOverlay
                ? 'bg-indigo-600 text-white shadow-indigo-500/30 hover:bg-indigo-500'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <MapTrifold size={16} weight={onoeOverlay ? "fill" : "duotone"} />
            ONOE Overlay {onoeOverlay ? 'ON' : 'OFF'}
          </button>

          {/* ── Layer Controls ── */}
          <div className="absolute top-14 right-3 z-[500] bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-lg p-3 space-y-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Layers</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-indigo-500"
              />
              <span className="text-[11px] font-medium text-slate-600">Complaint markers</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onoeOverlay}
                onChange={(e) => setOnoeOverlay(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-indigo-500"
              />
              <span className="text-[11px] font-medium text-slate-600">ONOE readiness</span>
            </label>
          </div>

          {/* ── Category Legend (bottom-left) ── */}
          <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-lg p-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Categories</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {categoryLegend.map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/50" style={{ background: color }} />
                  <span className="text-[10px] text-slate-500 font-medium">{cat}</span>
                </div>
              ))}
            </div>
            {onoeOverlay && (
              <>
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">ONOE Readiness</p>
                  <div className="space-y-1">
                    {[
                      { label: 'Ready (70+)', color: '#1D9E75' },
                      { label: 'Moderate (50-69)', color: '#EF9F27' },
                      { label: 'At Risk (<50)', color: '#E24B4A' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5">
                        <span className="w-4 h-2 rounded-sm" style={{ background: l.color, opacity: 0.5 }} />
                        <span className="text-[10px] text-slate-500 font-medium">{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Hint at bottom */}
          {!selectedState && !loading && (
            <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-[#8ea4b8] z-[400] pointer-events-none">
              Click a marker or select a state from the panel to zoom in • <strong>{markers.length}</strong> districts with complaints
            </p>
          )}
        </div>

        {/* ═══ FLOATING PANEL ═══ */}
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

          {/* Quick access */}
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
              <span className="text-[10px] text-[var(--text-muted)]">Pending</span>
              <span className="text-xs font-semibold text-amber-500">{totalPending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[var(--text-muted)]">Districts</span>
              <span className="text-xs font-semibold text-[#6495ED]">{filteredMarkers.length}</span>
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
                    { label: "Pending",  val: stateIssues.reduce((a, d) => a + d.pending, 0),  c: "#EF9F27" },
                    { label: "Resolved", val: stateIssues.reduce((a, d) => a + d.resolved, 0), c: "#1D9E75" },
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
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: MARKER_CATEGORY_COLORS[d.categories[0]] || '#888780' }} />
                      <span className="text-[var(--text)] flex-1">{d.district}</span>
                      <span className="text-[10px] text-gray-400">{d.total}</span>
                    </button>
                  ))}
                </div>

                {/* District detail */}
                <div className={`overflow-hidden transition-all duration-700 ${selectedData ? "max-h-60 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}>
                  {selectedData && (
                    <div className="pt-2 border-t border-black/5">
                      <h4 className="text-xs font-bold text-[var(--text)] m-0 mb-2">{selectedData.district}</h4>
                      <div className="space-y-1.5 mb-2">
                        {[
                          { label: "Active", val: selectedData.active, max: selectedData.total, c: "#3b82f6" },
                          { label: "Resolved", val: selectedData.resolved, max: selectedData.total, c: "#1D9E75" },
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
                            style={{ background: (MARKER_CATEGORY_COLORS[cat] ?? "#94a3b8") + "18", color: MARKER_CATEGORY_COLORS[cat] ?? "#64748b" }}>
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
