import { useState, useMemo, useCallback, useRef } from "react";
import { LegislativeNode } from "@/data/legislativeData";
import { parseXmlToNodes } from "@/lib/parseXmlToNodes";
import StructureTree from "@/components/StructureTree";
import SelectedText from "@/components/SelectedText";
import BreakdownPanel from "@/components/BreakdownPanel";
import { extractBreakdown } from "@/lib/extractBreakdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, FileText, Upload, Clock, X, Play, ChevronRight, FileCode, Layers, Hash, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RecentDoc {
  id: string;
  name: string;
  timestamp: number;
  data: LegislativeNode[];
}

interface IntakeSummary {
  fileName: string;
  fileSize: string;
  format: string;
  rootElement: string;
  elementCount: number;
  sections: number;
  subsections: number;
  clauses: number;
}

function parseIntakeSummary(xml: string, name: string): IntakeSummary {
  const sizeBytes = new Blob([xml]).size;
  const fileSize = sizeBytes < 1024 ? `${sizeBytes} B` : sizeBytes < 1048576 ? `${(sizeBytes / 1024).toFixed(1)} KB` : `${(sizeBytes / 1048576).toFixed(1)} MB`;

  const rootMatch = xml.match(/<([a-zA-Z][\w.-]*)/);
  const rootElement = rootMatch ? `<${rootMatch[1]}>` : "unknown";

  const allTags = xml.match(/<[a-zA-Z][\w.-]*/g) || [];
  const elementCount = allTags.length;

  const sectionCount = (xml.match(/<section[\s>]/gi) || []).length || (xml.match(/<part[\s>]/gi) || []).length;
  const subsectionCount = (xml.match(/<subsection[\s>]/gi) || []).length || (xml.match(/<division[\s>]/gi) || []).length;
  const clauseCount = (xml.match(/<clause[\s>]/gi) || []).length || (xml.match(/<article[\s>]/gi) || []).length || (xml.match(/<paragraph[\s>]/gi) || []).length;

  return { fileName: name, fileSize, format: "XML", rootElement, elementCount, sections: sectionCount, subsections: subsectionCount, clauses: clauseCount };
}

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<act id="sample-act" jurisdiction="federal">
  <part id="part-1">
    <heading>General Provisions</heading>
    <section id="sec-1">
      <heading>Definitions</heading>
      <clause id="cl-1">For the purposes of this Act, "regulated entity" means any corporation engaged in the manufacture or sale of controlled substances.</clause>
      <clause id="cl-2">The term "Authority" refers to the Federal Regulatory Authority established under Part III.</clause>
    </section>
    <section id="sec-2">
      <heading>Scope of Application</heading>
      <subsection id="sub-2a">This Act applies to all regulated entities operating within federal jurisdiction.</subsection>
      <subsection id="sub-2b">A foreign entity may apply for an exemption under this section.</subsection>
    </section>
  </part>
  <part id="part-2">
    <heading>Obligations and Prohibitions</heading>
    <section id="sec-3">
      <heading>Reporting Requirements</heading>
      <clause id="cl-3">Every regulated entity shall submit an annual compliance report by December 31.</clause>
      <clause id="cl-4">Late submission shall result in a penalty not exceeding $50,000 per month.</clause>
    </section>
    <section id="sec-4">
      <heading>Prohibited Activities</heading>
      <clause id="cl-5">No regulated entity may sell controlled substances to any person under 18.</clause>
    </section>
  </part>
