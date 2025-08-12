// node ./examples/10_Full_Workflow_Demo/bulk-generate-orgs/script.js
import fs from "fs";

// Refactored and cleaned-up input data structure
const YOUR_INPUT_DATA = [
  {
    your_org_id: "001_org_alice",
    your_admin_id: "admin_alice",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_orgs",
    host: "http://localhost:8888",
    officex_org_name: "Organization Alice",
    officex_admin_name: "Admin Alice",
  },
  {
    your_org_id: "002_org_bob",
    your_admin_id: "admin_bob",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_orgs",
    host: "http://localhost:8888",
    officex_org_name: "Organization Bob",
    officex_admin_name: "Admin Bob",
  },
  {
    your_org_id: "003_org_charlie",
    your_admin_id: "admin_charlie",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_orgs",
    host: "http://localhost:8888",
    officex_org_name: "Organization Charlie",
    officex_admin_name: "Admin Charlie",
  },
  {
    your_org_id: "004_org_dave",
    your_admin_id: "admin_dave",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_orgs",
    host: "http://localhost:8888",
    officex_org_name: "Organization Dave",
    officex_admin_name: "Admin Dave",
  },
  {
    your_org_id: "005_org_eve",
    your_admin_id: "admin_eve",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_orgs",
    host: "http://localhost:8888",
    officex_org_name: "Organization Eve",
    officex_admin_name: "Admin Eve",
  },
];

const OFFICEX_OUTPUT = [
  // {
  //   "your_org_id",
  //   "your_admin_id",
  //   "secret",
  //   "host",
  //   "officex_org_name",
  //   "officex_admin_name",
  //   "officex_org_id",
  //   "officex_admin_id",
  //   "officex_admin_auto_login_url",
  // }
];

let FULL_LOGS = ``;

const logger = (message) => {
  console.log(message);
  FULL_LOGS += `\n${message}\n`;
};

const createCryptoIdentity = async (host, secret_entropy) => {
  logger("---------------");
  logger(`
    1a. Creating crypto identity using secret entropy: "${secret_entropy}"
    `);

  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer FACTORY_API_KEY_IF_APPLICABLE");
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    secret_entropy,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `${host}/v1/factory/helpers/generate-crypto-identity`,
      requestOptions
    );
    const result = await response.json();
    logger(result);
    return result;
  } catch (error) {
    console.error(error);
  }
};

const createFactoryGiftCard = async (host) => {
  logger("---------------");
  logger(`
2. Creating factory gift card...
`);

  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer FACTORY_API_KEY_IF_APPLICABLE");
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    note: "Giftcard for new organization",
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `${host}/v1/factory/giftcards/spawnorg/create`,
      requestOptions
    );
    const result = await response.json();
    logger(result);
    const giftcard_id = result.ok.data.id;
    return giftcard_id;
  } catch (error) {
    console.error(error);
  }
};

const redeemFactoryGiftCard = async ({
  host,
  giftcard_id,
  officex_org_name,
  officex_admin_name,
  officex_admin_id,
}) => {
  logger("---------------");
  logger(`
  3. Redeeming factory gift card...
  `);

  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer FACTORY_API_KEY_IF_APPLICABLE");
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    giftcard_id,
    owner_user_id: officex_admin_id,
    organization_name: officex_org_name,
    owner_name: officex_admin_name,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `${host}/v1/factory/giftcards/spawnorg/redeem`,
      requestOptions
    );
    const result = await response.json();
    logger(result);

    return {
      // input args
      officex_org_name,
      officex_admin_name,
      // output args
      officex_org_id: result.ok.data.drive_id,
      officex_admin_id: officex_admin_id,
      officex_host: result.ok.data.host,
      officex_giftcard_redeem_code: result.ok.data.redeem_code,
    };
  } catch (error) {
    console.error(error);
  }
};

