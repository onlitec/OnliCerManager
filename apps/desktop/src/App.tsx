import { RouterProvider } from "react-router-dom";
import { TooltipProvider } from "./components/ui/tooltip";
import { ConfirmProvider } from "./providers/ConfirmProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { router } from "./router";

export function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={400}>
        <ToastProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
