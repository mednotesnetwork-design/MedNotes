import "@/i18n";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { Home } from "@/pages/Home";
import { Universities } from "@/pages/Universities";
import { Modules } from "@/pages/Modules";
import { NotesListing } from "@/pages/NotesListing";
import { NoteDetail } from "@/pages/NoteDetail";
import { UploadNote } from "@/pages/UploadNote";
import { ComingSoon } from "@/pages/ComingSoon";
import { Collections } from "@/pages/Collections";
import { Contributors } from "@/pages/Contributors";
import NotFound from "@/pages/not-found";
import { LanguageProvider } from "@/hooks/use-language";
import { LeaderboardProvider } from "@/contexts/LeaderboardContext";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/universities" component={Universities} />
        <Route path="/modules" component={Modules} />
        <Route path="/notes" component={NotesListing} />
        <Route path="/notes/:id" component={NoteDetail} />
        <Route path="/upload" component={UploadNote} />
        {/* Sidebar items with content coming soon */}
        <Route path="/discover" component={ComingSoon} />
        <Route path="/groups" component={ComingSoon} />
        <Route path="/contributors" component={Contributors} />
        <Route path="/collections" component={Collections} />
        <Route path="/favorites" component={ComingSoon} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <LeaderboardProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LeaderboardProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
