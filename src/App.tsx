import { useState, useRef, useEffect, useCallback } from "react";
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
  frontend_domain?: string;
}

// Auth Token response type
interface AuthTokenIFrameResponse {
  organization_id: string;
  profile_id: string;
  endpoint?: string;
  auth_token: string;
}

// Label type definition
interface LabelValue {
  id: string;
  value: string;
}

// REST Command types
interface CreateFileCommand {
  action: "CREATE_FILE";
  payload: {
    name: string;
    file_size?: number;
    expires_at?: number;
    raw_url?: string;
    base64?: string;
    parent_folder_uuid?: string;
  };
}

interface CreateFolderCommand {
  action: "CREATE_FOLDER";
  payload: {
    name: string;
    labels?: LabelValue[];
    expires_at?: number;
    file_conflict_resolution?: string;
    has_sovereign_permissions?: boolean;
    shortcut_to?: string;
    external_id?: string;
    external_payload?: any;
    parent_folder_uuid?: string;
  };
}

// Init config types
interface EphemeralConfig {
  org_client_secret: string;
  profile_client_secret: string;
  org_name: string;
  profile_name: string;
}

interface InjectedConfig {
  host: string;
  org_id: string;
  org_name?: string;
  profile_id: string;
  profile_name?: string;
  api_key_value?: string;
  redirect_to?: string;
}

// Set a global-like variable for development mode
const LOCAL_DEV_MODE = false;
const iframeOrigin = LOCAL_DEV_MODE
  ? "http://localhost:5173"
  : "https://officex.app";

