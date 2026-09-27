import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Global styles load before the editor so its component styles take precedence.
import "@fontsource-variable/montserrat";
import "@/styles/globals.css";
import Editor from "@/components/morph/editor";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Editor />
  </StrictMode>,
);
