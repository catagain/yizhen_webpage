import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("登入成功");
      setLocation("/");
    },
    onError: error => {
      toast.error(error.message || "登入失敗");
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loginMutation.mutateAsync({
      username: username.trim(),
      password,
    });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between border border-border bg-card p-8 shadow-panel">
          <div>
            <p className="text-[11px] uppercase tracking-[0.5em] text-muted-foreground">YIZHEN COSTING SYSTEM</p>
            <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-tight sm:text-6xl">
              以月份為核心的成本與毛利核算系統
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-8 text-muted-foreground">
              這個版本改為站內固定帳密登入，月報、年度彙總與鐵工名單都會在登入後開放操作。加工輸入已不再包含自家欄位，月報也會支援永久刪除。
            </p>
          </div>

          <div className="grid gap-4 pt-8 md:grid-cols-3">
            <div className="border border-border bg-background p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Monthly Core</p>
              <p className="mt-3 text-2xl font-black">月報核算</p>
            </div>
            <div className="border border-border bg-background p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Annual View</p>
              <p className="mt-3 text-2xl font-black">年度毛利</p>
            </div>
            <div className="border border-border bg-background p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Worker Catalog</p>
              <p className="mt-3 text-2xl font-black">鐵工名單</p>
            </div>
          </div>
        </section>

        <Card className="rounded-none border-foreground bg-card shadow-panel lg:self-center">
          <CardHeader className="border-b border-border">
            <p className="text-[11px] uppercase tracking-[0.5em] text-muted-foreground">Access Control</p>
            <CardTitle className="text-3xl font-black tracking-tight">固定帳密登入</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">帳號</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={username}
                    onChange={event => setUsername(event.target.value)}
                    className="rounded-none pl-10"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">密碼</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className="rounded-none pl-10"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button type="submit" className="h-12 w-full rounded-none text-sm font-bold uppercase tracking-[0.2em]" disabled={loginMutation.isPending}>
                登入系統
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
