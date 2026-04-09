import { StructuralBreakdown } from "@/lib/extractBreakdown";

interface Props {
  breakdown: StructuralBreakdown | null;
}

const labels: { key: keyof StructuralBreakdown; label: string; color: string }[] = [
  { key: "actors", label: "Applies to", color: "bg-primary/15 text-primary" },
  { key: "required", label: "Required (must/shall)", color: "bg-success/15 text-success" },
  { key: "allowed", label: "Allowed (may)", color: "bg-info/15 text-info" },
  { key: "prohibited", label: "Prohibited", color: "bg-destructive/15 text-destructive" },
  { key: "timing", label: "Timing / Deadlines", color: "bg-warning/15 text-warning" },
];

const BreakdownPanel = ({ breakdown }: Props) => {
  if (!breakdown) {
    return <p className="text-muted-foreground text-sm italic">Select a node to see its structural breakdown.</p>;
  }

  return (
    <div className="space-y-2.5">
      {labels.map(({ key, label, color }) => (
        <div key={key}>
          <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${color} mb-1`}>{label}</span>
          <p className="text-sm text-foreground pl-1 leading-relaxed">
            {breakdown[key] ?? <span className="text-muted-foreground italic">Not specified</span>}
          </p>
        </div>
      ))}
    </div>
  );
};

export default BreakdownPanel;
