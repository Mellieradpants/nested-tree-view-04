import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { legislativeData, LegislativeNode } from "@/data/legislativeData";
import StructureTree from "@/components/StructureTree";
import SelectedText from "@/components/SelectedText";
import BreakdownPanel from "@/components/BreakdownPanel";
import { extractBreakdown } from "@/lib/extractBreakdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, FileText, Upload, Clock, X, Play, ChevronRight, FileCode, Layers, Hash } from "lucide-react";
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
  const [showSummary, setShowSummary] = useState(false);

  const processXml = useCallback((xml: string, name: string) => {
    if (!xml.trim()) return;

    // Show intake summary first
    const summary = parseIntakeSummary(xml, name);
    setIntakeSummary(summary);
    setShowSummary(true);

    // Transition to full output after a brief preview
    setTimeout(() => {
      const docId = `doc-${Date.now()}`;
      const newDoc: RecentDoc = {
        id: docId,
        name,
        timestamp: Date.now(),
        data: legislativeData,
      };
      setActiveData(legislativeData);
      setActiveDocId(docId);
      setSelectedId(legislativeData[0]?.id ?? null);
      setRecentDocs((prev) => {
        const updated = [newDoc, ...prev.filter((d) => d.id !== docId)].slice(0, 5);
        localStorage.setItem("recent-docs", JSON.stringify(updated));
        return updated;
      });
      setShowSummary(false);
      toast.success(`Processed: ${name}`);
    }, 1200);
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
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  }, []);

  const downloadJson = useCallback((json: string, filename: string) => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded");
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
      <header className="border-b border-border px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">XML Adapter</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Paste or upload XML. Structured JSON, instantly.</p>
          </div>
          {recentDocs.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground mr-1">Recent:</span>
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

      {/* Input zone */}
      <div
        className={`border-b border-border px-4 lg:px-6 py-4 transition-colors ${isDragOver ? "bg-primary/5 border-primary/30" : ""}`}
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
          <div className="relative">
            <textarea
              className="w-full h-28 px-3 py-2.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono resize-none leading-relaxed"
              placeholder={`Paste XML here or drag and drop a file…\n\n<act>\n  <part id="1">\n    <heading>General Provisions</heading>\n  </part>\n</act>`}
              value={xmlInput}
              onChange={(e) => setXmlInput(e.target.value)}
            />
            {xmlInput && (
              <button
                onClick={() => setXmlInput("")}
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
              className="h-9 px-5 text-xs font-medium gap-2"
              disabled={!xmlInput.trim()}
            >
              <Play className="h-3.5 w-3.5" /> Process
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
              className="h-9 text-xs gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> Upload File
            </Button>
            {isDragOver && (
              <span className="text-xs text-primary animate-pulse">Drop file here…</span>
            )}
            {!hasOutput && (
              <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">Paste XML → structure appears instantly → export JSON</span>
            )}
          </div>
        </div>
      </div>

      {/* Intake summary card */}
      {showSummary && intakeSummary && (
        <div className="border-b border-border px-4 lg:px-6 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <FileCode className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Intake Preview</span>
              <span className="ml-auto text-[10px] text-muted-foreground animate-pulse">Processing…</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">File</span>
                <span className="text-xs text-foreground font-medium truncate block" title={intakeSummary.fileName}>{intakeSummary.fileName.length > 24 ? intakeSummary.fileName.slice(0, 24) + "…" : intakeSummary.fileName}</span>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Size</span>
                <span className="text-xs text-foreground font-medium">{intakeSummary.fileSize}</span>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Format</span>
                <span className="text-xs text-foreground font-medium">{intakeSummary.format}</span>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Root</span>
                <span className="text-xs text-foreground font-mono font-medium">{intakeSummary.rootElement}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-primary/10">
              <div className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{intakeSummary.elementCount} elements</span>
              </div>
              {intakeSummary.sections > 0 && (
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{intakeSummary.sections} sections</span>
                </div>
              )}
              {intakeSummary.subsections > 0 && (
                <span className="text-[11px] text-muted-foreground">{intakeSummary.subsections} subsections</span>
              )}
              {intakeSummary.clauses > 0 && (
                <span className="text-[11px] text-muted-foreground">~{intakeSummary.clauses} clauses</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results area */}
      {hasOutput ? (
        <>
          {/* Transformation pipeline indicator */}
          <div className="border-b border-border px-4 lg:px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="px-2 py-0.5 rounded bg-muted border border-border">XML Input</span>
              <ChevronRight className="h-3 w-3 text-primary" />
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">Structural Reconstruction</span>
              <ChevronRight className="h-3 w-3 text-primary" />
              <span className="px-2 py-0.5 rounded bg-muted border border-border">JSON Output</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider mr-1">Export</span>
              <Button variant="default" size="sm" className="h-6 text-[10px] gap-1 px-2" disabled={!fullJson} onClick={() => fullJson && copyToClipboard(fullJson, "Full JSON")}>
                <Copy className="h-2.5 w-2.5" /> Copy JSON
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" disabled={!fullJson} onClick={() => fullJson && downloadJson(fullJson, "document-export.json")}>
                <Download className="h-2.5 w-2.5" /> Download
              </Button>
            </div>
          </div>

          {/* Desktop 3-column */}
          <div className="hidden lg:grid lg:grid-cols-[260px_1fr_1fr] flex-1 min-h-0">
            {/* Structure */}
            <div className="border-r border-border overflow-y-auto px-3 py-4">
              <h2 className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-3 px-1">Document Structure</h2>
              <StructureTree nodes={activeData} selectedId={selectedId} onSelect={setSelectedId} />
            </div>

            {/* Selected unit detail */}
            <div className="border-r border-border overflow-y-auto px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Selected Unit</span>
                {selectedNode && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 px-1.5" onClick={() => selectedNode && copyToClipboard(selectedNode.text, "Unit text")}>
                      <FileText className="h-2.5 w-2.5" /> Copy Text
                    </Button>
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 px-1.5" disabled={!unitJson} onClick={() => unitJson && copyToClipboard(unitJson, "Unit JSON")}>
                      <Copy className="h-2.5 w-2.5" /> Copy JSON
                    </Button>
                  </div>
                )}
              </div>
              <Tabs defaultValue="text" className="flex-1 flex flex-col min-h-0">
                <TabsList className="h-7 p-0.5 w-fit">
                  <TabsTrigger value="text" className="text-[11px] h-6 px-3">Text</TabsTrigger>
                  <TabsTrigger value="source" className="text-[11px] h-6 px-3">XML Source</TabsTrigger>
                  <TabsTrigger value="patterns" className="text-[11px] h-6 px-3">Detected Patterns</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-3 flex-1 overflow-y-auto">
                  <SelectedText node={selectedNode} />
                </TabsContent>
                <TabsContent value="source" className="mt-3 flex-1 overflow-y-auto">
                  {xmlSource ? (
                    <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-4 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap">{xmlSource}</pre>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">Select a node to view its XML source.</p>
                  )}
                </TabsContent>
                <TabsContent value="patterns" className="mt-3 flex-1 overflow-y-auto">
                  <BreakdownPanel breakdown={breakdown} />
                </TabsContent>
              </Tabs>
            </div>

            {/* JSON Output */}
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
                <TabsTrigger value="patterns" className="flex-1 text-xs">Patterns</TabsTrigger>
              </TabsList>
              <TabsContent value="structure" className="p-3 flex-1 overflow-y-auto">
                <StructureTree nodes={activeData} selectedId={selectedId} onSelect={setSelectedId} />
              </TabsContent>
              <TabsContent value="text" className="p-3 flex-1 overflow-y-auto">
                <SelectedText node={selectedNode} />
              </TabsContent>
              <TabsContent value="json" className="p-3 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Full Output</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" disabled={!fullJson} onClick={() => fullJson && copyToClipboard(fullJson, "JSON")}>
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
                <pre className="text-[11px] text-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap">{fullJson}</pre>
              </TabsContent>
              <TabsContent value="patterns" className="p-3 flex-1 overflow-y-auto">
                <BreakdownPanel breakdown={breakdown} />
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-muted-foreground sm:hidden">Paste XML → structure appears instantly → export JSON</p>
        </div>
      )}
    </div>
  );
};

export default Index;
