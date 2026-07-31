import { createHashRouter } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { CAPage } from "./pages/CAPage";
import { CertificatesPage } from "./pages/CertificatesPage";
import { ServersPage } from "./pages/ServersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HelpPage } from "./pages/HelpPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "ca", element: <CAPage /> },
      { path: "certificates", element: <CertificatesPage /> },
      { path: "servers", element: <ServersPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "help", element: <HelpPage /> },
    ],
    errorElement: <NotFoundPage />,
  },
]);
