# Demo iFrame OfficeX

Demo: [https://fir-iframe-officex.web.app](https://fir-iframe-officex.web.app)

Also read the other [examples readme](./examples/README.md).

The iFrame integration allows drop-in UI for OfficeX, orgs+profiles scoped by default to your domain, but also possible to request permission to other domains. For actual programmatic use without iframe ui, use the authToken with REST API.

[https://officex.app](https://officex.app)

<img width="1506" alt="image" src="https://github.com/user-attachments/assets/d12c347a-dc5f-4a3d-af71-c5695b0e6523" />

## Common Patterns

There are 3 main ways to use the OfficeX iFrame:

1. Ephemeral Offline Mode
2. Injected Cloud
3. Grant Existing

Each serve their own use cases.

1 Ephemeral Offline Mode: Use this when you want to give your users a file management UI without code. Pure clientside, with offline capabilities and free cloud. Easy to integrate in 2 mins. Ideal for ephemeral single use tools such as YouTube downloaders & temporary AI agents. Users can still easily connect to free cloud themselves by clicking around in the iframe.

2. Injected Cloud: Use this when you want to provide your users a whitelabel OfficeX experience with cloud capabilities. You can self-host the backend yourself, or use OfficeX's free cloud. You would create orgs & profiles on behalf of your users, and own their API keys. Ideal for deep product integrations where you want to use OfficeX as a building block within your app/ecosystem.

3. Grant Existing: Use this when you want users to bring their own OfficeX workspace, and your app simply connects to it. This is ideal for lightweight integrations such as AI Agents, chrome extensions, 3rd party apps, etc. You can still use this method to render in an iframe, or use via REST API.

## Use Cases

| Use Case                                                             | Description                                                                                                                                                                                                                                                                                                                                                  | GitHub Example                                                                                                 |
| :------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| [Anonymous iframe](./examples/01_Anonymous_Iframe)                   | Give your users a file management UI without code. Pure clientside, with offline capabilities and free cloud. Easy to integrate in 2 mins. Ideal for quick prototypes or adding basic file features to any website without a backend.                                                                                                                        | [Github Example](https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md) |
| [Single Use Tools](./examples/02_SingleUse_Tools)                    | Eg. YouTube downloaders, PDF generators, file converters...etc. Give your users a clean, robust clientside UI for file management & offline storage. Perfect for tools that need to process files securely and locally without a user account.                                                                                                               | [Github Example](https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md) |
| [Community Platforms](./examples/03_Community_Platforms)             | Eg. Competitors to Discord, Reddit, Farcaster, etc. Give your communities a full digital storage experience without leaving your platform. Community files and folders, permissions to users & groups, clean modern UI. Full developer REST API available, 100% open source self-hostable, whitelabel.                                                       | [Github Example](https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md) |
| [Workplace Tools](./examples/04_Workplace_Tools)                     | Eg. Competitors to Adobe, Upwork, Zapier, Protonmail, CRMs, etc. Give your professionals a full digital storage experience without leaving your platform. Integrate file management, version control, and collaboration tools directly into your professional-grade software. Full developer REST API available, 100% open source self-hostable, whitelabel. | [Github Example](https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md) |
| [Online Education](./examples/05_Online_Education)                   | Eg. Running your own online course, bootcamp, cohort based learning platform, etc. Provide a private, secure space for students and instructors to share course materials, submit assignments, and collaborate on projects.                                                                                                                                  | [Github Example](https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md) |
| [Chrome Extensions](./examples/06_Chrome_Extensions)                 | Eg. Competitors to Loom screen recorder, tweet generators, etc. Use OfficeX as a local or cloud storage backend for your extension, enabling users to manage recordings, generated content, or other files directly from their browser.                                                                                                                      | [Github Example](https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md) |
| [AI Agents](./examples/07_AI_Agents)                                 | Eg. ChatGPT, DeepSeek, Claude, etc. Enable AI agents to interact with user-managed files, allowing them to summarize documents, generate content based on local data, or perform actions on files stored in a user's private space.                                                                                                                          | [Github Example](https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md) |
| [Self-Hosting for Enterprise](./examples/08_Self_Hosting_Enterprise) | Eg. Schools, Agencies, Governments, etc. Provide a 100% open-source, customizable, and self-hostable file solution to maintain full control over sensitive data, meet compliance requirements, and reduce reliance on third-party cloud providers.                                                                                                           | [Github Example](https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md) |
| [Self-Hosting for Personal](./examples/09_Self_Hosting_Personal)     | Eg. Home, Family, Privacy, etc. Offer a private and secure self-hosted solution for families and individuals to manage their files, photos, and personal data without worrying about corporate data harvesting or privacy concerns.                                                                                                                          | [Github Example](https://github.com/OfficeXApp/iframe-demo/tree/main/examples/10_Full_Workflow_Demo/README.md) |
