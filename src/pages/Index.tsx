import { useState, useMemo, useCallback } from "react";
import { legislativeData } from "@/data/legislativeData";
import StructureTree from "@/components/StructureTree";
import SelectedText from "@/components/SelectedText";
import BreakdownPanel from "@/components/BreakdownPanel";
import { extractBreakdown } from "@/lib/extractBreakdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, FileText, ArrowRight, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => legislativeData.find((n) => n.id === selectedId) ?? null,
    [selectedId]
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
    const all = legislativeData.map((n) => ({
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
  }, []);

  // Simulated XML source segment for traceability
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

      {/* Export / Transfer bar */}
      <div className="border-b border-border px-4 lg:px-6 py-2 flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Export / Transfer</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs gap-1.5"
            disabled={!breakdownJson}
            onClick={() => breakdownJson && copyToClipboard(breakdownJson, "JSON")}
          >
            <Copy className="h-3 w-3" /> Copy JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            disabled={!breakdownJson}
            onClick={downloadJson}
          >
            <Download className="h-3 w-3" /> Download JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            disabled={!selectedNode}
            onClick={() => selectedNode && copyToClipboard(selectedNode.text, "Unit text")}
          >
            <FileText className="h-3 w-3" /> Copy Unit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={exportAll}
          >
            <Download className="h-3 w-3" /> Export All
          </Button>
        </div>
      </div>

      {/* Desktop: 3-column */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr_1fr] flex-1 min-h-0">
        {/* Left: Structural Reconstruction */}
        <div className="border-r border-border overflow-y-auto px-3 py-3">
          <h2 className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-3 px-1">Structural Reconstruction</h2>
          <StructureTree nodes={legislativeData} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Middle: Selected Unit */}
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
                  <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap">
                    {xmlSource}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Select a node to view its XML source segment.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right: Detected Patterns */}
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
            <StructureTree nodes={legislativeData} selectedId={selectedId} onSelect={setSelectedId} />
          </TabsContent>
          <TabsContent value="text" className="p-3 flex-1 overflow-y-auto">
            <SelectedText node={selectedNode} />
          </TabsContent>
          <TabsContent value="source" className="p-3 flex-1 overflow-y-auto">
            {xmlSource ? (
              <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto border border-border font-mono leading-relaxed whitespace-pre-wrap">
                {xmlSource}
              </pre>
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
