# Examples Appendix

## Easy Identity

View code snippet: https://codesandbox.io/p/sandbox/sn95h3

<img width="912" height="814" alt="image" src="https://github.com/user-attachments/assets/ba1905b2-ffc0-4164-995e-8e59e134aa0c" />


Deterministically create users in OfficeX that match your existing user identity system.

```
POST /v1/factory/helpers/generate-crypto-identity
body = {
    "secret_entropy": `${your_user_id}_${static_secret_string}`
}
```

which will return:

```ts
export declare type IResponseGenerateCryptoIdentity = ISuccessResponse<{
  user_id: UserID;
  icp_principal: string;
  evm_public_key: string;
  evm_private_key: string;
  origin: {
    secret_entropy?: string;
    seed_phrase?: string;
  };
}>;
```

It uses your "secret_entropy" string to deterministically generate a crypto identity on ICP & EVM (OfficeX profiles are simply crypto wallets). It will be the same one each time for your `secret_entropy`, which you can think of as a "seed password".

Note that you do not need to trust OfficeX to generate your users' crypto identities. You can generate them yourself by copying the [open source code here](https://github.com/OfficeXApp/typescript-server/blob/main/src/services/auth.ts) or reference on [codesandbox](https://codesandbox.io/p/sandbox/sn95h3), or simply self hosting your own OfficeX server instance.


## Bulk Scripting Actions

View code snippets: https://codesandbox.io/p/sandbox/bulk-scripting-officex-554k66

<img width="858" height="755" alt="image" src="https://github.com/user-attachments/assets/3ccedda9-5fa0-4841-8ffd-519c68207ffd" />


Common workflows you will encounter include:

1. Creating new organizations
2. Adding users to organizations

The code for these common workflows are provided for you [in this example](./examples/10_Full_Workflow_Demo/README.md). Or you can try them in the cloud [here on codesandbox](https://codesandbox.io/p/sandbox/554k66).

## Navigation Tips

Sometimes users will have complex paths in their OfficeX workspace, including magic links with lots of url metadata. You can easily navigate users to complex routes using shortlinks:

`POST /v1/drive/:org_id/organization/shortlink`

which returns a short string that you can use to navigate to the complex route. OfficeX will automatically redirect users to the full original route, no matter how complex it is. The shortlink is simple and looks like this: `https://officex.app/org/{drive_id_hash}/to/${shortlink_slug}`. That `shortlink_slug` is all you need.

This makes it easy, clean and simple to handle navigation within your own complex frontends.
