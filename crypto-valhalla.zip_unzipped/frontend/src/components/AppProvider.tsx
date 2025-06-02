import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar"; // Import the Sidebar
import { Toaster } from "@/components/ui/sonner"; // Good place for global Toaster

interface Props {
  children: ReactNode;
}

export const AppProvider = ({ children }: Props) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8"> {/* Added padding */}
        {children} {/* This will render the page content via Outlet */}
      </main>
      <Toaster richColors position="top-right" /> {/* Global toast notifications */}
    </div>
  );
};