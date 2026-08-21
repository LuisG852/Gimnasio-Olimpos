import React from "react";
export default function StatCard({ icon: Icon, label, value, toneClass }) {
  return (
    <div className="rounded-xl p-5 flex-1 min-w-[180px] bg-panel border border-line">
      <div className="flex items-center gap-2 mb-3 text-inksoft">
        <Icon size={16} />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className={`font-display text-4xl ${toneClass || "text-ink"}`}>{value}</div>
    </div>
  );
}
