/**
 * XML Compatibility Preprocessing Layer
 *
 * Detects known alternate XML schemas and deterministically normalizes
 * their tags into the internal structure the existing parser expects.
 * No AI, no fuzzy inference, no guessing.
 */

export interface TagMapping {
  root: string;
  part: string;
  section: string;
  subsection: string;
  clause: string;
  title: string;
  text: string;
  id: string;
}

/** Internal canonical tags the parser expects */
const CANONICAL: TagMapping = {
  root: "act",
  part: "part",
  section: "section",
  subsection: "subsection",
  clause: "clause",
  title: "heading",
  text: "content",
  id: "id",
};

/** Known alias sets for each internal role */
const ROLE_ALIASES: Record<keyof TagMapping, string[]> = {
  root: ["act", "bill", "measure"],
  part: ["part", "chapter", "division"],
  section: ["section", "sec"],
  subsection: ["subsection", "subsec"],
  clause: ["clause", "paragraph", "item"],
  title: ["heading", "title", "head"],
  text: ["content", "text", "body"],
  id: ["id"],
};

export interface SchemaDetectionResult {
  schemaDetected: string | null;
  mappingUsed: Partial<TagMapping> | null;
  fallbackUsed: boolean;
  unsupportedSchemaReason: string | null;
}

interface DetectedSchema {
  name: string;
  mapping: Record<string, string>; // source tag -> canonical tag
}

/**
 * Detect which known schema pattern the XML uses by checking
 * the root element and structural tags present.
 */
function detectSchema(doc: Document): DetectedSchema | null {
  const root = doc.documentElement;
  const rootTag = root.tagName.toLowerCase();

  // Check if root matches any known root alias
  const isKnownRoot = ROLE_ALIASES.root.includes(rootTag);
  if (!isKnownRoot) {
    return null;
  }

  // If root is already canonical ("act"), check if children are also canonical
  if (rootTag === CANONICAL.root) {
    return null; // No mapping needed — native schema
  }

  // Build a tag mapping by scanning which aliases appear in the document
  const mapping: Record<string, string> = {};

  // Map the root
  mapping[rootTag] = CANONICAL.root;

  // For each role, find which alias appears in the document
  const rolesToScan: (keyof TagMapping)[] = [
    "part", "section", "subsection", "clause", "title",
  ];

  for (const role of rolesToScan) {
    for (const alias of ROLE_ALIASES[role]) {
      if (alias === CANONICAL[role]) continue; // skip canonical
      const found = doc.getElementsByTagName(alias);
      if (found.length > 0) {
        mapping[alias] = CANONICAL[role];
      }
    }
  }

  // Require at least one recognized structural role beyond the root
  const nonRootMappings = Object.keys(mapping).filter(k => k !== rootTag);
  if (nonRootMappings.length === 0) {
    return null; // Will be caught as weak schema below
  }

  return {
    name: `${rootTag}-based`,
    mapping,
  };
}

/**
 * Deterministically replace source tags with canonical tags in the XML string.
 * Only replaces tags that are in the mapping.
 */
function normalizeXml(xml: string, mapping: Record<string, string>): string {
  let result = xml;

  for (const [source, target] of Object.entries(mapping)) {
    if (source === target) continue;

    // Replace opening tags: <source ...> and <source>
    result = result.replace(
      new RegExp(`<${source}(\\s|>|/>)`, "gi"),
      (match, suffix) => `<${target}${suffix}`
    );

    // Replace closing tags: </source>
    result = result.replace(
      new RegExp(`</${source}>`, "gi"),
      `</${target}>`
    );
  }

  return result;
}

/**
 * Check if the XML root element is completely unknown (not a known alias for any role).
 */
function isUnsupportedSchema(doc: Document): string | null {
  const root = doc.documentElement;
  const rootTag = root.tagName.toLowerCase();

  // Check for parse errors
  if (rootTag === "parsererror" || root.querySelector("parsererror")) {
    return "XML is malformed and could not be parsed";
  }

  // Check if root is known
  const allKnownTags = new Set(
    Object.values(ROLE_ALIASES).flat()
  );

  // Also allow generic container roots the parser already handles
  const genericRoots = new Set([
    "act", "bill", "statute", "regulation", "law", "legislation", "document", "body",
  ]);

  if (genericRoots.has(rootTag) || allKnownTags.has(rootTag)) {
    return null; // Known
  }

  // Check if any children use known structural tags
  const childTags = new Set<string>();
  for (let i = 0; i < root.children.length; i++) {
    childTags.add(root.children[i].tagName.toLowerCase());
  }

  const knownStructural = new Set([
    ...ROLE_ALIASES.part,
    ...ROLE_ALIASES.section,
    ...ROLE_ALIASES.subsection,
    ...ROLE_ALIASES.clause,
  ]);

  const hasKnownChildren = [...childTags].some(t => knownStructural.has(t));
  if (!hasKnownChildren) {
    return `Unsupported root element <${rootTag}> with no recognized structural children. Known root elements: ${ROLE_ALIASES.root.join(", ")}`;
  }

  return null;
}

export interface PreprocessResult {
  xml: string;
  detection: SchemaDetectionResult;
}

/**
 * Preprocess XML through the compatibility layer.
 * Returns normalized XML and detection metadata.
 */
export function preprocessXml(xml: string): PreprocessResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  // Check for XML parse errors first
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    // Let the existing parser handle parse errors (it has HTML fallback)
    return {
      xml,
      detection: {
        schemaDetected: null,
        mappingUsed: null,
        fallbackUsed: true,
        unsupportedSchemaReason: null,
      },
    };
  }

  // Check for unsupported schema
  const unsupportedReason = isUnsupportedSchema(doc);
  if (unsupportedReason) {
    return {
      xml,
      detection: {
        schemaDetected: null,
        mappingUsed: null,
        fallbackUsed: false,
        unsupportedSchemaReason: unsupportedReason,
      },
    };
  }

  // Detect schema
  const schema = detectSchema(doc);

  if (!schema) {
    // Native/canonical schema or already handled by existing parser
    return {
      xml,
      detection: {
        schemaDetected: "canonical",
        mappingUsed: null,
        fallbackUsed: true,
        unsupportedSchemaReason: null,
      },
    };
  }

  // Normalize
  const normalizedXml = normalizeXml(xml, schema.mapping);

  // Build the mapping used report
  const mappingUsed: Partial<TagMapping> = {};
  for (const [source, target] of Object.entries(schema.mapping)) {
    // Find which role this target corresponds to
    for (const [role, canonical] of Object.entries(CANONICAL)) {
      if (target === canonical && source !== canonical) {
        (mappingUsed as Record<string, string>)[role] = `${source} → ${canonical}`;
      }
    }
  }

  return {
    xml: normalizedXml,
    detection: {
      schemaDetected: schema.name,
      mappingUsed: Object.keys(mappingUsed).length > 0 ? mappingUsed : null,
      fallbackUsed: false,
      unsupportedSchemaReason: null,
    },
  };
}
