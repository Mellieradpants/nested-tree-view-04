import { StructuralBreakdown } from "@/lib/extractBreakdown";

interface Props {
  breakdown: StructuralBreakdown | null;
}

const labels: { key: keyof StructuralBreakdown; label: string; color: string }[] = [
  { key: "actors", label: "Applies to", color: "bg-primary/10 text-primary" },
  { key: "required", label: "Required actions (must/shall)", color: "bg-emerald-500/10 text-emerald-700" },
  { key: "allowed", label: "Allowed actions (may)", color: "bg-blue-500/10 text-blue-700" },
  { key: "prohibited", label: "Prohibited actions", color: "bg-destructive/10 text-destructive" },
  { key: "timing", label: "Timing / Deadlines", color: "bg-amber-500/10 text-amber-700" },
];

const BreakdownPanel = ({ breakdown }: Props) => {
  if (!breakdown) {
    return <p className="text-muted-foreground text-sm italic">Select a node to see its structural breakdown.</p>;
  }

  return (
    <div className="space-y-3">
      {labels.map(({ key, label, color }) => (
        <div key={key}>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${color} mb-1`}>{label}</span>
          <p className="text-sm text-foreground pl-1">
            {breakdown[key] ?? <span className="text-muted-foreground italic">Not specified</span>}
          </p>
        </div>
      ))}
    </div>
  );
};

export default BreakdownPanel;
