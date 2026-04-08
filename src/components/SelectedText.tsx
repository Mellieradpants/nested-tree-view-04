import { LegislativeNode } from "@/data/legislativeData";

interface Props {
  node: LegislativeNode | null;
}

const SelectedText = ({ node }: Props) => {
  if (!node) {
    return <p className="text-muted-foreground text-sm italic">Select a node from the structure tree to view its text.</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{node.type}</span>
        <h2 className="text-base font-semibold text-foreground mt-1">{node.label}</h2>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{node.text}</p>
    </div>
  );
};

export default SelectedText;
