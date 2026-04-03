import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileUpload } from "@/components/FileUpload";
import { useFiscalData } from "@/contexts/FiscalDataContext";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data } = useFiscalData();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/50 px-4 glass-card rounded-none border-x-0 border-t-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="shrink-0" />
              <span className="text-sm text-muted-foreground hidden sm:inline">Dashboard de Projeções Fiscais</span>
            </div>
            <div className="flex items-center gap-3">
              {data.loaded && <FileUpload />}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            {!data.loaded ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight gradient-text">FiscalView</h1>
                  <p className="text-muted-foreground">Dashboard de Projeções Fiscais do Estado</p>
                </div>
                <FileUpload />
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