function App() {
  const [iframeReady, setIframeReady] = useState(false);
  const [initResponse, setInitResponse] = useState<any>(null);
  const [aboutResponse, setAboutResponse] =
    useState<AboutChildIFrameInstanceResponse | null>(null);
  const [authTokenResponse, setAuthTokenResponse] =
    useState<AuthTokenIFrameResponse | null>(null);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [showInitModal, setShowInitModal] = useState(false);
  const [showInjectedModal, setShowInjectedModal] = useState(false);
  const [injectedConfigJson, setInjectedConfigJson] = useState("");
  const [currentInitMode, setCurrentInitMode] = useState<
    "ephemeral" | "injected" | "grant-existing" | null
  >(null);
  const [grantExistingTracer, setGrantExistingTracer] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // File creation state
  const [fileSize] = useState(1024);
  const [rawUrl, setRawUrl] = useState("https://bitcoin.org/bitcoin.pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileParentFolderId, setFileParentFolderId] = useState("");

  // Folder creation state
  const [folderName, setFolderName] = useState("My New Folder");
  const [folderLabels] = useState<LabelValue[]>([]);
  const [hasSovereignPermissions] = useState(false);
  const [folderParentFolderId, setFolderParentFolderId] = useState("");

  // Command results state
  const [lastCommandResult, setLastCommandResult] = useState<any>(null);
  const [lastFileResult, setLastFileResult] = useState<any>(null);
  const [lastFolderResult, setLastFolderResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique seeds for this session - persist these across refreshes
  const org_client_secret = useRef(`org-123abc`);
  const profile_client_secret = useRef(`profile-123xyz`);

  // Default configurations
  const defaultEphemeralConfig: EphemeralConfig = {
    org_client_secret: org_client_secret.current,
    profile_client_secret: profile_client_secret.current,
    org_name: "Demo Org",
    profile_name: "Demo Profile",
  };

  const defaultInjectedConfig: InjectedConfig = {
    host: "https://dzmre-qqaaa-aaaak-apdsa-cai.icp0.io",
    org_id: "DriveID_dzmre-qqaaa-aaaak-apdsa-cai",
    org_name: "Sponsored Org",
    profile_id:
      "UserID_7j2m5-n4wqc-5p5b6-3u7fz-z7j3a-qg77q-mi742-mpped-m7sdq-xpf2x-qae",
    profile_name: "Sponsored Profile",
    api_key_value: "", // only provide apiKey if you are subsidizing for users
    redirect_to: "org/current/settings", // optional, default is the drive path
  };

  // Initialize default injected config JSON
  useEffect(() => {
    setInjectedConfigJson(JSON.stringify(defaultInjectedConfig, null, 2));
  }, []);

  // Check URL params on page load for grant-existing callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiKeyValue = urlParams.get("api_key_value");
    const profileId = urlParams.get("profile_id");
    const orgId = urlParams.get("org_id");
    const endpoint = urlParams.get("endpoint");
    const tracer = urlParams.get("tracer");

    if (apiKeyValue && profileId && orgId) {
      // We received credentials back from the grant-agentic-key page
      const credentials = {
        api_key_value: apiKeyValue,
        profile_id: profileId,
        org_id: orgId,
        endpoint: endpoint || "",
        tracer: tracer || "",
      };

      alert(
        `Grant Existing Key Successful!\n\n` +
          `API Key Value: ${credentials.api_key_value}\n` +
          `Organization ID: ${credentials.org_id}\n` +
          `Profile ID: ${credentials.profile_id}\n` +
          `Endpoint: ${credentials.endpoint}\n` +
          `Tracer: ${credentials.tracer}`
      );

      // Now initialize the iframe with these credentials
      const injectedConfig: InjectedConfig = {
        host: credentials.endpoint,
        org_id: credentials.org_id,
        org_name: "Granted Org",
        profile_id: credentials.profile_id,
        profile_name: "Granted Profile",
        api_key_value: credentials.api_key_value,
      };

      // Clear the URL params
      window.history.replaceState({}, document.title, window.location.pathname);

      // Initialize with the granted credentials
      setTimeout(() => {
        setCurrentInitMode("grant-existing");
        setInitializationAttempts((prev) => prev + 1);
        const initData = { injected: injectedConfig };
        sendMessageToIframe(
          "officex-init",
          initData,
          "init-grant-existing-" + Date.now()
        );
      }, 1000);
    }
  }, []);

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

  // Initialize iframe with ephemeral config
  const initializeEphemeral = useCallback(() => {
    console.log("Initializing iframe with ephemeral config...");
    setInitializationAttempts((prev) => prev + 1);
    setCurrentInitMode("ephemeral");
    const initData = { ephemeral: defaultEphemeralConfig };
    sendMessageToIframe(
      "officex-init",
      initData,
      "init-ephemeral-" + Date.now()
    );
    setShowInitModal(false);
  }, [sendMessageToIframe, defaultEphemeralConfig]);

  // Initialize iframe with injected config
  const initializeInjected = useCallback(() => {
    try {
      const parsedConfig = JSON.parse(injectedConfigJson);
      console.log("Initializing iframe with injected config...");
      setInitializationAttempts((prev) => prev + 1);
      setCurrentInitMode("injected");
      const initData = { injected: parsedConfig };
      sendMessageToIframe(
        "officex-init",
        initData,
        "init-injected-" + Date.now()
      );
      setShowInjectedModal(false);
    } catch (error) {
      alert("Invalid JSON format. Please check your configuration.");
      console.error("JSON parse error:", error);
    }
  }, [injectedConfigJson, sendMessageToIframe]);

  // Open grant-agentic-key page in new tab
  const initializeGrantExisting = useCallback(() => {
    const tracer = grantExistingTracer || `grant-${Date.now()}`;
    const redirectUrl = window.location.origin;
    const encodedRedirectUrl = encodeURIComponent(redirectUrl);
    const grantUrl = `${iframeOrigin}/org/current/grant-agentic-key?tracer=${tracer}&redirect_url=${encodedRedirectUrl}`;

    console.log("Opening grant-agentic-key page:", grantUrl);
    window.open(grantUrl, "_blank");
    setShowInitModal(false);
  }, [grantExistingTracer]);

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

  // Create file from URL
  const createFileCommand = useCallback(() => {
    if (!iframeReady) {
      console.warn("Cannot create file: iframe not ready");
      return;
    }

    const urlFileName = rawUrl.split("/").pop() || "downloaded-file";

    const command: CreateFileCommand = {
      action: "CREATE_FILE",
      payload: {
        name: urlFileName,
        file_size: fileSize,
        raw_url: rawUrl,
        parent_folder_uuid: fileParentFolderId || undefined,
      },
    };

    sendMessageToIframe(
      "officex-rest-command",
      command,
      "create-file-" + Date.now()
    );
  }, [iframeReady, fileSize, rawUrl, fileParentFolderId, sendMessageToIframe]);

  // Create file with data
  const createFileWithData = useCallback(async () => {
    if (!iframeReady || !selectedFile) {
      console.warn("Cannot create file: iframe not ready or no file selected");
      return;
    }

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const command: CreateFileCommand = {
        action: "CREATE_FILE",
        payload: {
          name: selectedFile.name,
          file_size: selectedFile.size,
          raw_url: "",
          base64: base64Data,
          parent_folder_uuid: fileParentFolderId || undefined,
        },
      };

      sendMessageToIframe(
        "officex-rest-command",
        command,
        "create-file-data-" + Date.now()
      );
    } catch (error) {
      console.error("Failed to convert file to base64:", error);
    }
  }, [iframeReady, selectedFile, fileParentFolderId, sendMessageToIframe]);

  // Create folder
  const createFolderCommand = useCallback(() => {
    if (!iframeReady) {
      console.warn("Cannot create folder: iframe not ready");
      return;
    }

    const command: CreateFolderCommand = {
      action: "CREATE_FOLDER",
      payload: {
        name: folderName,
        labels: folderLabels,
        has_sovereign_permissions: hasSovereignPermissions,
        parent_folder_uuid: folderParentFolderId || undefined,
      },
    };

    sendMessageToIframe(
      "officex-rest-command",
      command,
      "create-folder-" + Date.now()
    );
  }, [
    iframeReady,
    folderName,
    folderLabels,
    hasSovereignPermissions,
    folderParentFolderId,
    sendMessageToIframe,
  ]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const maxSize = 50 * 1024 * 1024; // 50MB in bytes
        if (file.size > maxSize) {
          alert(
            `File size (${(file.size / 1024 / 1024).toFixed(
              2
            )}MB) exceeds the 50MB limit. Please select a smaller file.`
          );
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setSelectedFile(null);
          return;
        }
        setSelectedFile(file);
      }
    },
    []
  );

  // Handle iframe load event
  const handleIframeLoad = useCallback(() => {
    const now = new Date();
    console.log("IFrame loaded/refreshed at:", now.toISOString());

    // Check if we're returning from grant-existing flow
    const urlParams = new URLSearchParams(window.location.search);
    const hasGrantParams = urlParams.has("api_key_value");

    if (!hasGrantParams) {
      // Normal load - show init modal
      setIframeReady(false);
      setInitResponse(null);
      setAboutResponse(null);
      setAuthTokenResponse(null);
      setLastRefreshTime(now);
      setCurrentInitMode(null);

      // Show init modal after iframe loads
      setTimeout(() => {
        setShowInitModal(true);
      }, 100);
    }
  }, []);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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

        case "officex-rest-command-response":
          console.log("REST command response:", data);
          setLastCommandResult(data);
          if (data.success) {
            console.log("REST command successful:", data.data);
            if (data.data.message?.includes("Folder")) {
              setLastFolderResult(data.data);
            } else if (data.data.message?.includes("File")) {
              setLastFileResult(data.data);
            }
          } else {
            console.error("REST command failed:", data.error);
            if (data.error?.includes("folder")) {
              setLastFolderResult({ error: data.error });
            } else {
              setLastFileResult({ error: data.error });
            }
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
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1>OfficeX IFrame Integration Demo</h1>
      </div>
      <a
        href="https://github.com/OfficeXApp/iframe-demo"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "white" }}
      >
        <p>View on GitHub</p>
      </a>

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
          <strong> Mode:</strong> {currentInitMode || "None"} |
          <strong> Attempts:</strong> {initializationAttempts} |
          {lastRefreshTime && (
            <span>
              <strong> Last Load:</strong>{" "}
              {lastRefreshTime.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowInitModal(true)}
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
            height: "800px",
            border: "none",
          }}
          sandbox="allow-same-origin allow-scripts allow-downloads allow-popups"
          allow="clipboard-read; clipboard-write"
          onLoad={handleIframeLoad}
        />
      </div>

      {/* Init Modal */}
      {showInitModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              maxWidth: "600px",
              width: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
              Choose Initialization Mode
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ color: "#666", marginBottom: "15px" }}>
                Select how you want to initialize the OfficeX iframe:
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "20px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={initializeEphemeral}
                style={{
                  flex: 1,
                  minWidth: "150px",
                  padding: "15px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Ephemeral Mode
              </button>

              <button
                onClick={() => {
                  setShowInitModal(false);
                  setShowInjectedModal(true);
                }}
                style={{
                  flex: 1,
                  minWidth: "150px",
                  padding: "15px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Injected Mode
              </button>

              <button
                onClick={initializeGrantExisting}
                style={{
                  flex: 1,
                  minWidth: "150px",
                  padding: "15px",
                  backgroundColor: "#9C27B0",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Grant Existing
              </button>
            </div>

            {/* Tracer input for Grant Existing */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                Tracer ID (optional, for Grant Existing):
              </label>
              <input
                type="text"
                placeholder="e.g., abc123"
                value={grantExistingTracer}
                onChange={(e) => setGrantExistingTracer(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ fontSize: "14px", color: "#666" }}>
              <p style={{ marginBottom: "10px" }}>
                <strong>Ephemeral Mode:</strong> Creates a new organization and
                profile using deterministic seeds.
              </p>
              <p style={{ marginBottom: "10px" }}>
                <strong>Injected Mode:</strong> Uses pre-existing organization
                and profile IDs with optional API key.
              </p>
              <p>
                <strong>Grant Existing:</strong> Opens OfficeX in a new tab to
                grant access to an existing API key, then returns here with
                credentials.
              </p>
            </div>

            <button
              onClick={() => setShowInitModal(false)}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Injected Config Modal */}
      {showInjectedModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
              Injected Configuration
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ color: "#666", marginBottom: "15px" }}>
                Edit the JSON configuration below to inject your own
                organization and profile settings:
              </p>
            </div>

            <textarea
              value={injectedConfigJson}
              onChange={(e) => setInjectedConfigJson(e.target.value)}
              style={{
                width: "100%",
                height: "300px",
                padding: "10px",
                fontFamily: "monospace",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                marginBottom: "20px",
              }}
            />

            <div
              style={{ fontSize: "12px", color: "#666", marginBottom: "20px" }}
            >
              <p>
                <strong>Note:</strong>
              </p>
              <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                <li>
                  api_key_value is only required if creating a new profile
                </li>
                <li>redirect_to is optional (defaults to drive path)</li>
                <li>Leave api_key_value empty if the profile already exists</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={initializeInjected}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Initialize with Injected Config
              </button>

              <button
                onClick={() => {
                  setShowInjectedModal(false);
                  setShowInitModal(true);
                }}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls & Results - Rest of the component remains the same */}
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
                      {aboutResponse.frontend_domain && (
                        <div>
                          <strong style={{ color: "#212529" }}>
                            Frontend Domain:
                          </strong>{" "}
                          {aboutResponse.frontend_domain}
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

      {/* REST Commands Section */}
      <div style={{ marginBottom: "30px" }}>
        <h4>REST Commands</h4>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          {/* Create File Commands */}
          <div style={sectionStyle}>
            <h5>Create File Commands</h5>

            {/* Optional Parent Folder ID for Files */}
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                Parent Folder ID (Optional):
              </label>
              <input
                type="text"
                placeholder="Leave empty for root folder"
                value={fileParentFolderId}
                onChange={(e) => setFileParentFolderId(e.target.value)}
                style={{ ...inputStyle, fontSize: "12px" }}
              />
              <div
                style={{ fontSize: "10px", color: "#6c757d", marginTop: "3px" }}
              >
                If empty, files will be created in the root folder
              </div>
            </div>

            {/* Create File with URL */}
            <div style={{ marginBottom: "20px" }}>
              <h6>Create File from URL</h6>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "10px",
                  marginBottom: "15px",
                }}
              >
                <input
                  type="url"
                  placeholder="Raw URL"
                  value={rawUrl}
                  onChange={(e) => setRawUrl(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <button
                onClick={createFileCommand}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#4CAF50",
                  width: "100%",
                }}
              >
                Create File from URL
              </button>
            </div>

            {/* Create File with Data */}
            <div>
              <h6>Create File from Local Data</h6>
              <div style={{ marginBottom: "15px" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  style={{ marginBottom: "10px" }}
                  accept="*/*"
                />
                <div
                  style={{
                    fontSize: "11px",
                    color: "#6c757d",
                    marginBottom: "5px",
                  }}
                >
                  Maximum file size: 50MB
                </div>
                {selectedFile && (
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    Selected: {selectedFile.name} (
                    {(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                    <div style={{ color: "#28a745", fontSize: "10px" }}>
                      ✅ Within 50MB limit
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={createFileWithData}
                disabled={!selectedFile}
                style={{
                  ...buttonStyle,
                  backgroundColor: selectedFile ? "#FF9800" : "#ccc",
                  width: "100%",
                  cursor: selectedFile ? "pointer" : "not-allowed",
                }}
              >
                Create File from Data
              </button>
            </div>

            {/* File Creation Result */}
            {lastFileResult && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "10px",
                  borderRadius: "6px",
                  backgroundColor: lastFileResult.error ? "#fee" : "#efe",
                  border: `1px solid ${lastFileResult.error ? "#fcc" : "#cfc"}`,
                  fontSize: "12px",
                }}
              >
                {lastFileResult.error ? (
                  <div style={{ color: "#d32f2f" }}>
                    <strong>❌ Error:</strong> {lastFileResult.error}
                  </div>
                ) : (
                  <div style={{ color: "#2e7d32" }}>
                    <div>
                      <strong>✅ File Created Successfully!</strong>
                    </div>
                    <div>
                      <strong>Name:</strong> {lastFileResult.name}
                    </div>
                    <div>
                      <strong>File ID:</strong> {lastFileResult.fileID}
                    </div>
                    <div>
                      <strong>Parent Folder:</strong>{" "}
                      {lastFileResult.parentFolderID}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Create Folder Commands */}
          <div style={sectionStyle}>
            <h5>Create Folder Commands</h5>

            {/* Optional Parent Folder ID for Folders */}
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                Parent Folder ID (Optional):
              </label>
              <input
                type="text"
                placeholder="Leave empty for root folder"
                value={folderParentFolderId}
                onChange={(e) => setFolderParentFolderId(e.target.value)}
                style={{ ...inputStyle, fontSize: "12px" }}
              />
              <div
                style={{ fontSize: "10px", color: "#6c757d", marginTop: "3px" }}
              >
                If empty, folder will be created in the root folder
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                }}
              >
                Folder Name:
              </label>
              <input
                type="text"
                placeholder="Enter folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <button
              onClick={createFolderCommand}
              disabled={!folderName.trim()}
              style={{
                ...buttonStyle,
                backgroundColor: folderName.trim() ? "#9C27B0" : "#ccc",
                width: "100%",
                cursor: folderName.trim() ? "pointer" : "not-allowed",
              }}
            >
              Create Folder
            </button>

            {/* Folder Creation Result */}
            {lastFolderResult && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "10px",
                  borderRadius: "6px",
                  backgroundColor: lastFolderResult.error ? "#fee" : "#efe",
                  border: `1px solid ${
                    lastFolderResult.error ? "#fcc" : "#cfc"
                  }`,
                  fontSize: "12px",
                }}
              >
                {lastFolderResult.error ? (
                  <div style={{ color: "#d32f2f" }}>
                    <strong>❌ Error:</strong> {lastFolderResult.error}
                  </div>
                ) : (
                  <div style={{ color: "#2e7d32" }}>
                    <div>
                      <strong>✅ Folder Created Successfully!</strong>
                    </div>
                    <div>
                      <strong>Name:</strong> {lastFolderResult.name}
                    </div>
                    <div>
                      <strong>Folder ID:</strong> {lastFolderResult.folderID}
                    </div>
                    <div>
                      <strong>Parent Folder:</strong>{" "}
                      {lastFolderResult.parentFolderID}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
              <strong style={{ color: "#212529" }}>Init Mode:</strong>{" "}
              {currentInitMode || "None"}
            </div>
            {currentInitMode === "ephemeral" && (
              <>
                <div>
                  <strong style={{ color: "#212529" }}>Org Secret:</strong>{" "}
                  {org_client_secret.current}
                </div>
                <div>
                  <strong style={{ color: "#212529" }}>Profile Secret:</strong>{" "}
                  {profile_client_secret.current}
                </div>
              </>
            )}
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

        {/* Last Command Result */}
        <div style={cardStyle}>
          <h4 style={{ color: "#495057", marginTop: 0 }}>
            Last Command Result
          </h4>
          {lastCommandResult ? (
            <div>
              {lastCommandResult.success ? (
                <div style={{ color: "#28a745", marginBottom: "10px" }}>
                  ✅ <strong>Success!</strong>
                </div>
              ) : (
                <div style={{ color: "#dc3545", marginBottom: "10px" }}>
                  ❌ <strong>Failed</strong>
                </div>
              )}
              <pre
                style={{
                  ...codeStyle,
                  border: lastCommandResult.success
                    ? "2px solid #4CAF50"
                    : "2px solid #f44336",
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(lastCommandResult, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ color: "#6c757d", fontStyle: "italic" }}>
              REST command results will appear here. Success/error alerts will
              also appear for completed commands.
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
  color: "black",
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

const inputStyle = {
  padding: "8px 12px",
  border: "1px solid #ddd",
  borderRadius: "4px",
  fontSize: "14px",
  width: "100%",
};

export default App;
