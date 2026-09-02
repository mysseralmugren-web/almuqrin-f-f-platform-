import { createElement, useEffect } from "react";

export function ModelViewer({ src, alt }: { src: string; alt: string }) {
  useEffect(() => {
    if (document.querySelector('script[data-almuqrin-model-viewer]')) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
    script.dataset.almuqrinModelViewer = "true";
    document.head.appendChild(script);
  }, []);
  return <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white">{createElement("model-viewer", { src, alt, "camera-controls": true, "auto-rotate": true, "shadow-intensity": "1", style: { width: "100%", height: "440px", background: "#f1eee7" } })}</div>;
}
