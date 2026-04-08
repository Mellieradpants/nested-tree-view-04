import TreeNode from "@/components/TreeNode";

const data = [
  { id: "1", parentId: null, text: "Section 1", type: "section" },
  { id: "2", parentId: "1", text: "(1) Main rule", type: "subsection_numeric" },
  { id: "3", parentId: "2", text: "(a) Detail A", type: "subsection_alpha" },
  { id: "4", parentId: "2", text: "(b) Detail B", type: "subsection_alpha" },
  { id: "5", parentId: "1", text: "(2) Another rule", type: "subsection_numeric" },
  { id: "6", parentId: "5", text: "(a) Sub-detail", type: "subsection_alpha" },
];

const Index = () => {
  const roots = data.filter((i) => i.parentId === null);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-4">Hierarchical List</h1>
        <div className="border border-border rounded-lg p-4 bg-card">
          {roots.map((root) => {
            const children = data.filter((i) => i.parentId === root.id);
            return <TreeNode key={root.id} item={root} children={children} allItems={data} depth={0} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
