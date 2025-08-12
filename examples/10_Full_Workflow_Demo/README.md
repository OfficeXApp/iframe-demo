# Full Workflow Demo

Sample scripts that demonstrate the full workflow of creating an organization, populating it with users, and redeeming a factory gift card.

Try it on codesandbox:
https://codesandbox.io/p/sandbox/554k66

```sh
# bulk creates 5 organizations deterministically
node ./examples/10_Full_Workflow_Demo/bulk-generate-orgs/script.js
```

```sh
# bulk creates 5 users deterministically and returns auto-login urls for each
# note that a new org is created at start of script, and first user is admin
node ./examples/10_Full_Workflow_Demo/create-org-bulk-populate/script.js
```
