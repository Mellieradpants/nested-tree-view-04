import { useState, useMemo } from "react";
import { legislativeData } from "@/data/legislativeData";
import StructureTree from "@/components/StructureTree";
import SelectedText from "@/components/SelectedText";
import BreakdownPanel from "@/components/BreakdownPanel";
import { extractBreakdown } from "@/lib/extractBreakdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: 3-column */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr_1fr] h-screen">
        <div className="border-r border-border overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Structure</h2>
          <StructureTree nodes={legislativeData} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="border-r border-border overflow-y-auto p-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Selected Text</h2>
          <SelectedText node={selectedNode} />
        </div>
        <div className="overflow-y-auto p-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Structural Breakdown</h2>
          <BreakdownPanel breakdown={breakdown} />
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="tree" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border">
            <TabsTrigger value="tree" className="flex-1 text-xs">Structure</TabsTrigger>
            <TabsTrigger value="text" className="flex-1 text-xs">Text</TabsTrigger>
            <TabsTrigger value="breakdown" className="flex-1 text-xs">Breakdown</TabsTrigger>
          </TabsList>
          <TabsContent value="tree" className="p-4">
            <StructureTree nodes={legislativeData} selectedId={selectedId} onSelect={setSelectedId} />
          </TabsContent>
          <TabsContent value="text" className="p-4">
            <SelectedText node={selectedNode} />
          </TabsContent>
          <TabsContent value="breakdown" className="p-4">
            <BreakdownPanel breakdown={breakdown} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