const activateOrganization = async ({
  officex_host,
  officex_org_id,
  officex_giftcard_redeem_code,
}) => {
  logger("---------------");
  logger(`
    4. Activating organization...
    `);

  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer NO_API_KEY_NEEDED");
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    redeem_code: officex_giftcard_redeem_code,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `${officex_host}/v1/drive/${officex_org_id}/organization/redeem`,
      requestOptions
    );
    const result = await response.json();
    logger(result);
    return {
      owner_api_key: result.ok.data.api_key,
      officex_auto_login_link: result.ok.data.auto_login_url,
    };
  } catch (error) {
    console.error(error);
  }
};

const writeOutputCsv = async () => {
  const headers = [
    "your_org_id",
    "your_admin_id",
    "secret",
    "host",
    "officex_org_name",
    "officex_admin_name",
    "officex_org_id",
    "officex_admin_id",
    "officex_admin_auto_login_url",
  ];
  const csv_matrix = [
    headers,
    ...OFFICEX_OUTPUT.map((row) => Object.values(row)),
  ];
  const csv = csv_matrix.map((row) => row.join(",")).join("\n");
  fs.writeFileSync(
    `./examples/10_Full_Workflow_Demo/bulk-generate-orgs/output/output.${Date.now()}.csv`,
    csv
  );
};

const run = async () => {
  logger(`
    
========================== BULK GENERATING ORGS ===========================

Bulk generate organizations with admin. Outputs a csv

-----------------------------------------------------------------------------

This script demos a full workflow that an integration partner would likely encounter. 

For example, you are a Discord competitor called "DiscordClone" that wants to offer OfficeX to your users, from within your own app.
- You have many communities and want to give each community its own OfficeX server.
- Each community has its own set of admins who should be able to manage their OfficeX server.
- Your users may be in multiple communities at a time.
- As superadmin platform, you still want to be able to control all OfficeX servers.

Here's how you can accomplish this, as "DiscordClone":
- For each of your users, create a crypto identity on OfficeX using the "secret_entropy" method. This "secret_entropy" string will give you cryptographic superpowers to control that user, do not leak it.
- Generate an OfficeX organization for every community, with your community admin as the officex org admin 
- For every member inside your community, add them as a contact to the officex org. It is recommended to also use the groups feature to make it easy to manage permissions.
- Since the "secret_entropy" string is deterministic, you can use it to generate the same user every time, so your users can easily hop between multiple officex orgs representing your multiple communities.

We will now execute the code required to accomplish our workflow. They are execute in 3 acts below:

Act I.    Create a new organization with admin (controlled by superadmin, the platform "DiscordClone")
Act II.   Create a user to be the "admin" which is what your user will use to login
Act III.  Create additional deterministic users to join the organization

The code will now run and you will see the logs below.
For full docs, visit https://dev.officex.app
    
    `);

  for (const ORG_CONFIG of YOUR_INPUT_DATA) {
    const {
      your_org_id,
      your_admin_id,
      secret,
      host,
      officex_org_name,
      officex_admin_name,
    } = ORG_CONFIG;

    const admin = await createCryptoIdentity(
      host,
      `${secret}_${your_admin_id}`
    );
    const officex_admin_id = admin.ok.data.user_id;

    const giftcard_id = await createFactoryGiftCard(host);

    const { officex_org_id, officex_host, officex_giftcard_redeem_code } =
      await redeemFactoryGiftCard({
        host,
        giftcard_id,
        officex_org_name,
        officex_admin_name,
        officex_admin_id,
      });

    const { officex_auto_login_link } = await activateOrganization({
      officex_host,
      officex_org_id,
      officex_giftcard_redeem_code,
    });

    OFFICEX_OUTPUT.push({
      your_org_id,
      your_admin_id,
      secret,
      host,
      officex_org_name,
      officex_admin_name,
      officex_org_id,
      officex_admin_id,
      officex_admin_auto_login_url: officex_auto_login_link,
    });

    // sleep 1 sec
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await writeOutputCsv();

  logger(`
    
========================== FINISH ===========================`);

  return {
    result: OFFICEX_OUTPUT,
    logs: FULL_LOGS,
  };
};

run();
