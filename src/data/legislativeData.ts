export interface LegislativeNode {
  id: string;
  parentId: string | null;
  label: string;
  text: string;
  type: "part" | "section" | "subsection" | "clause";
}

export const legislativeData: LegislativeNode[] = [
  {
    id: "1",
    parentId: null,
    label: "Part I — General Provisions",
    text: "Part I — General Provisions",
    type: "part",
  },
  {
    id: "1.1",
    parentId: "1",
    label: "Section 1 — Definitions",
    text: 'For the purposes of this Act, "regulated entity" means any corporation, partnership, or sole proprietorship engaged in the manufacture, distribution, or sale of controlled substances as defined in Schedule II.',
    type: "section",
  },
  {
    id: "1.2",
    parentId: "1",
    label: "Section 2 — Scope of Application",
    text: "This Act shall apply to all regulated entities operating within the jurisdiction of the Federal Authority, effective from January 1, 2026.",
    type: "section",
  },
  {
    id: "1.2.1",
    parentId: "1.2",
    label: "(a) Domestic entities",
    text: "Every domestic regulated entity must register with the Federal Authority within 90 days of the commencement of this Act.",
    type: "subsection",
  },
  {
    id: "1.2.2",
    parentId: "1.2",
    label: "(b) Foreign entities",
    text: "A foreign entity may apply for an exemption under this section, provided that it submits a written declaration to the Federal Authority no later than March 31, 2026.",
    type: "subsection",
  },
  {
    id: "2",
    parentId: null,
    label: "Part II — Obligations and Prohibitions",
    text: "Part II — Obligations and Prohibitions",
    type: "part",
  },
  {
    id: "2.1",
    parentId: "2",
    label: "Section 3 — Reporting Requirements",
    text: "Every regulated entity shall submit an annual compliance report to the Federal Authority by December 31 of each calendar year.",
    type: "section",
  },
  {
    id: "2.1.1",
    parentId: "2.1",
    label: "(a) Content of report",
    text: "The compliance report must include a detailed account of all controlled substances manufactured, distributed, or sold during the reporting period.",
    type: "subsection",
  },
  {
    id: "2.1.2",
    parentId: "2.1",
    label: "(b) Late submission",
    text: "A regulated entity that fails to submit the report by the deadline shall be subject to a penalty not exceeding $50,000 per month of delay.",
    type: "subsection",
  },
  {
    id: "2.2",
    parentId: "2",
    label: "Section 4 — Prohibited Activities",
    text: "No regulated entity may engage in the sale of controlled substances to any person under the age of 18.",
    type: "section",
  },
  {
    id: "2.2.1",
    parentId: "2.2",
    label: "(a) Advertising restrictions",
    text: "A regulated entity must not advertise controlled substances in any medium accessible to persons under the age of 18.",
    type: "clause",
  },
  {
    id: "2.2.2",
    parentId: "2.2",
    label: "(b) Permitted research use",
    text: "An accredited research institution may obtain controlled substances for the purpose of scientific research, subject to prior written authorization from the Federal Authority.",
    type: "clause",
  },
  {
    id: "3",
    parentId: null,
    label: "Part III — Enforcement",
    text: "Part III — Enforcement",
    type: "part",
  },
  {
    id: "3.1",
    parentId: "3",
    label: "Section 5 — Inspections",
    text: "The Federal Authority may conduct unannounced inspections of any regulated entity during normal business hours.",
    type: "section",
  },
  {
    id: "3.1.1",
    parentId: "3.1",
    label: "(a) Inspection powers",
    text: "An inspector appointed by the Federal Authority shall have the right to access all premises, records, and documents of the regulated entity.",
    type: "subsection",
  },
  {
    id: "3.2",
    parentId: "3",
    label: "Section 6 — Penalties",
    text: "Any person who contravenes a provision of this Act shall be liable, on summary conviction, to a fine not exceeding $500,000 or to imprisonment for a term not exceeding two years, or to both.",
    type: "section",
  },
];
