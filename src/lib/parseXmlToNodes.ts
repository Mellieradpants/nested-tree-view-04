import { LegislativeNode } from "@/data/legislativeData";

/**
 * Heuristic type mapping: maps common legislative XML tag names
 * to our internal node types based on hierarchy depth and tag semantics.
 */
const TAG_TYPE_MAP: Record<string, LegislativeNode["type"]> = {
  act: "part",
  bill: "part",
  statute: "part",
  regulation: "part",
  part: "part",
  chapter: "part",
  title: "part",
  division: "part",
  book: "part",
  section: "section",
  article: "section",
  rule: "section",
  subsection: "subsection",
  subdivision: "subsection",
  paragraph: "subsection",
  subparagraph: "clause",
  clause: "clause",
  subclause: "clause",
  item: "clause",
  point: "clause",
};

const DEPTH_TYPE_FALLBACK: LegislativeNode["type"][] = [
  "part",
  "section",
  "subsection",
  "clause",
];

/** Tags to skip — they carry metadata, not content structure */
const SKIP_TAGS = new Set([
  "heading",
  "title",
  "num",
  "label",
  "meta",
  "header",
  "footer",
  "note",
  "footnote",
  "annotation",
  "comment",
  "#comment",
  "#text",
]);

function getHeadingText(el: Element): string | null {
  for (const tag of ["heading", "title", "head", "name", "num"]) {
    const child = el.querySelector(`:scope > ${tag}`);
    if (child?.textContent?.trim()) return child.textContent.trim();
  }
  return null;
}

function getDirectText(el: Element): string {
  let text = "";
  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent || "";
    }
  });
  return text.trim();
}

function getFullText(el: Element): string {
  // Collect text from non-structural children
  const parts: string[] = [];
  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent?.trim();
      if (t) parts.push(t);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName.toLowerCase();
      // Include inline/content elements, skip structural children
      if (SKIP_TAGS.has(tag) || hasStructuralChildren(child as Element)) return;
      if (!TAG_TYPE_MAP[tag] && !hasStructuralChildren(child as Element)) {
        const t = (child as Element).textContent?.trim();
        if (t) parts.push(t);
      }
    }
  });
  return parts.join(" ");
}

function hasStructuralChildren(el: Element): boolean {
  for (let i = 0; i < el.children.length; i++) {
    const tag = el.children[i].tagName.toLowerCase();
    if (TAG_TYPE_MAP[tag] || !SKIP_TAGS.has(tag)) {
      // Check if it looks structural (has its own children beyond text)
      if (el.children[i].children.length > 0 || TAG_TYPE_MAP[tag]) return true;
    }
  }
  return false;
}

function resolveType(
  tagName: string,
  depth: number
): LegislativeNode["type"] {
  return (
    TAG_TYPE_MAP[tagName] ??
    DEPTH_TYPE_FALLBACK[Math.min(depth, DEPTH_TYPE_FALLBACK.length - 1)]
  );
}

let counter = 0;

function walkElement(
  el: Element,
  parentId: string | null,
  depth: number,
  nodes: LegislativeNode[]
): void {
  const tag = el.tagName.toLowerCase();

  // Skip non-structural tags
  if (SKIP_TAGS.has(tag)) return;

  const id = el.getAttribute("id") || `node-${++counter}`;
  const heading = getHeadingText(el);
  const directText = getDirectText(el);
  const nodeType = resolveType(tag, depth);

  // Determine if this element has structural children worth recursing into
  const structuralChildren: Element[] = [];
  const contentOnlyChildren: Element[] = [];

  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    const childTag = child.tagName.toLowerCase();
    if (SKIP_TAGS.has(childTag)) continue;
    if (TAG_TYPE_MAP[childTag] || child.children.length > 0) {
      structuralChildren.push(child);
    } else {
      contentOnlyChildren.push(child);
    }
  }

  // Build text content for this node
  let text = "";
  if (structuralChildren.length === 0) {
    // Leaf node — get all text content
    text = el.textContent?.trim() || "";
    // Remove heading from text if present
    if (heading && text.startsWith(heading)) {
      text = text.slice(heading.length).trim();
    }
  } else {
    // Branch node — get direct text + content-only children
    const parts: string[] = [];
    if (directText) parts.push(directText);
    contentOnlyChildren.forEach((c) => {
      const t = c.textContent?.trim();
      if (t) parts.push(t);
    });
    text = parts.join(" ");
  }

  // Build label
  const label = heading || directText.slice(0, 80) || tag;

  nodes.push({
    id,
    parentId,
    label,
    text: text || label,
    type: nodeType,
  });

  // Recurse into structural children
  for (const child of structuralChildren) {
    walkElement(child, id, depth + 1, nodes);
  }
}

/**
 * Parse an XML string into a flat array of LegislativeNode.
 * Uses DOMParser and heuristic tag mapping.
 */
export function parseXmlToNodes(xml: string): LegislativeNode[] {
  counter = 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  // Check for parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    // Try as HTML if XML fails
    const htmlDoc = parser.parseFromString(xml, "text/html");
    const body = htmlDoc.body;
    if (!body || !body.children.length) {
      throw new Error("Failed to parse XML: " + (parseError.textContent?.slice(0, 100) || "Unknown error"));
    }
    const nodes: LegislativeNode[] = [];
    for (let i = 0; i < body.children.length; i++) {
      walkElement(body.children[i], null, 0, nodes);
    }
    return nodes;
  }

  const root = doc.documentElement;
  const nodes: LegislativeNode[] = [];

  // If root is a single container (act, bill, etc.), process its children as top-level
  const rootTag = root.tagName.toLowerCase();
  if (TAG_TYPE_MAP[rootTag] === "part" || ["act", "bill", "statute", "regulation", "law", "legislation", "document", "body"].includes(rootTag)) {
    // Check if root has structural children
    let hasStructural = false;
    for (let i = 0; i < root.children.length; i++) {
      const childTag = root.children[i].tagName.toLowerCase();
      if (!SKIP_TAGS.has(childTag)) {
        hasStructural = true;
        break;
      }
    }

    if (hasStructural) {
      for (let i = 0; i < root.children.length; i++) {
        walkElement(root.children[i], null, 0, nodes);
      }
    } else {
      // Root has no structural children, treat it as a single node
      walkElement(root, null, 0, nodes);
    }
  } else {
    walkElement(root, null, 0, nodes);
  }

  return nodes;
}
