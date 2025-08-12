// node ./examples/10_Full_Workflow_Demo/create-org-bulk-populate/script.js

import fs from "fs";

const YOUR_INPUT_DATA = [
  {
    your_user_id: "001_alice_admin",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "Admin Alice",
    officex_org_name: "Demo Organization",
  },
  {
    your_user_id: "002_bob",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "Bob",
    officex_org_name: "Demo Organization",
  },
  {
    your_user_id: "003_charlie",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "Charlie",
    officex_org_name: "Demo Organization",
  },
  {
    your_user_id: "004_dave",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "Dave",
    officex_org_name: "Demo Organization",
  },
  {
    your_user_id: "005_eve",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "Eve",
    officex_org_name: "Demo Organization",
  },
  {
    your_user_id: "006_frank",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "Frank",
    officex_org_name: "Demo Organization",
  },
  {
    your_user_id: "007_george",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "George",
    officex_org_name: "Demo Organization",
  },
  {
    your_user_id: "008_harry",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "Harry",
    officex_org_name: "Demo Organization",
  },
  {
    your_user_id: "009_ian",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "Ian",
    officex_org_name: "Demo Organization",
  },
  {
    your_user_id: "010_john",
    secret:
      "can_be_any_secret_string_under_256_chars_____________bulk_generate_logins",
    host: "http://localhost:8888",
    officex_user_name: "John",
    officex_org_name: "Demo Organization",
  },
];

const OFFICEX_OUTPUT = [
  // {
  //   "your_user_id",
  //   "secret",
  //   "officex_org_name",
  //   "officex_user_name",
  //   "officex_org_id",
  //   "officex_user_id",
  //   "officex_user_auto_login_url",
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
    return result.ok.data.id;
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
      officex_org_id: result.ok.data.drive_id,
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
    return result.ok.data.api_key;
  } catch (error) {
    console.error(error);
  }
};

const createContact = async ({
  officex_host,
  officex_org_id,
  officex_admin_api_key,
  officex_user_name,
  officex_user_id,
}) => {
  logger("---------------");
  logger(`
      1b. Create contact for the user in the org
      `);
  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${officex_admin_api_key}`);
  myHeaders.append("Content-Type", "application/json");
  const raw = JSON.stringify({
    name: officex_user_name,
    id: officex_user_id,
  });
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };
  try {
    const response = await fetch(
      `${officex_host}/v1/drive/${officex_org_id}/contacts/create`,
      requestOptions
    );
    const result = await response.json();
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
  }
};

const generateApiKey = async ({
  officex_host,
  officex_org_id,
  officex_admin_api_key,
  officex_user_name,
  officex_user_id,
}) => {
  logger("---------------");
  logger(`
      1c. Generate ApiKey for the contact
      `);
  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${officex_admin_api_key}`);
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    name: `Autogenerated API Key for ${officex_user_name}`,
    user_id: officex_user_id,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `${officex_host}/v1/drive/${officex_org_id}/api_keys/create`,
      requestOptions
    );
    const result = await response.json();
    console.log(result);
    return result.ok.data.value;
  } catch (error) {
    console.error(error);
  }
};
const getAutoLoginLink = async ({
  officex_host,
  officex_org_id,
  officex_admin_api_key,
  officex_user_id,
  officex_user_api_key,
}) => {
  logger("---------------");
  logger(`
        1d. Get Auto-Login Link for the contact
        `);

  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${officex_admin_api_key}`);
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    user_id: officex_user_id,
    profile_api_key: officex_user_api_key,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `${officex_host}/v1/drive/${officex_org_id}/contacts/helpers/generate-auto-login-link`,
      requestOptions
    );
    const result = await response.json();
    console.log(result);
    return result.ok.data.auto_login_link;
  } catch (error) {
    console.error(error);
  }
};

const writeOutputCsv = async () => {
  const headers = [
    "your_user_id",
    "secret",
    "officex_org_name",
    "officex_user_name",
    "officex_org_id",
    "officex_user_id",
    "officex_user_auto_login_url",
  ];
  const csv_matrix = [
    headers,
    ...OFFICEX_OUTPUT.map((row) => Object.values(row)),
  ];
  const csv = csv_matrix.map((row) => row.join(",")).join("\n");
  fs.writeFileSync(
    `./examples/10_Full_Workflow_Demo/create-org-bulk-populate/output/output.${Date.now()}.csv`,
    csv
  );
};

const run = async () => {
  logger(`
    
========================== BULK GENERATING LOGINS ===========================

Create a new organization and bulk generate logins for members. Outputs a csv

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

  const admin_config = YOUR_INPUT_DATA[0];

  const {
    your_user_id: admin_your_user_id,
    secret: admin_secret,
    host: admin_host,
    officex_user_name: admin_officex_user_name,
    officex_org_name: admin_officex_org_name,
  } = admin_config;

  const admin_crypto_identity = await createCryptoIdentity(
    admin_host,
    `${admin_secret}_${admin_your_user_id}`
  );
  const officex_admin_id = admin_crypto_identity.ok.data.user_id;

  const giftcard_id = await createFactoryGiftCard(admin_host);

  const { officex_org_id, officex_host, officex_giftcard_redeem_code } =
    await redeemFactoryGiftCard({
      host: admin_host,
      giftcard_id,
      officex_org_name: admin_officex_org_name,
      officex_admin_name: admin_officex_user_name,
      officex_admin_id,
    });

  const officex_admin_api_key = await activateOrganization({
    officex_host,
    officex_org_id,
    officex_giftcard_redeem_code,
  });

  const admin_auto_login_link = await getAutoLoginLink({
    officex_host,
    officex_org_id,
    officex_admin_api_key,
    officex_user_id: officex_admin_id,
    officex_user_api_key: officex_admin_api_key,
  });

  OFFICEX_OUTPUT.push({
    your_user_id: admin_your_user_id,
    secret: admin_secret,
    officex_org_name: admin_officex_org_name,
    officex_user_name: admin_officex_user_name,
    officex_org_id,
    officex_user_id: officex_admin_id,
    officex_user_auto_login_url: admin_auto_login_link,
  });

  for (let i = 1; i < YOUR_INPUT_DATA.length; i++) {
    const user_config = YOUR_INPUT_DATA[i];
    const { your_user_id, secret, officex_user_name } = user_config;
    const officex_user_crypto_identity = await createCryptoIdentity(
      user_config.host,
      `${secret}_${your_user_id}`
    );
    const officex_user_id = officex_user_crypto_identity.ok.data.user_id;

    await createContact({
      officex_host,
      officex_org_id,
      officex_admin_api_key,
      officex_user_name,
      officex_user_id,
    });

    const officex_user_api_key = await generateApiKey({
      officex_host,
      officex_org_id,
      officex_admin_api_key,
      officex_user_name,
      officex_user_id,
    });

    const officex_user_auto_login_link = await getAutoLoginLink({
      officex_host,
      officex_org_id,
      officex_admin_api_key,
      officex_user_id,
      officex_user_api_key,
    });

    OFFICEX_OUTPUT.push({
      your_user_id,
      secret,
      officex_org_name: admin_officex_org_name,
      officex_user_name,
      officex_org_id,
      officex_user_id,
      officex_user_auto_login_url: officex_user_auto_login_link,
    });

    // sleep for 1 second to avoid rate limiting
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
