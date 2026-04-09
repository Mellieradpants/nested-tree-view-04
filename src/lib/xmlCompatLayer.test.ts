import { describe, it, expect } from "vitest";
import { preprocessXml } from "./xmlCompatLayer";
import { parseXmlToNodes } from "./parseXmlToNodes";

const CANONICAL_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<act id="sample-act">
  <part id="part-1">
    <heading>General Provisions</heading>
    <section id="sec-1">
      <heading>Definitions</heading>
      <clause id="cl-1">For the purposes of this Act, "regulated entity" means any corporation.</clause>
    </section>
  </part>
</act>`;

const BILL_SCHEMA = `<?xml version="1.0" encoding="UTF-8"?>
<bill id="hr-1234">
  <division id="div-1">
    <heading>Title I</heading>
    <sec id="sec-101">
      <heading>Short Title</heading>
      <paragraph id="para-1">This Act may be cited as the "Example Act".</paragraph>
    </sec>
  </division>
</bill>`;

const UNSUPPORTED_SCHEMA = `<?xml version="1.0" encoding="UTF-8"?>
<recipe id="soup">
  <ingredient>Tomato</ingredient>
  <ingredient>Basil</ingredient>
  <step>Boil water</step>
</recipe>`;

describe("XML Compatibility Layer", () => {
  describe("canonical schema passthrough", () => {
    it("passes canonical XML unchanged", () => {
      const result = preprocessXml(CANONICAL_SAMPLE);
      expect(result.xml).toBe(CANONICAL_SAMPLE);
      expect(result.detection.schemaDetected).toBe("canonical");
      expect(result.detection.fallbackUsed).toBe(true);
      expect(result.detection.unsupportedSchemaReason).toBeNull();
    });

    it("parses identically with or without preprocessing", () => {
      const direct = parseXmlToNodes(CANONICAL_SAMPLE);
      const { xml } = preprocessXml(CANONICAL_SAMPLE);
      const preprocessed = parseXmlToNodes(xml);
      expect(preprocessed).toEqual(direct);
    });
  });

  describe("alternate schema mapping", () => {
    it("detects bill-based schema", () => {
      const result = preprocessXml(BILL_SCHEMA);
      expect(result.detection.schemaDetected).toBe("bill-based");
      expect(result.detection.fallbackUsed).toBe(false);
      expect(result.detection.unsupportedSchemaReason).toBeNull();
      expect(result.detection.mappingUsed).not.toBeNull();
    });

    it("normalizes bill tags to canonical tags", () => {
      const result = preprocessXml(BILL_SCHEMA);
      expect(result.xml).toContain("<act");
      expect(result.xml).toContain("<part");
      expect(result.xml).toContain("<section");
      expect(result.xml).toContain("<clause");
      expect(result.xml).not.toContain("<bill");
      expect(result.xml).not.toContain("<division");
      expect(result.xml).not.toContain("<sec ");
      expect(result.xml).not.toContain("<paragraph");
    });

    it("produces valid parseable nodes from bill schema", () => {
      const { xml } = preprocessXml(BILL_SCHEMA);
      const nodes = parseXmlToNodes(xml);
      expect(nodes.length).toBeGreaterThan(0);
      const types = nodes.map(n => n.type);
      expect(types).toContain("part");
      expect(types).toContain("section");
    });
  });

  describe("unsupported schema", () => {
    it("fails safely with clear reason", () => {
      const result = preprocessXml(UNSUPPORTED_SCHEMA);
      expect(result.detection.unsupportedSchemaReason).toBeTruthy();
      expect(result.detection.unsupportedSchemaReason).toContain("<recipe>");
      expect(result.detection.schemaDetected).toBeNull();
      expect(result.detection.fallbackUsed).toBe(false);
    });
  });

  describe("known root with no structural roles", () => {
    const WEAK_BILL = `<?xml version="1.0" encoding="UTF-8"?>
<bill id="empty-bill">
  <metadata>Some metadata</metadata>
  <notes>Editorial notes only</notes>
</bill>`;

    it("fails safely when root is known but no structural children exist", () => {
      const result = preprocessXml(WEAK_BILL);
      expect(result.detection.unsupportedSchemaReason).toBeTruthy();
      expect(result.detection.unsupportedSchemaReason).toContain("<bill>");
      expect(result.detection.unsupportedSchemaReason).toContain("no recognized structural roles");
      expect(result.detection.schemaDetected).toBeNull();
      expect(result.detection.fallbackUsed).toBe(false);
    });
  });

  describe("malformed XML", () => {
    it("falls back gracefully for malformed XML", () => {
      const result = preprocessXml("<not valid xml <<>>");
      expect(result.detection.fallbackUsed).toBe(true);
      expect(result.detection.unsupportedSchemaReason).toBeNull();
    });
  });
});
