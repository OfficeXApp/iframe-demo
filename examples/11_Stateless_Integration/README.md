# Stateless Integration

Coming Soon

---

Stateless integration is when you never need to manage a database mapping between your system IDs and OfficeX IDs. This method is for convinience but is less secure.

Example:
You are building a Telegram bot that creates an OfficeX org for every Telegram user, and manages many OfficeX orgs for many Telegram users.

Instead of storing your own database mapping of Telegram ID to OfficeX ID, you can instead use the below flow:

1. TelegramUsername + StaticSecretString -> Deterministically generate OfficeX User ID
2. TelegramGroupID + StaticSecretString -> Deterministically generate OfficeX Org ID, save in 2 way mapping in officex
3. TelegramGroupID + TelegramUsername + StaticSecretString -> Deterministically generate OfficeX Folder ID, save in 2 way mapping in officex

The goal is to have a full integration without ever needing to store auth credentials or database mappings. Note that you dont necessarily need to expose users directly, you can spawn any arbitrary amount of OfficeX users for any arbitrary tasks, and manage permissions accordingly.

The stateless integration flow is as follows:

### Deterministic UserIDs

1. Generate a crypto identity for the user using `POST /v1/drive/:org_id/contacts/helpers/generate-crypto-identity` passing in your secret seed string, which returns a deterministic generated wallet with private key (warning, this exposes private keys to your application logic)
2. At any time, you can generate a signature for the user, to use as temp 90 second api keys for REST API calls. `POST /v1/drive/:org_id/contacts/helpers/generate-crypto-signature` passing in your private key (warning, convinent not secure. if you are okay with managing your own state then you can issue user API keys instead)

Warning:

- This is a one-directional encryption from your secret seed string to OfficeX User ID. You cannot decrypt the OfficeX User ID back to your secret seed string. If you want "bidirectional ids" you should see the next section which uses symmetric encryption

Optional:

- Save the TelegramID <> OfficeX UserID to the officex server `POST /v1/drive/:org_id/organization/map-external-id` (you need at least edit permission on the drive)
- Anytime you can fetch the mapping `GET /v1/drive/:org_id/organization/map-external-id` (you need at least view permission on the drive)

You may want to create an admin user who will manage all the mapping operations, while the rest of your users keep their own limited auth scopes.

### Deterministic Bidirectional IDs

Use this to deterministically generate an OfficeX UUIDv5 for any resource, based on your input text and secret seed string. The output can be reversed back to your input text as long as you use the same secret seed string.

This is useful for when you want to, for example, map a Telegram GroupID to an OfficeX organization id in a predictable way.

1. With your external id + secret string, call `POST /v1/drive/:org_id/organization/symmetric-encrypt` which returns a deterministic encrypted string which you can also get back in reverse.
2. Using your encrypted string, call `POST /v1/drive/:org_id/organization/generate-uuid-v5` which returns a deterministic UUIDv5 which you can use as a predictable OfficeX ID.
3. Save the external id mapping to OfficeX using `POST /v1/drive/:org_id/organization/map-external-id` (see below section) for easy future reference.

While this method is convinent for a stateless integration, it takes more network calls, is less secure, and less performant. However its very easy and simple.

### Saving External ID Mappings

OfficeX provides a convinent key-value store for saving external ID mappings. This saves you the hassle of managing your own database mappings. Note that the tradeoff is extra network requests and latency, so it is still more performant to manage your own database mappings if you can afford it. Again, this workflow demo is for convinence and ease of use, at the tradeoff of security and performance.

- To save a new external ID mapping, use `POST /v1/drive/:org_id/organization/map-external-id` (you need at least edit permission on the drive)
- To fetch an external ID mapping, use `GET /v1/drive/:org_id/organization/map-external-id` (you need at least view permission on the drive)

You may want to create an admin user who will manage all the mapping operations, while the rest of your users keep their own limited auth scopes.
