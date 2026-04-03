import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FiscalDataProvider } from "@/contexts/FiscalDataContext";
import Index from "./pages/Index";
import AMFPage from "./pages/AMFPage";
import DCPage from "./pages/DCPage";
import AnalysisPage from "./pages/AnalysisPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FiscalDataProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/amf" element={<AMFPage />} />
            <Route path="/dc" element={<DCPage />} />
            <Route path="/analise" element={<AnalysisPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </FiscalDataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
