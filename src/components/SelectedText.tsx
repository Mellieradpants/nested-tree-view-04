import { LegislativeNode } from "@/data/legislativeData";

interface Props {
  node: LegislativeNode | null;
  allNodes?: LegislativeNode[];
  xmlSource?: string | null;
}

/**
 * Determines if a container node's text is just an aggregation of its children's text.
 * Uses structural checks only — no fuzzy matching.
 */
function isContainerWithDuplicatedText(
  node: LegislativeNode,
  allNodes: LegislativeNode[]
): boolean {
  const children = allNodes.filter((n) => n.parentId === node.id);
  if (children.length === 0) return false;

  // Build combined child text (all children concatenated, whitespace-normalized)
  const childTextCombined = children
    .map((c) => c.text.trim())
    .join(" ")
    .replace(/\s+/g, " ");

  const nodeTextNormalized = node.text.trim().replace(/\s+/g, " ");

  // Case 1: node text exactly equals combined child text
  if (nodeTextNormalized === childTextCombined) return true;

  // Case 2: node text equals its own label (container echo)
  if (nodeTextNormalized === node.label.trim()) return true;

  // Case 3: every child's text appears as a substring of the node text,
  // and removing all child text leaves only whitespace/punctuation
  if (children.length > 1) {
    let remainder = nodeTextNormalized;
    for (const child of children) {
      const childNorm = child.text.trim().replace(/\s+/g, " ");
      if (childNorm && remainder.includes(childNorm)) {
        remainder = remainder.replace(childNorm, "");
      } else {
        return false;
      }
    }
    // If only whitespace/punctuation remains, it's duplicated
    if (remainder.replace(/[\s.,;:—–\-]/g, "").length === 0) return true;
  }

  return false;
}

function getUniqueDirectText(
  node: LegislativeNode,
  allNodes: LegislativeNode[]
): string | null {
  const children = allNodes.filter((n) => n.parentId === node.id);
  if (children.length === 0) return node.text;

  // Strip each child's text from the node text to find unique direct content
  let remaining = node.text.trim().replace(/\s+/g, " ");
  const nodeLabel = node.label.trim();

  // Remove the label if it appears as a prefix
  if (remaining.startsWith(nodeLabel)) {
    remaining = remaining.slice(nodeLabel.length).trim();
  }

  for (const child of children) {
    const childNorm = child.text.trim().replace(/\s+/g, " ");
    if (childNorm) {
      remaining = remaining.replace(childNorm, "").trim();
    }
  }

  // Clean up residual whitespace/punctuation
  const cleaned = remaining.replace(/[\s.,;:—–\-]/g, "");
  return cleaned.length > 0 ? remaining.trim() : null;
}

const SourceSnippet = ({ xml }: { xml?: string | null }) => {
  if (!xml) return null;
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Source Snippet</span>
      <pre className="mt-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap">{xml}</pre>
    </div>
  );
};

const SelectedText = ({ node, allNodes = [], xmlSource }: Props) => {
  if (!node) {
    return <p className="text-muted-foreground text-xs">No selection</p>;
  }

  const normalize = (s: string) => s.trim().replace(/\s+/g, " ").replace(/[\s.,;:—–\-]+$/, "");
  const children = allNodes.filter((n) => n.parentId === node.id);
  const isLeaf = children.length === 0;

  // Determine the single text block to display
  let displayText: string | null = null;

  if (isLeaf || allNodes.length === 0) {
    // Leaf: show node.text unless it's identical to the label
    displayText = normalize(node.text) === normalize(node.label) ? null : node.text;
  } else {
    // Container: use uniqueText (strips child content), or null if duplicated
    displayText = isContainerWithDuplicatedText(node, allNodes)
      ? null
      : getUniqueDirectText(node, allNodes);
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{node.type}</span>
        <h2 className="text-base font-semibold text-foreground mt-1">{node.label}</h2>
      </div>
      {displayText ? (
        <p className="text-sm leading-relaxed text-foreground">{displayText}</p>
      ) : (
        !isLeaf && (
          <p className="text-sm leading-relaxed text-muted-foreground italic">
            No direct text content. See child nodes.
          </p>
        )
      )}
      <SourceSnippet xml={xmlSource} />
    </div>
  );
};

export default SelectedText;
