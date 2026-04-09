import { StructuralBreakdown } from "@/lib/extractBreakdown";

interface Props {
  breakdown: StructuralBreakdown | null;
}

const labels: { key: keyof StructuralBreakdown; label: string; color: string }[] = [
  { key: "actors", label: "Detected Actors", color: "bg-primary/10 text-primary" },
  { key: "required", label: "Detected Obligation Language", color: "bg-success/10 text-success" },
  { key: "allowed", label: "Detected Permission Language", color: "bg-info/10 text-info" },
  { key: "prohibited", label: "Detected Prohibition Language", color: "bg-destructive/10 text-destructive" },
  { key: "timing", label: "Timing Signals", color: "bg-warning/10 text-warning" },
];

const BreakdownPanel = ({ breakdown }: Props) => {
  if (!breakdown) {
    return <p className="text-muted-foreground text-xs">No selection</p>;
  }

  return (
    <div className="space-y-3">
      {labels.map(({ key, label, color }) => (
        <div key={key}>
          <span className={`inline-block text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${color} mb-1`}>{label}</span>
          <p className="text-sm text-foreground pl-1 leading-relaxed">
            {breakdown[key] ?? <span className="text-muted-foreground italic text-xs">Not detected</span>}
          </p>
        </div>
      ))}
    </div>
  );
};

export default BreakdownPanel;
