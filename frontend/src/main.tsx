import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors closeButton />
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
