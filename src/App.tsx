import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import {
  IFrameCommandType,
  type IFrameCommand,
  type IFrameCommandReq_CreateFile,
  type IFrameCommandReq_CreateFolder,
  type IFrameCommandRes_About,
  type IFrameCommandRes_AuthToken,
  type IFrameCommandResult,
  type IFrameEphemeralConfig,
  type IFrameInjectedConfig,
} from "@officexapp/types";

// Init config types
// Set a global-like variable for development mode
const LOCAL_DEV_MODE = false;
const iframeOrigin = LOCAL_DEV_MODE
  ? "http://localhost:5173"
  : "https://officex.app";

function App() {
  const [iframeReady, setIframeReady] = useState(false);
  const [initResponse, setInitResponse] = useState<any>(null);
  const [aboutResponse, setAboutResponse] =
    useState<IFrameCommandRes_About | null>(null);
  const [authTokenResponse, setAuthTokenResponse] =
    useState<IFrameCommandRes_AuthToken | null>(null);
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
  const [navigationRoute, setNavigationRoute] = useState<string>(
    "/org/current/welcome"
  );

  // File creation state
  const [fileSize] = useState(1024);
  const [rawUrl, setRawUrl] = useState("https://bitcoin.org/bitcoin.pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileParentFolderId, setFileParentFolderId] = useState("");

  // Folder creation state
  const [folderName, setFolderName] = useState("My New Folder");
  const [folderLabels] = useState<string[]>([]);
  const [hasSovereignPermissions] = useState(false);
  const [folderParentFolderId, setFolderParentFolderId] = useState("");

  // Command results state
  const [lastCommandResult, setLastCommandResult] = useState<any>(null);
  const [lastFileResult, setLastFileResult] = useState<any>(null);
  const [lastFolderResult, setLastFolderResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique seeds for this session - persist these across refreshes
  const org_entropy = useRef(`org_123abc`);
  const profile_entropy = useRef(`user_123_xyz`);

  // Default configurations
  const defaultEphemeralConfig: IFrameEphemeralConfig = {
    org_entropy: org_entropy.current,
    profile_entropy: profile_entropy.current,
    org_name: "Demo Org",
    profile_name: "Demo Profile",
  };

  const defaultInjectedConfig: IFrameInjectedConfig = {
    host: "https://officex.otterpad.cc",
    drive_id:
      "DriveID_sl2pa-g7ejf-ahwxr-flqz3-2szt4-34thc-tcw5n-jncrp-zpt4j-5c5wk-vqe",
    org_name: "Actual Real Org",
    user_id:
      "UserID_fz3np-hc2vm-kalep-yrtgj-fcg5p-5iae7-edoka-z2rjj-4cgbr-xjl4d-gqe",
    profile_name: "Anon",
    api_key_value:
      "eyJhdXRoX3R5cGUiOiJBUElfS0VZIiwidmFsdWUiOiIwZjQ2YTUzZWM4MTU3NzkxNjhkNmRlZmY5ZWQ1ZjYzZTg3MDBiODMwYzMyNzgwZmM0OTJmZjg4YjNmNjY0NTY4In0=", // only provide apiKey if you are subsidizing for users
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
    const profileId = urlParams.get("user_id");
    const orgId = urlParams.get("drive_id");
    const host = urlParams.get("host");
    const tracer = urlParams.get("tracer");

    if (apiKeyValue && profileId && orgId) {
      // We received credentials back from the grant-agentic-key page
      const credentials = {
        api_key_value: apiKeyValue,
        user_id: profileId,
        drive_id: orgId,
        host: host || "",
        tracer: tracer || "",
      };

      alert(
        `Grant Existing Key Successful!\n\n` +
          `Api Key Value: ${credentials.api_key_value}\n` +
          `Drive ID: ${credentials.drive_id}\n` +
          `User ID: ${credentials.user_id}\n` +
          `Host: ${credentials.host}\n` +
          `Tracer: ${credentials.tracer}`
      );

      // Now initialize the iframe with these credentials
      const injectedConfig: IFrameInjectedConfig = {
        host: credentials.host,
        drive_id: credentials.drive_id,
        org_name: "Granted Org",
        user_id: credentials.user_id,
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
          IFrameCommandType.INIT,
          initData,
          "init-grant-existing-" + Date.now()
        );
      }, 1000);
    }
  }, []);

  // Send message to iframe
  const sendMessageToIframe = useCallback(
    (type: IFrameCommandType, data: any, tracer?: string) => {
      if (!iframeRef.current?.contentWindow) {
        console.warn("IFrame not ready");
        return;
      }

      const message: IFrameCommand = {
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
      IFrameCommandType.INIT,
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
        IFrameCommandType.INIT,
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
      sendMessageToIframe(
        IFrameCommandType.NAVIGATE,
        { route },
        "nav-" + Date.now()
      );
    },
    [iframeReady, sendMessageToIframe]
  );

  // Get information about the current iframe instance
  const getAboutChildIFrameInstance = useCallback(() => {
    if (!iframeReady) {
      console.warn("Cannot get about info: iframe not ready");
      return;
    }
    sendMessageToIframe(IFrameCommandType.ABOUT, {}, "about-" + Date.now());
  }, [iframeReady, sendMessageToIframe]);

  // Get auth token from iframe
  const getAuthToken = useCallback(() => {
    if (!iframeReady) {
      console.warn("Cannot get auth token: iframe not ready");
      return;
    }
    sendMessageToIframe(
      IFrameCommandType.AUTH_TOKEN,
      {},
      "auth-token-" + Date.now()
    );
  }, [iframeReady, sendMessageToIframe]);

  // Create file from URL
  const createFileCommand = useCallback(() => {
    if (!iframeReady) {
      console.warn("Cannot create file: iframe not ready");
      return;
    }

    const urlFileName = rawUrl.split("/").pop() || "downloaded-file";

    const command: IFrameCommandReq_CreateFile = {
      action: "CREATE_FILE",
      payload: {
        name: urlFileName,
        file_size: fileSize,
        raw_url: rawUrl,
        parent_folder_uuid: fileParentFolderId || undefined,
      },
    };

    sendMessageToIframe(
      IFrameCommandType.DIRECTORY_ACTION,
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

      const command: IFrameCommandReq_CreateFile = {
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
        IFrameCommandType.DIRECTORY_ACTION,
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

    const command: IFrameCommandReq_CreateFolder = {
      action: "CREATE_FOLDER",
      payload: {
        name: folderName,
        labels: folderLabels,
        has_sovereign_permissions: hasSovereignPermissions,
        parent_folder_uuid: folderParentFolderId || undefined,
      },
    };

    sendMessageToIframe(
      IFrameCommandType.DIRECTORY_ACTION,
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
      console.log("Normal load - show init modal");

      setInitResponse(null);
      setAboutResponse(null);
      setAuthTokenResponse(null);
      setLastRefreshTime(now);
      setCurrentInitMode(null);

      // Show init modal after iframe loads
      // setTimeout(() => {
      //   setShowInitModal(true);
      // }, 100);
    }
  }, []);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!LOCAL_DEV_MODE && event.origin !== iframeOrigin) {
        console.warn("Received message from unknown origin:", event.origin);
        return;
      }

      const { type, data, tracer, success, error }: IFrameCommandResult =
        event.data;
      console.log("Received message from child iframe:", {
        type,
        data,
        tracer,
      });

      switch (type) {
        case IFrameCommandType.INIT:
          if (success) {
            setIframeReady(true);
            setInitResponse(data);
            console.log("IFrame initialized successfully:", data);
          } else {
            setIframeReady(false);
            setInitResponse(data);
            console.error("IFrame initialization failed:", error);
          }
          break;

        case IFrameCommandType.NAVIGATE:
          if (success) {
            console.log("Navigation successful:", data.route);
          } else {
            console.error("Navigation failed:", error);
          }
          break;

        case IFrameCommandType.ABOUT:
          if (success) {
            setAboutResponse(data);
            console.log("About Child IFrame Instance successful:", data);
          } else {
            setAboutResponse(null);
            console.error("About Child IFrame Instance failed:", error);
          }
          break;

        case IFrameCommandType.AUTH_TOKEN:
          if (success) {
            setAuthTokenResponse(data);
            console.log("Auth token received successfully:", data);
          } else {
            setAuthTokenResponse(null);
            console.error("Auth token request failed:", error);
          }
          break;

        case IFrameCommandType.DIRECTORY_ACTION:
          console.log("REST command response:", data);
          setLastCommandResult(data);
          if (success) {
            console.log("REST command successful:", data);
            if (data.message?.includes("Folder")) {
              setLastFolderResult(data);
            } else if (data.message?.includes("File")) {
              setLastFileResult(data);
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

        case IFrameCommandType.HEARTBEAT:
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

      {/* Ephemeral IFrame Code Snippet */}
      <div className="code-container">
        <div className="code-header">
          <h3>Easy 2 min iFrame</h3>
          <button
            className="copy-button"
            onClick={() => {
              const codeElement = document.getElementById(
                "ephemeral-code-snippet"
              ) as HTMLTextAreaElement;
              if (codeElement) {
                navigator.clipboard.writeText(codeElement.value);
                alert("Code copied to clipboard! ✅");
              }
            }}
          >
            Copy Code
          </button>
        </div>
        <textarea
          id="ephemeral-code-snippet"
          className="code-textarea"
          readOnly
          value={`<div>
  <iframe
    id="officex-iframe"
    src="https://officex.app/org/current/drive/BROWSER_CACHE/DiskID_offline-local-browser-cache/FolderID_root-folder-offline-local-browser-cache/"
    sandbox="allow-same-origin allow-scripts allow-downloads allow-popups"
  ></iframe>
  <script>
    const iframeElement = document.getElementById("officex-iframe");

    iframeElement.onload = () => {
      const ephemeralConfig = {
        org_entropy: "____",
        profile_entropy: "____",
        org_name: "Offline Org",
        profile_name: "Anon",
      };

      const initData = { ephemeral: ephemeralConfig };

      iframeElement.contentWindow.postMessage(
        {
          type: "officex-init",
          data: initData,
          tracer: \`init-ephemeral-\${Date.now()}\`,
        },
        "https://officex.app"
      );
    };
  </script>
</div>`}
        />
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
                organization and profile settings. Get your AUTH JSON from your
                officex.app settings page{" "}
                <a
                  href="https://officex.app/org/current/settings"
                  target="_blank"
                >
                  "copy iframe code" button here.
                </a>
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
      <div style={{ marginTop: "12px", width: "100%", marginBottom: "100px" }}>
        <details>
          <summary>iFrame Controls</summary>
          {/* Controls & Results - Rest of the component remains the same */}
          {iframeReady && (
            <div style={{ marginBottom: "30px" }}>
              <h3>Controls & Results</h3>

              {/* Navigation Controls */}
              <div style={{ marginBottom: "30px" }}>
                <h4>Navigation</h4>
                <div style={{ margin: 16 }}>
                  <input
                    type="text"
                    placeholder="Enter route"
                    value={navigationRoute}
                    onChange={(e) => setNavigationRoute(e.target.value)}
                  />
                  <button
                    onClick={() => navigateIframe(navigationRoute)}
                    style={{ padding: "8px", fontSize: "0.9rem" }}
                  >
                    Navigate
                  </button>
                </div>
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
                        "/org/current/drive/BROWSER_CACHE/DiskID_offline-local-browser-cache/FolderID_root-folder-offline-local-browser-cache/"
                      )
                    }
                    style={{ ...buttonStyle, backgroundColor: "#2196F3" }}
                  >
                    Go to Files (Storage Drive)
                  </button>
                  <button
                    onClick={() => navigateIframe("/org/current/settings")}
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
                            {aboutResponse.org_name}
                          </div>
                          <div>
                            <strong style={{ color: "#212529" }}>
                              Org ID:
                            </strong>{" "}
                            {aboutResponse.drive_id}
                          </div>
                          <div>
                            <strong style={{ color: "#212529" }}>
                              Profile:
                            </strong>{" "}
                            {aboutResponse.profile_name}
                          </div>
                          <div>
                            <strong style={{ color: "#212529" }}>
                              Profile ID:
                            </strong>{" "}
                            {aboutResponse.user_id}
                          </div>
                          {aboutResponse.host && (
                            <div>
                              <strong style={{ color: "#212529" }}>
                                Host:
                              </strong>{" "}
                              {aboutResponse.host}
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
                          {aboutResponse.frontend_domain && (
                            <div>
                              <strong style={{ color: "#212529" }}>
                                Frontend Url:
                              </strong>{" "}
                              {aboutResponse.frontend_url}
                            </div>
                          )}
                          {aboutResponse.frontend_domain && (
                            <div>
                              <strong style={{ color: "#212529" }}>
                                Current URL:
                              </strong>{" "}
                              {aboutResponse.current_url}
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
                            <strong style={{ color: "#212529" }}>
                              Org ID:
                            </strong>{" "}
                            {authTokenResponse.drive_id}
                          </div>
                          <div>
                            <strong style={{ color: "#212529" }}>
                              Profile ID:
                            </strong>{" "}
                            {authTokenResponse.user_id}
                          </div>
                          {authTokenResponse.host && (
                            <div>
                              <strong style={{ color: "#212529" }}>
                                Endpoint:
                              </strong>{" "}
                              {authTokenResponse.host}
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
                        Click "Get Auth Token" to retrieve authentication token
                        for API calls
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Directory Commands Section */}
          <div style={{ marginBottom: "30px" }}>
            <h4>Directory Commands</h4>

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
                    style={{
                      fontSize: "10px",
                      color: "#6c757d",
                      marginTop: "3px",
                    }}
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
                      border: `1px solid ${
                        lastFileResult.error ? "#fcc" : "#cfc"
                      }`,
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
                    style={{
                      fontSize: "10px",
                      color: "#6c757d",
                      marginTop: "3px",
                    }}
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
                          <strong>Folder ID:</strong>{" "}
                          {lastFolderResult.folderID}
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
                      {org_entropy.current}
                    </div>
                    <div>
                      <strong style={{ color: "#212529" }}>
                        Profile Secret:
                      </strong>{" "}
                      {profile_entropy.current}
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
                  <pre
                    style={{
                      ...codeStyle,
                      maxHeight: "200px",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(lastCommandResult, null, 2)}
                  </pre>
                </div>
              ) : (
                <div style={{ color: "#6c757d", fontStyle: "italic" }}>
                  Directory command results will appear here. Success/error
                  alerts will also appear for completed commands.
                </div>
              )}
            </div>
          </div>
        </details>
      </div>
      <br />
      <br />
      <br />
      <div style={{ marginTop: "64px", width: "100%", marginBottom: "100px" }}>
        <h2>Examples Appendix</h2>
        <p>Popular Use Cases and examples with code snippets</p>
        <br />
        <details>
          <summary>View Common Patterns</summary>

          <section style={{ textAlign: "left" }}>
            <p>There are 3 main ways to use the OfficeX iFrame: </p>

            <ol>
              <li>Ephemeral Offline Mode</li>
              <li>Managed Cloud (aka Injected Auth)</li>
              <li>Grant Existing</li>
            </ol>

            <p>Each serve their own use cases.</p>

            <ol>
              <li>
                Ephemeral Offline Mode: Use this when you want to give your
                users a file management UI without code. Pure clientside, with
                offline capabilities and free cloud. Easy to integrate in 2
                mins. Ideal for ephemeral single use tools such as YouTube
                downloaders & temporary AI agents. Users can still easily
                connect to free cloud themselves by clicking around in the
                iframe.
              </li>
              <li>
                {" "}
                Injected Cloud: Use this when you want to provide your users a
                whitelabel OfficeX experience with cloud capabilities. You can
                self-host the backend yourself, or use OfficeX's free cloud. You
                would create orgs & profiles on behalf of your users, and own
                their API keys. Ideal for deep product integrations where you
                want to use OfficeX as a building block within your
                app/ecosystem.
              </li>
              <li>
                Grant Existing: Use this when you want users to bring their own
                OfficeX workspace, and your app simply connects to it. This is
                ideal for lightweight integrations such as AI Agents, chrome
                extensions, 3rd party apps, etc. You can still use this method
                to render in an iframe, or use via REST API.
              </li>
            </ol>
          </section>
        </details>
        <br />
        <table className="examples-table">
          <thead>
            <tr>
              <th>Use Case</th>
              <th>Description</th>
              <th>Recommended Pattern</th>
              <th>GitHub Example</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLES.map((example, index) => (
              <tr key={index}>
                <td>{example.title}</td>
                <td>{example.description}</td>
                <td>{example.pattern}</td>
                <td>
                  <a
                    href={example.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Github Example
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* <br />
      <br />
      <br />
      <div style={{ marginTop: "64px", width: "100%", marginBottom: "100px" }}>
        <h2>Embed Spreadsheet</h2>
        <p>Share public views of OfficeX files, eg. spreadsheets</p>
        <br />
        <iframe
          src="https://officex.app/org/DriveID_4lpy3-m5gb2-2ok44-na4np-o3iyk-kxngj-tuo6z-hcjaz-aujfy-5bbza-xae__aHR0cHM6Ly9vZmZpY2V4Lm90dGVycGFkLmNj/drive/AWS_BUCKET/DiskID_e6d790e5-4daa-4a10-9cc3-f16db261f2a6/FolderID_7169bfbe-c5e3-4c56-8c66-7193c44ffcad/FileID_b2e3d5d9-4c82-4db5-ac18-a4f4361bd3a5/apps/sheets"
          style={{
            width: "100%",
            height: "700px",
            border: "0",
            borderRadius: "4px",
            overflow: "hidden",
          }}
          title="bulk-scripting-officex"
          allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        ></iframe>
      </div> */}
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

const EXAMPLES = [
  {
    title: "Anonymous iframe",
    description:
      "Give your users a file management UI without code. Pure clientside, with offline capabilities and free cloud. Easy to integrate in 2 mins. Ideal for quick prototypes or adding basic file features to any website without a backend.",
    pattern: "Ephemeral Offline Mode",
    github:
      "https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md",
  },
  {
    title: "Single Use Tools",
    description: `Eg. YouTube downloaders, PDF generators, file converters...etc. Give your users a clean, robust clientside UI for file management & offline storage. Perfect for tools that need to process files securely and locally without a user account.`,
    pattern: "Grant Existing / Ephemeral Offline Mode",
    github:
      "https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md",
  },
  {
    title: "Community Platforms",
    description:
      "Eg. Competitors to Discord, Reddit, Farcaster, etc. Give your communities a full digital storage experience without leaving your platform. Community files and folders, permissions to users & groups, clean modern UI. Full developer REST API available, 100% open source self-hostable, whitelabel.",
    pattern: "Managed Cloud",
    github:
      "https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md",
  },
  {
    title: "Workplace Tools",
    description:
      "Eg. Competitors to Adobe, Upwork, Zapier, Protonmail, CRMs, etc. Give your professionals a full digital storage experience without leaving your platform. Integrate file management, version control, and collaboration tools directly into your professional-grade software. Full developer REST API available, 100% open source self-hostable, whitelabel.",
    pattern: "Managed Cloud / Grant Existing",
    github:
      "https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md",
  },
  {
    title: "Online Education",
    description:
      "Eg. Running your own online course, bootcamp, cohort based learning platform, etc. Provide a private, secure space for students and instructors to share course materials, submit assignments, and collaborate on projects.",
    pattern: "Managed Cloud / Grant Existing",
    github:
      "https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md",
  },
  {
    title: "Chrome Extensions",
    description:
      "Eg. Competitors to Loom screen recorder, tweet generators, etc. Use OfficeX as a local or cloud storage backend for your extension, enabling users to manage recordings, generated content, or other files directly from their browser.",
    pattern: "Managed Cloud / Grant Existing",
    github:
      "https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md",
  },
  {
    title: "AI Agents",
    description:
      "Eg. ChatGPT, DeepSeek, Claude, etc. Enable AI agents to interact with user-managed files, allowing them to summarize documents, generate content based on local data, or perform actions on files stored in a user's private space.",
    pattern: "Any Mode",
    github:
      "https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md",
  },
  {
    title: "Self-Hosting for Enterprise",
    description:
      "Eg. Schools, Agencies, Governments, etc. Provide a 100% open-source, customizable, and self-hostable file solution to maintain full control over sensitive data, meet compliance requirements, and reduce reliance on third-party cloud providers.",
    pattern: "Managed Cloud (Injected Auth)",
    github:
      "https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md",
  },
  {
    title: "Self-Hosting for Personal",
    description:
      "Eg. Home, Family, Privacy, etc. Offer a private and secure self-hosted solution for families and individuals to manage their files, photos, and personal data without worrying about corporate data harvesting or privacy concerns.",
    pattern: "Managed Cloud",
    github:
      "https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md",
  },
];
