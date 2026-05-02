import { createRoot } from "react-dom/client";
import OneSignal from "react-onesignal";
import App from "./App";
import "./index.css";

OneSignal.init({
  appId: import.meta.env.VITE_ONESIGNAL_APP_ID as string,
  notifyButton: { enable: false },
  allowLocalhostAsSecureOrigin: true,
});

createRoot(document.getElementById("root")!).render(<App />);
