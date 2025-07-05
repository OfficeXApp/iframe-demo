import { useState, useRef, useEffect, useCallback } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

// Types for iframe communication
interface IFrameMessage {
  type: string;
  data: any;
  tracer?: string;
}

// About Child IFrame Instance response type
interface AboutChildIFrameInstanceResponse {
  organization_name: string;
  organization_id: string;
  profile_id: string;
  profile_name: string;
  endpoint?: string;
}

// Auth Token response type
interface AuthTokenIFrameResponse {
  organization_id: string;
  profile_id: string;
  endpoint?: string;
  auth_token: string;
}

// Set a global-like variable for development mode
const LOCAL_DEV_MODE = true;
const iframeOrigin = LOCAL_DEV_MODE
  ? "http://localhost:5173"
  : "https://drive.officex.app";

function App() {
  const [iframeReady, setIframeReady] = useState(false);
  const [initResponse, setInitResponse] = useState<any>(null);
  const [aboutResponse, setAboutResponse] =
    useState<AboutChildIFrameInstanceResponse | null>(null);
  const [authTokenResponse, setAuthTokenResponse] =
    useState<AuthTokenIFrameResponse | null>(null);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate unique seeds for this session - persist these across refreshes
  const org_client_secret = useRef(`org-123abc`);
  const profile_client_secret = useRef(`profile-123xyz`);

  // Store initialization config for reuse on refresh
  const initConfig = useRef({
    ephemeral: {
      org_client_secret: org_client_secret.current,
      profile_client_secret: profile_client_secret.current,
      org_name: "Demo Org",
      profile_name: "Demo Profile",
    },
  });

  // Send message to iframe
  const sendMessageToIframe = useCallback(
    (type: string, data: any, tracer?: string) => {
      if (!iframeRef.current?.contentWindow) {
        console.warn("IFrame not ready");
        return;
      }

      const message: IFrameMessage = {
        type,
        data,
        tracer: tracer || `${type}-${Date.now()}`,
      };

      iframeRef.current.contentWindow.postMessage(message, iframeOrigin);
      console.log(`Sent message to iframe:`, message);
    },
    []
  );

  // Initialize iframe when it loads
  const initializeIframe = useCallback(() => {
    console.log("Initializing iframe...");
    setInitializationAttempts((prev) => prev + 1);
    sendMessageToIframe(
      "officex-init",
      initConfig.current,
      "init-" + Date.now()
    );
  }, [sendMessageToIframe]);

  // Navigate iframe to a specific route
  const navigateIframe = useCallback(
    (route: string) => {
      if (!iframeReady) {
        console.warn("Cannot navigate: iframe not ready");
        return;
      }
      sendMessageToIframe("officex-go-to-page", { route }, "nav-" + Date.now());
    },
    [iframeReady, sendMessageToIframe]
  );

  // Get information about the current iframe instance
  const getAboutChildIFrameInstance = useCallback(() => {
    if (!iframeReady) {
      console.warn("Cannot get about info: iframe not ready");
      return;
    }
    sendMessageToIframe("officex-about-iframe", {}, "about-" + Date.now());
  }, [iframeReady, sendMessageToIframe]);

  // Get auth token from iframe
  const getAuthToken = useCallback(() => {
    if (!iframeReady) {
      console.warn("Cannot get auth token: iframe not ready");
      return;
    }
    sendMessageToIframe("officex-auth-token", {}, "auth-token-" + Date.now());
  }, [iframeReady, sendMessageToIframe]);

  // Handle iframe load event (fires on initial load AND refresh)
  const handleIframeLoad = useCallback(() => {
    const now = new Date();
    console.log("IFrame loaded/refreshed at:", now.toISOString());

    // Reset ready state when iframe loads/refreshes
    setIframeReady(false);
    setInitResponse(null);
    setAboutResponse(null);
    setAuthTokenResponse(null);
    setLastRefreshTime(now);

    // Initialize after a short delay to ensure iframe is fully ready
    setTimeout(() => {
      initializeIframe();
    }, 100);
  }, [initializeIframe]);

  // Retry initialization if it fails
  const retryInitialization = useCallback(() => {
    console.log("Retrying initialization...");
    setTimeout(() => {
      initializeIframe();
    }, 2000);
  }, [initializeIframe]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin for security (skip in local dev mode)
      if (!LOCAL_DEV_MODE && event.origin !== iframeOrigin) {
        console.warn("Received message from unknown origin:", event.origin);
        return;
      }

      const { type, data, tracer }: IFrameMessage = event.data;
      console.log("Received message from child iframe:", {
        type,
        data,
        tracer,
      });

      // Handle different message types
      switch (type) {
        case "officex-init-response":
          if (data.success) {
            setIframeReady(true);
            setInitResponse(data);
            console.log("IFrame initialized successfully:", data);
          } else {
            setIframeReady(false);
            setInitResponse(data);
            console.error("IFrame initialization failed:", data.error);

            // Retry initialization if it failed
            if (initializationAttempts < 3) {
              retryInitialization();
            } else {
              console.error("Max initialization attempts reached");
            }
          }
          break;

        case "officex-go-to-page-response":
          if (data.success) {
            console.log("Navigation successful:", data.route);
          } else {
            console.error("Navigation failed:", data.error);
          }
          break;

        case "officex-about-iframe-response":
        case "officex-about-child-iframe-instance-response":
          if (data.success) {
            setAboutResponse(data.data);
            console.log("About Child IFrame Instance successful:", data.data);
          } else {
            setAboutResponse(null);
            console.error("About Child IFrame Instance failed:", data.error);
          }
          break;

        case "officex-auth-token-response":
          if (data.success) {
            setAuthTokenResponse(data.data);
            console.log("Auth token received successfully:", data.data);
          } else {
            setAuthTokenResponse(null);
            console.error("Auth token request failed:", data.error);
          }
          break;

        case "officex-heartbeat":
          console.log("Heartbeat received from iframe:", data.timestamp);
          break;

        default:
          console.log("Unknown message type:", type);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [initializationAttempts, retryInitialization]);

  // Manual initialization button (for testing)
  const manualInit = useCallback(() => {
    setInitializationAttempts(0);
    initializeIframe();
  }, [initializeIframe]);

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <div
          style={{
            display: "flex",
            gap: "20px",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>OfficeX IFrame Integration Demo</h1>
      </div>

      {/* Status Bar */}
      <div
        style={{
          background: iframeReady ? "#e8f5e8" : "#fff3cd",
          padding: "15px",
          borderRadius: "8px",
          border: `2px solid ${iframeReady ? "#4CAF50" : "#ffc107"}`,
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "green",
        }}
      >
        <div>
          <strong>Status:</strong>{" "}
          {iframeReady ? "✅ Ready" : "⏳ Not initialized"} |
          <strong> Attempts:</strong> {initializationAttempts} |
          {lastRefreshTime && (
            <span>
              <strong> Last Load:</strong>{" "}
              {lastRefreshTime.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={manualInit}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer",
            backgroundColor: iframeReady ? "#4CAF50" : "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {iframeReady ? "Reinitialize" : "Initialize"}
        </button>
      </div>

      {/* IFrame */}
      <div
        style={{
          border: "2px solid #ddd",
          borderRadius: "8px",
          marginBottom: "30px",
          overflow: "hidden",
        }}
      >
        <iframe
          ref={iframeRef}
          src={`${iframeOrigin}/org/current/drive/BROWSER_CACHE/DiskID_offline-local-browser-cache/FolderID_root-folder-offline-local-browser-cache/`}
          style={{
            width: "100%",
            height: "600px",
            border: "none",
          }}
          onLoad={handleIframeLoad}
        />
      </div>

      {/* Controls & Results */}
      {iframeReady && (
        <div style={{ marginBottom: "30px" }}>
          <h3>Controls & Results</h3>

          {/* Navigation Controls */}
          <div style={{ marginBottom: "30px" }}>
            <h4>Navigation</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "10px",
              }}
            >
              <button
                onClick={() =>
                  navigateIframe(
                    "org/current/drive/BROWSER_CACHE/DiskID_offline-local-browser-cache/FolderID_root-folder-offline-local-browser-cache/"
                  )
                }
                style={{ ...buttonStyle, backgroundColor: "#2196F3" }}
              >
                Go to Files (Storage Drive)
              </button>
              <button
                onClick={() => navigateIframe("org/current/settings")}
                style={{ ...buttonStyle, backgroundColor: "#2196F3" }}
              >
                Go to Settings
              </button>
            </div>
          </div>

          {/* Information Controls */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            {/* About Info Section */}
            <div style={sectionStyle}>
              <button
                onClick={getAboutChildIFrameInstance}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#9C27B0",
                  marginBottom: "15px",
                  width: "100%",
                }}
              >
                Get About Info
              </button>
              <div style={resultBoxStyle}>
                {aboutResponse ? (
                  <div>
                    <h5
                      style={{
                        color: "#495057",
                        marginTop: 0,
                        marginBottom: "10px",
                      }}
                    >
                      About IFrame Instance
                    </h5>
                    <div style={{ fontSize: "12px", color: "#6c757d" }}>
                      <div>
                        <strong style={{ color: "#212529" }}>
                          Organization:
                        </strong>{" "}
                        {aboutResponse.organization_name}
                      </div>
                      <div>
                        <strong style={{ color: "#212529" }}>Org ID:</strong>{" "}
                        {aboutResponse.organization_id}
                      </div>
                      <div>
                        <strong style={{ color: "#212529" }}>Profile:</strong>{" "}
                        {aboutResponse.profile_name}
                      </div>
                      <div>
                        <strong style={{ color: "#212529" }}>
                          Profile ID:
                        </strong>{" "}
                        {aboutResponse.profile_id}
                      </div>
                      {aboutResponse.endpoint && (
                        <div>
                          <strong style={{ color: "#212529" }}>
                            Endpoint:
                          </strong>{" "}
                          {aboutResponse.endpoint}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#6c757d", fontStyle: "italic" }}>
                    Click "Get About Info" to see iframe instance details
                  </div>
                )}
              </div>
            </div>

            {/* Auth Token Section */}
            <div style={sectionStyle}>
              <button
                onClick={getAuthToken}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#FF9800",
                  marginBottom: "15px",
                  width: "100%",
                }}
              >
                Get Auth Token
              </button>
              <div style={resultBoxStyle}>
                {authTokenResponse ? (
                  <div>
                    <h5
                      style={{
                        color: "#495057",
                        marginTop: 0,
                        marginBottom: "10px",
                      }}
                    >
                      Auth Token
                    </h5>
                    <div
                      style={{
                        fontSize: "12px",
                        marginBottom: "10px",
                        color: "#6c757d",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#212529" }}>Org ID:</strong>{" "}
                        {authTokenResponse.organization_id}
                      </div>
                      <div>
                        <strong style={{ color: "#212529" }}>
                          Profile ID:
                        </strong>{" "}
                        {authTokenResponse.profile_id}
                      </div>
                      {authTokenResponse.endpoint && (
                        <div>
                          <strong style={{ color: "#212529" }}>
                            Endpoint:
                          </strong>{" "}
                          {authTokenResponse.endpoint}
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#212529" }}>Token:</strong>
                      <div
                        style={{
                          ...codeStyle,
                          maxHeight: "80px",
                          overflow: "auto",
                          wordBreak: "break-all",
                          fontSize: "10px",
                          marginTop: "5px",
                        }}
                      >
                        {authTokenResponse.auth_token}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          authTokenResponse.auth_token
                        );
                        alert("Auth token copied to clipboard!");
                      }}
                      style={{
                        ...buttonStyle,
                        backgroundColor: "#FF9800",
                        fontSize: "12px",
                        padding: "6px 12px",
                      }}
                    >
                      Copy Token
                    </button>
                  </div>
                ) : (
                  <div style={{ color: "#6c757d", fontStyle: "italic" }}>
                    Click "Get Auth Token" to retrieve authentication token for
                    API calls
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Information */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Debug Info */}
        <div style={cardStyle}>
          <h4 style={{ color: "#495057", marginTop: 0 }}>Debug Info</h4>
          <div
            style={{
              fontSize: "12px",
              fontFamily: "monospace",
              color: "#6c757d",
            }}
          >
            <div>
              <strong style={{ color: "#212529" }}>Origin:</strong>{" "}
              {iframeOrigin}
            </div>
            <div>
              <strong style={{ color: "#212529" }}>Dev Mode:</strong>{" "}
              {LOCAL_DEV_MODE ? "Yes" : "No"}
            </div>
            <div>
              <strong style={{ color: "#212529" }}>Org Secret:</strong>{" "}
              {org_client_secret.current}
            </div>
            <div>
              <strong style={{ color: "#212529" }}>Profile Secret:</strong>{" "}
              {profile_client_secret.current}
            </div>
          </div>
        </div>

        {/* Init Response */}
        <div style={cardStyle}>
          <h4 style={{ color: "#495057", marginTop: 0 }}>Init Response</h4>
          {initResponse ? (
            <pre
              style={{
                ...codeStyle,
                border: initResponse.success
                  ? "2px solid #4CAF50"
                  : "2px solid #f44336",
              }}
            >
              {JSON.stringify(initResponse, null, 2)}
            </pre>
          ) : (
            <div style={{ color: "#6c757d", fontStyle: "italic" }}>
              Initialization response will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable styles
const buttonStyle = {
  padding: "10px 16px",
  cursor: "pointer",
  color: "white",
  border: "none",
  borderRadius: "4px",
  fontSize: "14px",
  fontWeight: "500",
};

const cardStyle = {
  background: "#ffffff",
  padding: "15px",
  borderRadius: "8px",
  border: "1px solid #dee2e6",
  color: "#212529",
};

const sectionStyle = {
  background: "#ffffff",
  padding: "15px",
  borderRadius: "8px",
  border: "1px solid #dee2e6",
};

const resultBoxStyle = {
  background: "#f8f9fa",
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #e9ecef",
  minHeight: "60px",
};

const codeStyle = {
  background: "#f8f9fa",
  padding: "10px",
  borderRadius: "4px",
  fontSize: "11px",
  fontFamily: "monospace",
  color: "#212529",
  margin: 0,
};

export default App;
