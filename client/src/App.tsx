import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Analysis from "./pages/Analysis";
import Theories from "./pages/Theories";
import Compare from "./pages/Compare";
import Market from "./pages/Market";
import Backtest from "./pages/Backtest";
import Auth from "./pages/Auth";
import AdminInvite from "./pages/AdminInvite";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/theories" component={Theories} />
      <Route path="/compare" component={Compare} />
      <Route path="/market" component={Market} />
      <Route path="/backtest" component={Backtest} />
      <Route path="/auth" component={Auth} />
      <Route path="/admin/invite" component={AdminInvite} />
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
