import { useState } from "react";
import { ChevronRight, ChevronDown, FileText } from "lucide-react";
import { LegislativeNode } from "@/data/legislativeData";

interface Props {
  nodes: LegislativeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface TreeItemProps {
  node: LegislativeNode;
  allNodes: LegislativeNode[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TreeItem = ({ node, allNodes, depth, selectedId, onSelect }: TreeItemProps) => {
  const [open, setOpen] = useState(true);
  const children = allNodes.filter((n) => n.parentId === node.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setOpen(!open);
        }}
        className={`flex items-center gap-2 py-2 px-2 w-full text-left text-sm rounded transition-colors ${
          isSelected
            ? "bg-primary/15 text-primary border-l-2 border-primary"
            : "hover:bg-muted text-foreground border-l-2 border-transparent"
        }`}
        style={{ paddingLeft: depth * 18 + 8 }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 opacity-40" />
        )}
        <span className={node.type === "part" ? "font-semibold" : "font-normal"}>{node.label}</span>
      </button>
      {open &&
        children.map((child) => (
          <TreeItem key={child.id} node={child} allNodes={allNodes} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
        ))}
    </div>
  );
};

const StructureTree = ({ nodes, selectedId, onSelect }: Props) => {
  const roots = nodes.filter((n) => n.parentId === null);
  return (
    <div className="space-y-0.5">
      {roots.map((root) => (
        <TreeItem key={root.id} node={root} allNodes={nodes} depth={0} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
};

export default StructureTree;
