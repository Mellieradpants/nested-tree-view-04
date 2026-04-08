import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface Item {
  id: string;
  parentId: string | null;
  text: string;
  type: string;
}

interface TreeNodeProps {
  item: Item;
  children: Item[];
  allItems: Item[];
  depth: number;
}

const TreeNode = ({ item, children, allItems, depth }: TreeNodeProps) => {
  const [open, setOpen] = useState(true);
  const hasChildren = children.length > 0;

  return (
    <div style={{ paddingLeft: depth * 24 }}>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className="flex items-center gap-1.5 py-1.5 px-2 w-full text-left rounded-md hover:bg-accent transition-colors"
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className={item.type === "section" ? "font-semibold text-foreground" : "text-foreground"}>
          {item.text}
        </span>
      </button>
      {open && children.map((child) => {
        const grandchildren = allItems.filter((i) => i.parentId === child.id);
        return <TreeNode key={child.id} item={child} children={grandchildren} allItems={allItems} depth={depth + 1} />;
      })}
    </div>
  );
};

export default TreeNode;