</act>`;

type ProcessingPhase = "idle" | "processing" | "summary" | "done";

const Index = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<LegislativeNode[] | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>(() => {
    try {
      const saved = localStorage.getItem("recent-docs");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [xmlInput, setXmlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [intakeSummary, setIntakeSummary] = useState<IntakeSummary | null>(null);
  const [phase, setPhase] = useState<ProcessingPhase>("idle");
  const [processingName, setProcessingName] = useState("");

  const processXml = useCallback((xml: string, name: string) => {
    if (!xml.trim()) return;

    // Phase 1: Processing indicator
    setProcessingName(name);
    setPhase("processing");
    toast(`Processing ${name}…`);

    const summary = parseIntakeSummary(xml, name);

    // Phase 2: Show summary after brief delay
    setTimeout(() => {
      setIntakeSummary(summary);
      setPhase("summary");
      toast.success(`Processed: ${name}`);
    }, 400);

    // Phase 3: Parse XML and reveal full structure
    setTimeout(() => {
      try {
        const parsed = parseXmlToNodes(xml);
        if (parsed.length === 0) {
          toast.error("No structural elements found in XML");
          setPhase("idle");
          return;
        }
        const docId = `doc-${Date.now()}`;
        const newDoc: RecentDoc = {
          id: docId,
          name,
          timestamp: Date.now(),
          data: parsed,
        };
        setActiveData(parsed);
        setActiveDocId(docId);
        setSelectedId(parsed[0]?.id ?? null);
        setRecentDocs((prev) => {
          const updated = [newDoc, ...prev.filter((d) => d.id !== docId)].slice(0, 5);
          localStorage.setItem("recent-docs", JSON.stringify(updated));
          return updated;
        });
        setPhase("done");
      } catch (err) {
        toast.error("Failed to parse XML: " + (err instanceof Error ? err.message : "Unknown error"));
        setPhase("idle");
      }
    }, 1000);
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setXmlInput(content);
      processXml(content, file.name);
    };
    reader.readAsText(file);
  }, [processXml]);

  const handleProcess = useCallback(() => {
    if (!xmlInput.trim()) {
      toast.error("Paste or upload XML first");
      return;
    }
    processXml(xmlInput, `Document (${new Date().toLocaleTimeString()})`);
  }, [xmlInput, processXml]);

  // Auto-process on paste
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.trim().startsWith("<")) {
      setTimeout(() => {
        processXml(pasted, `Pasted (${new Date().toLocaleTimeString()})`);
      }, 50);
    }
  }, [processXml]);

  const switchToDoc = useCallback((doc: RecentDoc) => {
    setActiveData(doc.data);
    setActiveDocId(doc.id);
    setSelectedId(doc.data[0]?.id ?? null);
  }, []);

  const selectedNode = useMemo(
    () => activeData?.find((n) => n.id === selectedId) ?? null,
    [selectedId, activeData]
  );

  const breakdown = useMemo(
    () => (selectedNode ? extractBreakdown(selectedNode.text) : null),
    [selectedNode]
  );

  const unitJson = useMemo(() => {
    if (!breakdown || !selectedNode) return null;
    return JSON.stringify({ id: selectedNode.id, label: selectedNode.label, type: selectedNode.type, parentId: selectedNode.parentId, breakdown }, null, 2);
  }, [breakdown, selectedNode]);

  const fullJson = useMemo(() => {
    if (!activeData) return null;
    const all = activeData.map((n) => ({
      id: n.id, label: n.label, type: n.type, parentId: n.parentId,
      text: n.text,
      breakdown: extractBreakdown(n.text),
    }));
    return JSON.stringify(all, null, 2);
  }, [activeData]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`Copied`));
  }, []);

  const downloadJson = useCallback((json: string, filename: string) => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  }, []);

  const xmlSource = useMemo(() => {
    if (!selectedNode) return null;
    const tag = selectedNode.type === "part" ? "part" : selectedNode.type === "section" ? "section" : selectedNode.type === "subsection" ? "subsection" : "clause";
    return `<${tag} id="${selectedNode.id}">\n  <heading>${selectedNode.label}</heading>\n  <content>${selectedNode.text}</content>\n</${tag}>`;
  }, [selectedNode]);

  const hasOutput = activeData !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">XML Adapter</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Paste or upload XML. Structured JSON, instantly.</p>
          </div>
          {recentDocs.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {recentDocs.slice(0, 3).map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => switchToDoc(doc)}
                  className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                    activeDocId === doc.id
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
                  }`}
                  title={doc.name}
                >
                  {doc.name.length > 20 ? doc.name.slice(0, 20) + "…" : doc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Drop zone + input */}
      <div
        className={`border-b border-border px-4 lg:px-6 py-4 transition-all duration-200 ${
          isDragOver
            ? "bg-primary/5 border-b-primary/40 ring-1 ring-inset ring-primary/20"
            : ""
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <div className="flex flex-col gap-3">
          {/* Primary drop zone / textarea */}
          <div
            className={`relative rounded-lg border-2 border-dashed transition-all duration-200 ${
              isDragOver
                ? "border-primary bg-primary/5 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <textarea
              className="w-full h-28 px-3 py-2.5 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none font-mono resize-none leading-relaxed rounded-lg"
              placeholder={isDragOver ? "Drop file here…" : "Paste XML or drop a file…"}
              value={xmlInput}
              onChange={(e) => setXmlInput(e.target.value)}
              onPaste={handlePaste}
            />
            {xmlInput && (
              <button
                onClick={() => { setXmlInput(""); setPhase("idle"); setActiveData(null); setIntakeSummary(null); }}
                className="absolute top-2 right-2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleProcess}
              size="sm"
              className="h-8 px-4 text-xs font-medium gap-1.5"
              disabled={!xmlInput.trim() || phase === "processing"}
            >
              <Play className="h-3 w-3" /> Process
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.txt,.html,.xhtml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3" /> Upload
            </Button>
            {!xmlInput.trim() && phase === "idle" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 text-muted-foreground"
                onClick={() => {
                  setXmlInput(SAMPLE_XML);
                  processXml(SAMPLE_XML, "sample-act.xml");
                }}
              >
                <FlaskConical className="h-3 w-3" /> Try Sample
              </Button>
            )}
            {phase === "processing" && (
              <span className="text-xs text-primary animate-pulse ml-2">Processing {processingName}…</span>
            )}
          </div>
        </div>
      </div>

      {/* Intake summary card */}
      {intakeSummary && (phase === "summary" || phase === "done") && (
        <div className={`border-b border-border px-4 lg:px-6 py-3 transition-all duration-300 ${phase === "summary" ? "animate-in fade-in slide-in-from-top-1 duration-200" : ""}`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <FileCode className="h-3 w-3 text-primary" />
              {intakeSummary.fileName.length > 30 ? intakeSummary.fileName.slice(0, 30) + "…" : intakeSummary.fileName}
            </span>
            <span className="text-muted-foreground">{intakeSummary.fileSize}</span>
            <span className="text-muted-foreground">{intakeSummary.format}</span>
            <span className="text-muted-foreground font-mono">{intakeSummary.rootElement}</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Hash className="h-2.5 w-2.5" />{intakeSummary.elementCount} elements
            </span>
            {intakeSummary.sections > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Layers className="h-2.5 w-2.5" />{intakeSummary.sections} sections
              </span>
            )}
            {intakeSummary.subsections > 0 && (
              <span className="text-muted-foreground">{intakeSummary.subsections} subsections</span>
            )}
            {intakeSummary.clauses > 0 && (
              <span className="text-muted-foreground">~{intakeSummary.clauses} clauses</span>
            )}
          </div>
        </div>
      )}

      {/* Results area */}
      {hasOutput && phase === "done" ? (
        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
          {/* Export bar */}
          <div className="border-b border-border px-4 lg:px-6 py-2 flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="px-2 py-0.5 rounded bg-muted border border-border">XML</span>
              <ChevronRight className="h-3 w-3 text-primary" />
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">Structure</span>
              <ChevronRight className="h-3 w-3 text-primary" />
              <span className="px-2 py-0.5 rounded bg-muted border border-border">JSON</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="default" size="sm" className="h-6 text-[10px] gap-1 px-2" disabled={!fullJson} onClick={() => fullJson && copyToClipboard(fullJson, "JSON")}>
                <Copy className="h-2.5 w-2.5" /> Copy JSON
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" disabled={!fullJson} onClick={() => fullJson && downloadJson(fullJson, "document-export.json")}>
                <Download className="h-2.5 w-2.5" /> Download
              </Button>
            </div>
          </div>

          {/* Desktop 3-column */}
          <div className="hidden lg:grid lg:grid-cols-[260px_1fr_1fr] flex-1 min-h-0">
            <div className="border-r border-border overflow-y-auto px-3 py-4">
              <StructureTree nodes={activeData} selectedId={selectedId} onSelect={setSelectedId} />
            </div>

            <div className="border-r border-border overflow-y-auto px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">
                  {selectedNode?.label || "Select a node"}
                </span>
                {selectedNode && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 px-1.5" onClick={() => selectedNode && copyToClipboard(selectedNode.text, "Text")}>
                      <FileText className="h-2.5 w-2.5" /> Text
                    </Button>
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 px-1.5" disabled={!unitJson} onClick={() => unitJson && copyToClipboard(unitJson, "JSON")}>
                      <Copy className="h-2.5 w-2.5" /> JSON
                    </Button>
                  </div>
                )}
              </div>
              <Tabs defaultValue="text" className="flex-1 flex flex-col min-h-0">
                <TabsList className="h-7 p-0.5 w-fit">
                  <TabsTrigger value="text" className="text-[11px] h-6 px-3">Text</TabsTrigger>
                  <TabsTrigger value="source" className="text-[11px] h-6 px-3">XML</TabsTrigger>
                  <TabsTrigger value="patterns" className="text-[11px] h-6 px-3">Patterns</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-3 flex-1 overflow-y-auto">
                  <SelectedText node={selectedNode} />
                </TabsContent>
                <TabsContent value="source" className="mt-3 flex-1 overflow-y-auto">
                  {xmlSource ? (
                    <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-4 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap">{xmlSource}</pre>
                  ) : (
                    <p className="text-muted-foreground text-xs">No selection</p>
                  )}
                </TabsContent>
                <TabsContent value="patterns" className="mt-3 flex-1 overflow-y-auto">
                  <BreakdownPanel breakdown={breakdown} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">JSON Output</h2>
                <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 px-1.5" disabled={!fullJson} onClick={() => fullJson && copyToClipboard(fullJson, "JSON")}>
                  <Copy className="h-2.5 w-2.5" /> Copy
                </Button>
              </div>
              <pre className="text-[11px] text-foreground bg-muted/30 rounded-lg p-4 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap max-h-[calc(100vh-320px)]">
                {fullJson}
              </pre>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="lg:hidden flex-1 min-h-0 flex flex-col">
            <Tabs defaultValue="structure" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full rounded-none border-b border-border shrink-0">
                <TabsTrigger value="structure" className="flex-1 text-xs">Structure</TabsTrigger>
                <TabsTrigger value="text" className="flex-1 text-xs">Text</TabsTrigger>
                <TabsTrigger value="json" className="flex-1 text-xs">JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="structure" className="p-3 flex-1 overflow-y-auto">
                <StructureTree nodes={activeData} selectedId={selectedId} onSelect={setSelectedId} />
              </TabsContent>
              <TabsContent value="text" className="p-3 flex-1 overflow-y-auto">
                <SelectedText node={selectedNode} />
              </TabsContent>
              <TabsContent value="json" className="p-3 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" disabled={!fullJson} onClick={() => fullJson && copyToClipboard(fullJson, "JSON")}>
                    <Copy className="h-3 w-3" /> Copy JSON
                  </Button>
                </div>
                <pre className="text-[11px] text-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap">{fullJson}</pre>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Index;
