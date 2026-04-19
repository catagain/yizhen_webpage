import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AnnualOverviewPage from "@/pages/AnnualOverviewPage";
import Home from "@/pages/Home";
import ReportsPage from "@/pages/ReportsPage";
import MonthlyReportPage from "@/pages/MonthlyReportPage";
import WorkerDirectoryPage from "@/pages/WorkerDirectoryPage";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function AppShell({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <AppShell>
          <Home />
        </AppShell>
      </Route>
      <Route path="/reports">
        <AppShell>
          <ReportsPage />
        </AppShell>
      </Route>
      <Route path="/reports/:monthKey">
        {params => (
          <AppShell>
            <MonthlyReportPage monthKey={params.monthKey} />
          </AppShell>
        )}
      </Route>
      <Route path="/annual">
        <AppShell>
          <AnnualOverviewPage />
        </AppShell>
      </Route>
      <Route path="/workers">
        <AppShell>
          <WorkerDirectoryPage />
        </AppShell>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
