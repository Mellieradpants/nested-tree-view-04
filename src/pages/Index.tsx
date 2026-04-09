import { useState, useMemo, useCallback } from "react";
import { legislativeData } from "@/data/legislativeData";
import StructureTree from "@/components/StructureTree";
import SelectedText from "@/components/SelectedText";
import BreakdownPanel from "@/components/BreakdownPanel";
import { extractBreakdown } from "@/lib/extractBreakdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, FileText, ArrowRight } from "lucide-react";
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

  const actions = (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Button
        variant="outline"
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
        onClick={() => selectedNode && copyToClipboard(selectedNode.text, "Selected text")}
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
  );

  const pipelineStrip = (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">Raw XML</span>
      <ArrowRight className="h-3 w-3 text-primary" />
      <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">Structural Reconstruction</span>
      <ArrowRight className="h-3 w-3 text-primary" />
      <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">JSON Output</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 lg:px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-sm font-semibold text-foreground tracking-tight">Legislative Explorer</h1>
          <div className="hidden sm:block">{pipelineStrip}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="sm:hidden">{pipelineStrip}</div>
          {actions}
        </div>
      </header>

      {/* Desktop: 3-column */}
      <div className="hidden lg:grid lg:grid-cols-[260px_1fr_1fr] flex-1 min-h-0">
        <div className="border-r border-border overflow-y-auto px-3 py-3">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">Structure</h2>
          <StructureTree nodes={legislativeData} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="border-r border-border overflow-y-auto px-4 py-3">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Selected Text</h2>
          <SelectedText node={selectedNode} />
        </div>
        <div className="overflow-y-auto px-4 py-3">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Structural Breakdown</h2>
          <BreakdownPanel breakdown={breakdown} />
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="tree" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full rounded-none border-b border-border shrink-0">
            <TabsTrigger value="tree" className="flex-1 text-xs">Structure</TabsTrigger>
            <TabsTrigger value="text" className="flex-1 text-xs">Text</TabsTrigger>
            <TabsTrigger value="breakdown" className="flex-1 text-xs">Breakdown</TabsTrigger>
          </TabsList>
          <TabsContent value="tree" className="p-3 flex-1 overflow-y-auto">
            <StructureTree nodes={legislativeData} selectedId={selectedId} onSelect={setSelectedId} />
          </TabsContent>
          <TabsContent value="text" className="p-3 flex-1 overflow-y-auto">
            <SelectedText node={selectedNode} />
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
