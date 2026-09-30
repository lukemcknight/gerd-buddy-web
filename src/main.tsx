import { installAppStoreClickTracking, sanitizeWebEvent } from "./lib/analytics";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.gerdbuddyBeforeSend = sanitizeWebEvent;
const stopAppStoreTracking = installAppStoreClickTracking();
if (import.meta.hot) import.meta.hot.dispose(stopAppStoreTracking);

createRoot(document.getElementById("root")!).render(<App />);
