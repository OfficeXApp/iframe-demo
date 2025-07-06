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
    parent_folder_uuid?: string; // Optional parent folder ID
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
    parent_folder_uuid?: string; // Optional parent folder ID
  };
}

// type RestCommand = CreateFileCommand | CreateFolderCommand;

// interface RestCommandResponse {
//   success: boolean;
//   data?: any;
//   error?: string;
// }

// Set a global-like variable for development mode
const LOCAL_DEV_MODE = false;
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

  // File creation state
  const [
    fileSize,
    // setFileSize
  ] = useState(1024);
  const [rawUrl, setRawUrl] = useState("https://bitcoin.org/bitcoin.pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileParentFolderId, setFileParentFolderId] = useState(""); // New: Optional parent folder ID for files

  // Folder creation state
  const [folderName, setFolderName] = useState("My New Folder");
  const [
    folderLabels,
    // setFolderLabels
  ] = useState<LabelValue[]>([]);
  const [
    hasSovereignPermissions,
    // setHasSovereignPermissions
  ] = useState(false);
  const [folderParentFolderId, setFolderParentFolderId] = useState(""); // New: Optional parent folder ID for folders

  // Command results state
  const [lastCommandResult, setLastCommandResult] = useState<any>(null);
  const [lastFileResult, setLastFileResult] = useState<any>(null);
  const [lastFolderResult, setLastFolderResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to generate the correct OfficeX URL
  // const getOfficeXUrl = useCallback(() => {
  //   if (!aboutResponse?.organization_id) {
  //     return "https://officex.app"; // Fallback URL
  //   }

  //   const orgId = aboutResponse.organization_id;
  //   const baseUrl = LOCAL_DEV_MODE
  //     ? "http://localhost:5173"
  //     : aboutResponse.frontend_domain;
  //   return `${baseUrl}/org/${orgId}__/drive`;
  // }, [aboutResponse]);

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

  // Create file from URL
  const createFileCommand = useCallback(() => {
    if (!iframeReady) {
      console.warn("Cannot create file: iframe not ready");
      return;
    }

    // Extract filename from URL
    const urlFileName = rawUrl.split("/").pop() || "downloaded-file";

    const command: CreateFileCommand = {
      action: "CREATE_FILE",
      payload: {
        name: urlFileName,
        file_size: fileSize,
        raw_url: rawUrl,
        parent_folder_uuid: fileParentFolderId || undefined, // Include optional parent folder ID
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
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:mime;base64, prefix
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
          raw_url: "", // Empty when using base64
          base64: base64Data,
          parent_folder_uuid: fileParentFolderId || undefined, // Include optional parent folder ID
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
        parent_folder_uuid: folderParentFolderId || undefined, // Include optional parent folder ID
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
          // Clear the input
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

        case "officex-rest-command-response":
          console.log("REST command response:", data);
          setLastCommandResult(data); // Store the last command result
          if (data.success) {
            console.log("REST command successful:", data.data);
            // Store specific results for files and folders
            if (data.data.message?.includes("Folder")) {
              setLastFolderResult(data.data);
            } else if (data.data.message?.includes("File")) {
              setLastFileResult(data.data);
            }
          } else {
            console.error("REST command failed:", data.error);
            // Clear specific results on failure
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
            height: "800px",
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
              {/* <a
                href={getOfficeXUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button style={{ ...buttonStyle, backgroundColor: "#2196F3" }}>
                  Open OfficeX in new tab
                  {!aboutResponse?.organization_id && (
                    <span style={{ fontSize: "10px", display: "block" }}>
                      (Get About Info first)
                    </span>
                  )}
                </button>
              </a> */}
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
                      {/* frontend domain */}
                      {aboutResponse.frontend_domain && (
                        <div>
                          <strong style={{ color: "#212529" }}>
                            Frontend Domain:
                          </strong>{" "}
                          {aboutResponse.frontend_domain}
                        </div>
                      )}
                    </div>
                    {/* <div
                      style={{
                        marginTop: "10px",
                        padding: "8px",
                        backgroundColor: "#e3f2fd",
                        borderRadius: "4px",
                        fontSize: "11px",
                      }}
                    >
                      <strong style={{ color: "#1976d2" }}>
                        Generated URL:
                      </strong>
                      <br />
                      <code style={{ wordBreak: "break-all" }}>
                        {getOfficeXUrl()}
                      </code>
                    </div> */}
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
                      ✅ Within 10MB limit
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
