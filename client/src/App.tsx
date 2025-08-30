import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import PersonnelManagement from "@/pages/personnel-management";
import BranchManagement from "@/pages/branch-management";
import ShiftManagement from "@/pages/shift-management";
import LeaveManagement from "@/pages/leave-management";
import AttendanceTracking from "@/pages/attendance-tracking";
import QRControl from "@/pages/qr-control";
import Reports from "@/pages/reports";
import SystemSettings from "@/pages/system-settings";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/personnel" component={PersonnelManagement} />
      <ProtectedRoute path="/branches" component={BranchManagement} />
      <ProtectedRoute path="/shifts" component={ShiftManagement} />
      <ProtectedRoute path="/leave" component={LeaveManagement} />
      <ProtectedRoute path="/attendance" component={AttendanceTracking} />
      <ProtectedRoute path="/qr-control" component={QRControl} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/settings" component={SystemSettings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
