import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppProvider } from "@/context/AppContext";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OrbitalDock } from "@/components/nav/OrbitalDock";
import { MinimalTopBar } from "@/components/nav/MinimalTopBar";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/Chat";
import Discover from "@/pages/Discover";
import ARSkyGazer from "@/pages/ARSkyGazer";
import Explore from "@/pages/Explore";
import DailyHoroscope from "@/components/DailyHoroscope";
import WeeklyWeather from "@/components/WeeklyWeather";
import CompatibilityAnalyzer from "@/components/CompatibilityAnalyzer";
import CosmicEvents from "@/components/CosmicEvents";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route path="/discover" component={Discover} />
      <Route path="/sky" component={ARSkyGazer} />
      <Route path="/explore" component={Explore} />
      <Route path="/horoscope" component={DailyHoroscope} />
      <Route path="/weekly" component={WeeklyWeather} />
      <Route path="/compatibility" component={CompatibilityAnalyzer} />
      <Route path="/events" component={CosmicEvents} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              {/* Global chrome — visible on all main routes */}
              <MinimalTopBar />
              <OrbitalDock />
              <Router />
            </WouterRouter>
            <Toaster />
            <InstallPrompt />
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
