import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function WorkerDirectoryPage() {
  const utils = trpc.useUtils();
  const workersQuery = trpc.workers.list.useQuery();
  const saveWorkerMutation = trpc.workers.save.useMutation({
    onSuccess: async () => {
      await utils.workers.list.invalidate();
      toast.success("鐵工名單已更新");
    },
  });
  const archiveWorkerMutation = trpc.workers.archive.useMutation({
    onSuccess: async () => {
      await utils.workers.list.invalidate();
      toast.success("鐵工名單已封存");
    },
  });

  const [draftName, setDraftName] = useState("");
  const [draftSortOrder, setDraftSortOrder] = useState("0");
  const [editingId, setEditingId] = useState<number | null>(null);

  const currentEditingWorker = useMemo(
    () => workersQuery.data?.find(worker => worker.id === editingId) ?? null,
    [editingId, workersQuery.data]
  );

  useEffect(() => {
    if (!currentEditingWorker) {
      setDraftName("");
      setDraftSortOrder("0");
      return;
    }

    setDraftName(currentEditingWorker.name);
    setDraftSortOrder(String(currentEditingWorker.sortOrder));
  }, [currentEditingWorker]);

  const submit = async () => {
    if (!draftName.trim()) {
      toast.error("名稱不能空白");
      return;
    }

    await saveWorkerMutation.mutateAsync({
      id: editingId ?? undefined,
      name: draftName.trim(),
      sortOrder: Number(draftSortOrder) || 0,
    });

    setEditingId(null);
    setDraftName("");
    setDraftSortOrder("0");
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-foreground bg-card shadow-panel">
        <CardHeader className="border-b border-border">
          <p className="text-[11px] uppercase tracking-[0.5em] text-muted-foreground">Worker Catalog</p>
          <CardTitle className="text-4xl font-black tracking-tight">鐵工名單管理</CardTitle>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            月報加工區會從這份名單提供下拉選單。若名稱變更，新的月報會帶入新名稱；既有月報仍保留當時的名稱快照，不會被覆寫。
          </p>
        </CardHeader>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-none border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-black">新增 / 編輯</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">名稱</label>
              <Input value={draftName} onChange={event => setDraftName(event.target.value)} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">排序</label>
              <Input
                value={draftSortOrder}
                onChange={event => setDraftSortOrder(event.target.value)}
                className="rounded-none"
                inputMode="numeric"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-none" onClick={submit} disabled={saveWorkerMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {editingId ? "儲存變更" : "新增名單"}
              </Button>
              {editingId ? (
                <Button
                  variant="outline"
                  className="rounded-none"
                  onClick={() => {
                    setEditingId(null);
                    setDraftName("");
                    setDraftSortOrder("0");
                  }}
                >
                  取消編輯
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-black">目前名單</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {(workersQuery.data ?? []).map(worker => (
              <div key={worker.id} className="flex flex-col gap-3 border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold">{worker.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">排序 {worker.sortOrder}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-none" onClick={() => setEditingId(worker.id)}>
                    編輯
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-none text-destructive"
                    onClick={() => archiveWorkerMutation.mutate(worker.id ? { id: worker.id } : { id: 0 })}
                    disabled={archiveWorkerMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    封存
                  </Button>
                </div>
              </div>
            ))}
            {!workersQuery.data?.length ? (
              <div className="border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">
                目前沒有可用名單。你可以先新增一筆資料。
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
