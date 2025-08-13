import React, { useEffect, useRef } from "react";

const OfficeXIFrame = () => {
  // Correctly type the useRef hook to HTMLIFrameElement
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const authJson = {
    host: "http://localhost:8888",
    drive_id:
      "DriveID_mkqss-ty2by-cqgud-ydxgj-kucxu-hutfd-xx4kn-gw7y4-qkwq6-7v4na-dqe",
    org_name: "Bro",
    user_id:
      "UserID_asmzq-qbrux-e2bhf-u3cxk-4zpuv-ammkq-o5vqc-j62q2-oa7l3-hl2w4-pae",
    profile_name: "Anon",
    api_key_value:
      "eyJhdXRoX3R5cGUiOiJBUElfS0VZIiwidmFsdWUiOiI0Nzg4NmY4N2JhMTAzY2U5MmNmOGU3ZWUyZjMzMjM2MzIxZjA1ZDU1OWRkNGMyMTA5MjU4YWUyNjQ1ZWNhOTBlIn0=",
    redirect_to: "org/current/welcome",
  };

  const iframeOrigin = "http://localhost:5173";

  useEffect(() => {
    const handleLoad = () => {
      // TypeScript now knows iframeRef.current is an HTMLIFrameElement
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const message = {
          type: "officex-init",
          data: { injected: authJson },
          tracer: `init-injected-${Date.now()}`,
        };
        iframeRef.current.contentWindow.postMessage(message, iframeOrigin);
      }
    };

    const iframeElement = iframeRef.current;
    if (iframeElement) {
      iframeElement.addEventListener("load", handleLoad);
    }

    return () => {
      if (iframeElement) {
        iframeElement.removeEventListener("load", handleLoad);
      }
    };
  }, []);

  return (
    <div style={{ width: "1200px" }}>
      <iframe
        ref={iframeRef}
        src={`${iframeOrigin}/org/current/welcome`}
        style={{ width: "100%", height: "800px", border: "none" }}
        sandbox="allow-same-origin allow-scripts allow-downloads allow-popups"
      />
    </div>
  );
};

export default OfficeXIFrame;
