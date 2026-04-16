import { Globe, MapPin, ChartPie, SquaresFour } from "@phosphor-icons/react";

interface GeoFilterPanelProps {
  regionLevel: string;
  onRegionLevelChange: (val: string) => void;
  targetState: string;
  onTargetStateChange: (val: string) => void;
  stateList: string[];
  complaintCount: number;
  districtCount: number;
}

export default function GeoFilterPanel({
  regionLevel,
  onRegionLevelChange,
  targetState,
  onTargetStateChange,
  stateList,
  complaintCount,
  districtCount,
}: GeoFilterPanelProps) {
  return (
    <div
      className="absolute top-5 left-5 z-40 w-64 bg-white/70 backdrop-blur-xl border border-[#e2e8f0] rounded-2xl shadow-lg transition-all duration-500 ease-in-out"
      style={{ padding: 16 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Globe size={18} weight="duotone" className="text-indigo-600" />
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
          Geo-Intelligence
        </p>
      </div>

      {/* Region Level */}
      <div className="mb-3">
        <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-1">
          <SquaresFour size={12} weight="bold" /> Region Level
        </label>
        <select
          value={regionLevel}
          onChange={(e) => onRegionLevelChange(e.target.value)}
          className="w-full p-2 rounded-lg bg-gray-50 border border-[#e2e8f0] text-xs text-gray-700 outline-none focus:border-indigo-300 transition-colors cursor-pointer"
        >
          <option value="state">State / UT</option>
          <option value="district">District</option>
        </select>
      </div>

      {/* Target State */}
      <div className="mb-3">
        <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-1">
          <MapPin size={12} weight="bold" /> Target State
        </label>
        <select
          value={targetState}
          onChange={(e) => onTargetStateChange(e.target.value)}
          className="w-full p-2 rounded-lg bg-gray-50 border border-[#e2e8f0] text-xs text-gray-700 outline-none focus:border-indigo-300 transition-colors cursor-pointer"
        >
          <option value="All">National (All States)</option>
          {stateList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Live stats */}
      <div className="border-t border-[#e2e8f0] pt-3 mt-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
            <ChartPie size={12} weight="bold" /> Complaints
          </span>
          <span className="text-xs font-bold text-indigo-600">{complaintCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-400">Districts</span>
          <span className="text-xs font-bold text-blue-600">{districtCount}</span>
        </div>
      </div>
    </div>
  );
}
