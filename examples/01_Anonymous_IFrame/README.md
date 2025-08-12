# Anonymous IFrame

Give your users a file management UI without code. Pure clientside, with offline capabilities and free cloud. Easy to integrate in 2 mins. Ideal for quick prototypes or adding basic file features to any website without a backend.

This example shows how to initialize an anonymous IFrame with OfficeX in pure HTML. Simply copy paste the below code into any HTML file inside your `<body>`

```html
<div>
  <iframe
    id="officex-iframe-display"
    src="https://officex.app/org/current/drive/BROWSER_CACHE/DiskID_offline-local-browser-cache/FolderID_root-folder-offline-local-browser-cache/"
    sandbox="allow-same-origin allow-scripts allow-downloads allow-popups"
  ></iframe>
  <script>
    function copyCode() {
      const textarea = document.getElementById("code-snippet");
      textarea.select();
      document.execCommand("copy");
      alert("Code copied to clipboard!");
    }

    // Iframe initialization for the display iframe
    const iframeElementDisplay = document.getElementById(
      "officex-iframe-display"
    );

    iframeElementDisplay.onload = () => {
      const ephemeralConfig = {
        org_client_secret: `org-123abc-${Date.now()}`,
        profile_client_secret: `profile-123xyz-${Date.now()}`,
        org_name: "Anonymous Demo Org",
        profile_name: "Anonymous Demo Profile",
      };

      const initData = { ephemeral: ephemeralConfig };

      iframeElementDisplay.contentWindow.postMessage(
        {
          type: "officex-init",
          data: initData,
          tracer: `init-ephemeral-${Date.now()}`,
        },
        "https://officex.app"
      );
    };
  </script>
</div>
```
