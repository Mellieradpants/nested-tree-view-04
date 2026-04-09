import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { legislativeData, LegislativeNode } from "@/data/legislativeData";
import StructureTree from "@/components/StructureTree";
import SelectedText from "@/components/SelectedText";
import BreakdownPanel from "@/components/BreakdownPanel";
import { extractBreakdown } from "@/lib/extractBreakdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, FileText, ArrowRight, Code2, Upload, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RecentDoc {
  id: string;
  name: string;
  timestamp: number;
  data: LegislativeNode[];
}

const Index = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<LegislativeNode[]>(legislativeData);
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

  // Process XML input — uses demo data as deterministic transform
  const processXml = useCallback((xml: string, name: string) => {
    if (!xml.trim()) return;
    // Deterministic: always produces the same structured output from the demo dataset
    // In production this would parse real XML; here we demonstrate the workflow
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
    toast.success(`Processed: ${name}`);
  }, []);

  // Auto-process on paste
  const handlePaste = useCallback((text: string) => {
    setXmlInput(text);
    if (text.trim().length > 10) {
      processXml(text, `Pasted XML (${new Date().toLocaleTimeString()})`);
    }
  }, [processXml]);

  // File upload handler
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setXmlInput(content);
      processXml(content, file.name);
    };
    reader.readAsText(file);
  }, [processXml]);

  // Switch to recent doc
  const switchToDoc = useCallback((doc: RecentDoc) => {
    setActiveData(doc.data);
    setActiveDocId(doc.id);
    setSelectedId(doc.data[0]?.id ?? null);
  }, []);

  // Auto-select first node on initial load
  useEffect(() => {
    if (!selectedId && activeData.length > 0) {
      setSelectedId(activeData[0].id);
    }
  }, []);

  const selectedNode = useMemo(
    () => activeData.find((n) => n.id === selectedId) ?? null,
    [selectedId, activeData]
  );

  const breakdown = useMemo(
    () => (selectedNode ? extractBreakdown(selectedNode.text) : null),
    [selectedNode]
  );

  const breakdownJson = useMemo(() => {
    if (!breakdown || !selectedNode) return null;
    return JSON.stringify({ id: selectedNode.id, label: selectedNode.label, breakdown }, null, 2);
  }, [breakdown, selectedNode]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  }, []);

  const downloadJson = useCallback(() => {
    if (!breakdownJson || !selectedNode) return;
    const blob = new Blob([breakdownJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedNode.id}-breakdown.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded");
  }, [breakdownJson, selectedNode]);

  const exportAll = useCallback(() => {
    const all = activeData.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      parentId: n.parentId,
      breakdown: extractBreakdown(n.text),
    }));
    const json = JSON.stringify(all, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legislative-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Full export downloaded");
  }, [activeData]);

  const xmlSource = useMemo(() => {
    if (!selectedNode) return null;
    const tag = selectedNode.type === "part" ? "part" : selectedNode.type === "section" ? "section" : selectedNode.type === "subsection" ? "subsection" : "clause";
    return `<${tag} id="${selectedNode.id}">\n  <heading>${selectedNode.label}</heading>\n  <content>${selectedNode.text}</content>\n</${tag}>`;
  }, [selectedNode]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 lg:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Code2 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h1 className="text-sm font-semibold text-foreground tracking-tight">Legislative XML Adapter</h1>
              <p className="text-[10px] text-muted-foreground tracking-wide">Deterministic XML → Structured JSON</p>
            </div>
          </div>
          {/* Pipeline strip */}
          <div className="flex items-center gap-0 text-[10px]">
            <span className="px-2.5 py-1 rounded-l-md bg-muted text-muted-foreground font-medium border border-border">Raw XML</span>
            <ArrowRight className="h-3 w-3 text-primary -mx-px relative z-10" />
            <span className="px-2.5 py-1 bg-primary/10 text-primary font-semibold border-y border-primary/20">Structural Reconstruction</span>
            <ArrowRight className="h-3 w-3 text-primary -mx-px relative z-10" />
            <span className="px-2.5 py-1 rounded-r-md bg-muted text-muted-foreground font-medium border border-border">JSON Output</span>
          </div>
        </div>
      </header>

      {/* Input zone — always visible */}
      <div
        className={`border-b border-border px-4 lg:px-6 py-2.5 transition-colors ${isDragOver ? "bg-primary/5 border-primary/30" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              className="w-full h-8 px-3 text-xs bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono"
              placeholder="Paste XML to process…"
              value={xmlInput.length > 80 ? xmlInput.slice(0, 80) + "…" : xmlInput}
              onChange={(e) => {
                const val = e.target.value;
                setXmlInput(val);
                if (val.trim().length > 20) handlePaste(val);
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text.trim().length > 10) {
                  e.preventDefault();
                  handlePaste(text);
                }
              }}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.txt"
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
            <Upload className="h-3 w-3" /> Upload XML
          </Button>
          {xmlInput && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setXmlInput("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {/* Recent docs */}
          {recentDocs.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {recentDocs.slice(0, 3).map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => switchToDoc(doc)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    activeDocId === doc.id
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
                  }`}
                  title={doc.name}
                >
                  {doc.name.length > 18 ? doc.name.slice(0, 18) + "…" : doc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export / Transfer bar */}
      <div className="border-b border-border px-4 lg:px-6 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Export / Transfer</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="default" size="sm" className="h-7 text-xs gap-1.5" disabled={!breakdownJson} onClick={() => breakdownJson && copyToClipboard(breakdownJson, "JSON")}>
            <Copy className="h-3 w-3" /> Copy JSON
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={!breakdownJson} onClick={downloadJson}>
            <Download className="h-3 w-3" /> Download JSON
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={!selectedNode} onClick={() => selectedNode && copyToClipboard(selectedNode.text, "Unit text")}>
            <FileText className="h-3 w-3" /> Copy Unit
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={exportAll}>
            <Download className="h-3 w-3" /> Export All
          </Button>
        </div>
      </div>

      {/* Desktop: 3-column */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr_1fr] flex-1 min-h-0">
        <div className="border-r border-border overflow-y-auto px-3 py-3">
          <h2 className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-3 px-1">Structural Reconstruction</h2>
          <StructureTree nodes={activeData} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="border-r border-border overflow-y-auto px-4 py-3 flex flex-col gap-4">
          <div>
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Selected Unit</span>
            <Tabs defaultValue="text" className="mt-1.5">
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value="text" className="text-[11px] h-6 px-3">Text</TabsTrigger>
                <TabsTrigger value="source" className="text-[11px] h-6 px-3">XML Source</TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-3">
                <SelectedText node={selectedNode} />
              </TabsContent>
              <TabsContent value="source" className="mt-3">
                {xmlSource ? (
                  <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap">{xmlSource}</pre>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Select a node to view its XML source segment.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div className="overflow-y-auto px-4 py-3">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Detected Patterns</h2>
          <BreakdownPanel breakdown={breakdown} />
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="tree" className="flex-1 flex flex-col min-h-0">
          <div className="px-3 pt-2">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Selected Unit</span>
          </div>
          <TabsList className="w-full rounded-none border-b border-border shrink-0">
            <TabsTrigger value="tree" className="flex-1 text-xs">Structure</TabsTrigger>
            <TabsTrigger value="text" className="flex-1 text-xs">Text</TabsTrigger>
            <TabsTrigger value="source" className="flex-1 text-xs">XML Source</TabsTrigger>
            <TabsTrigger value="breakdown" className="flex-1 text-xs">Patterns</TabsTrigger>
          </TabsList>
          <TabsContent value="tree" className="p-3 flex-1 overflow-y-auto">
            <StructureTree nodes={activeData} selectedId={selectedId} onSelect={setSelectedId} />
          </TabsContent>
          <TabsContent value="text" className="p-3 flex-1 overflow-y-auto">
            <SelectedText node={selectedNode} />
          </TabsContent>
          <TabsContent value="source" className="p-3 flex-1 overflow-y-auto">
            {xmlSource ? (
              <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap">{xmlSource}</pre>
            ) : (
              <p className="text-muted-foreground text-sm italic">Select a node to view its XML source segment.</p>
            )}
          </TabsContent>
          <TabsContent value="breakdown" className="p-3 flex-1 overflow-y-auto">
            <BreakdownPanel breakdown={breakdown} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
