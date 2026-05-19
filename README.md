# tenant-stack-nginx

A minimal TypeScript Pulumi program used by the **sigilvault subscription
controller** (see the `rustcontroller` project). The Pulumi Kubernetes
Operator runs this per subscription; it deploys a hello-world nginx into the
tenant's namespace and serves a page echoing the tenant id.

Config (injected by the controller via `Stack.spec.config`):

| key               | meaning                                              |
|-------------------|------------------------------------------------------|
| `tenantId`        | subscription tenant id (echoed by nginx)             |
| `targetNamespace` | namespace the controller created for this tenant     |

Not run by hand — the controller creates a `Stack` CR that points
`projectRepo` at this repo (pinned commit) and supplies the config.
