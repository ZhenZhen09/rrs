import {
  Bike,
  CircleCheck,
  Clock3,
  List,
  TriangleAlert,
} from "lucide-react";
import { cn } from "../../components/ui/utils";

export type DispatchStatusTab = "all" | "pending" | "active" | "overdue" | "completed";

type DispatchStatusCounts = Record<DispatchStatusTab, number>;

const statusTabs = [
  { key: "all", label: "All", icon: List },
  { key: "pending", label: "Pending", icon: Clock3 },
  { key: "active", label: "Active", icon: Bike },
  { key: "overdue", label: "Overdue", icon: TriangleAlert },
  { key: "completed", label: "Done", icon: CircleCheck },
] as const;

export function DispatchStatusTabs({
  selected,
  counts,
  onChange,
}: {
  selected: DispatchStatusTab;
  counts: DispatchStatusCounts;
  onChange: (tab: DispatchStatusTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Dispatch request status"
      className="flex items-center gap-1 rounded-xl bg-slate-100/70 p-1"
    >
      {statusTabs.map((tab) => {
        const count = counts[tab.key];
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-label={`${tab.label}, ${count} ${count === 1 ? "request" : "requests"}`}
            title={`${tab.label}: ${count}`}
            aria-selected={selected === tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "min-h-12 flex-1 rounded-lg px-1 py-1 text-[8px] font-black uppercase tracking-wide transition-all",
              selected === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <span className="flex items-center justify-center gap-1">
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[10px] tabular-nums">{count}</span>
            </span>
            <span className="mt-0.5 block text-[8px] leading-tight">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
