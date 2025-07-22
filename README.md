# Demo iFrame OfficeX

Demo: [https://fir-iframe-officex.web.app](https://fir-iframe-officex.web.app)

The iFrame integration allows drop-in UI for OfficeX, orgs+profiles scoped by default to your domain, but also possible to request permission to other domains. For actual programmatic use without iframe ui, use the authToken with REST API.

[https://officex.app](https://officex.app)

<img width="1506" alt="image" src="https://github.com/user-attachments/assets/d12c347a-dc5f-4a3d-af71-c5695b0e6523" />
<img width="1509" alt="image" src="https://github.com/user-attachments/assets/aef71c19-a11c-4b2a-8842-4e762318c579" />

## Basic Setup

### Parent POV

```html
<h1>Parent Document</h1>
<iframe
  id="officex-iframe"
  src="https://officex.app"
  width="100%"
  height="600px"
></iframe>
<script>
  // Init IFrame
  const iframe = document.getElementById("officex-iframe");

  // Configuration for initialization
  const initConfig = {
    ephemeral: {
      org_client_secret: "your-org-seed-phrase", // this can be an arbitrary string
      profile_client_secret: "your-profile-seed-phrase", // this can be a user id from your db
      org_name: "your-org-name", // this can be an arbitrary string
      profile_name: "your-profile-name", // this can be an arbitrary string
    },
    injected: {
      host: "your-custom-backend", // this can be an arbitrary string
      orgID: "your-drive-id", // this can be an arbitrary string
      profileID: "your-profile-id", // this can be an arbitrary string
      apiKey: "your-api-key", // only provide apiKey if you are subsidizing for users
      redirectTo?: "org/current/drive" // optional, default is the drive path
    },
    // existing: {
    //     // shows ui page asking user to approve connection, and select api key to give parent app access to
    //   orgID: "your-drive-id", // this can be an arbitrary string
    //   profileID: "your-profile-id", // this can be an arbitrary string
    //   redirectTo?: "org/current/drive" // optional, default is the drive path
    // }
  };

  // Function to initialize the iframe
  function initializeIframe() {
    iframe.contentWindow.postMessage(
      {
        type: "init",
        data: initConfig,
        tracer: "init-example",
      },
      "*"
    );
  }

  // Wait for iframe to load before sending messages
  // This event fires on both initial load AND refresh
  iframe.addEventListener("load", () => {
    console.log("IFrame loaded/refreshed - initializing...");
    // Add a small delay to ensure iframe is fully ready
    setTimeout(initializeIframe, 100);
  });

  // Listen for messages from IFrame
  window.addEventListener("message", (event) => {
    // Validate origin for security
    // if (event.origin !== "https://officex.app") return;

    const { type, data, tracer } = event.data;

    // Handle responses based on tracer
    switch (tracer) {
      case "init-example":
        console.log("Init response:", data);
        if (data.success) {
          console.log("IFrame initialized successfully");
        } else {
          console.error("IFrame initialization failed:", data.error);
          // Optionally retry initialization after a delay
          setTimeout(initializeIframe, 2000);
        }
        break;

      case "go-to-page-action01": // often used to navigate to a redeem gift card page
        console.log("Go to page url response:", data);
        break;

      case "whoami-action04":
        console.log("WhoAmI response:", data); // contains info about disks so its easy to show a default drive url
        break;

      case "getAuthToken-action05":
        console.log("Auth token response:", data);
        break;

      case "rest-command-action06":
        console.log("Rest command response:", data);
        break;
    }
  });

  // Helper function to send messages to iframe
  function sendMessageToIframe(type, data, tracer) {
    if (!iframe.contentWindow) {
      console.warn("IFrame not ready");
      return;
    }
    iframe.contentWindow.postMessage({ type, data, tracer }, "*");
  }

  // Go to Page
  function goToPage(pageData) {
    sendMessageToIframe("go-to-page", pageData, "go-to-page-action01");
  }

  // WhoAmI
  function whoAmI() {
    sendMessageToIframe("whoami", {}, "whoami-action04");
  }

  // Get Auth Token
  function getAuthToken() {
    sendMessageToIframe("getAuthToken", {}, "getAuthToken-action05");
  }

  // Send Rest Command
  function sendRestCommand(commandData) {
    sendMessageToIframe("rest-command", commandData, "rest-command-action06");
  }
</script>
```
