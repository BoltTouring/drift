import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

// Pages
import Feed from "./pages/Feed";
import SettingsPage from "./pages/SettingsPage";
import SavedPage from "./pages/SavedPage";
import WordsPage from "./pages/WordsPage";
import StatsPage from "./pages/StatsPage";
import DailyDrift from "./pages/DailyDrift";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

// Check if user has completed onboarding
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const hasOnboarded = localStorage.getItem('drift:onboarded') === 'true';
  
  if (!hasOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Onboarding */}
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Main app routes */}
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route 
          path="/feed" 
          element={
            <OnboardingGuard>
              <Feed />
            </OnboardingGuard>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <OnboardingGuard>
              <SettingsPage />
            </OnboardingGuard>
          } 
        />
        <Route 
          path="/saved" 
          element={
            <OnboardingGuard>
              <SavedPage />
            </OnboardingGuard>
          } 
        />
        <Route 
          path="/words" 
          element={
            <OnboardingGuard>
              <WordsPage />
            </OnboardingGuard>
          } 
        />
        <Route 
          path="/stats" 
          element={
            <OnboardingGuard>
              <StatsPage />
            </OnboardingGuard>
          } 
        />
        <Route 
          path="/daily-drift" 
          element={
            <OnboardingGuard>
              <DailyDrift />
            </OnboardingGuard>
          } 
        />
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
