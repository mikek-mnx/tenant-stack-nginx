import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// Injected by the subscription controller via Stack.spec.config.
const cfg = new pulumi.Config();
const tenantId = cfg.require("tenantId");
const targetNamespace = cfg.require("targetNamespace");

const labels = {
    "app.kubernetes.io/name": "tenant-nginx",
    "app.kubernetes.io/managed-by": "sigilvault",
    "sigilvault.xyz/tenant-id": tenantId,
};

// The page nginx serves — echoes the tenant id so the pipeline is visibly
// end-to-end (webhook -> Subscription -> namespace -> Stack -> running nginx).
const indexHtml = `<!doctype html>
<html><head><title>tenant ${tenantId}</title></head>
<body><h1>Hello from tenant <code>${tenantId}</code></h1>
<p>Provisioned by the sigilvault subscription controller via Pulumi.</p>
</body></html>
`;

const content = new k8s.core.v1.ConfigMap("nginx-index", {
    metadata: { namespace: targetNamespace, labels },
    data: { "index.html": indexHtml },
});

const appLabels = { ...labels, app: "tenant-nginx" };

const deployment = new k8s.apps.v1.Deployment("tenant-nginx", {
    metadata: { namespace: targetNamespace, labels },
    spec: {
        replicas: 1,
        selector: { matchLabels: { app: "tenant-nginx" } },
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [{
                    name: "nginx",
                    image: "nginx:1.27-alpine",
                    ports: [{ containerPort: 80 }],
                    volumeMounts: [{
                        name: "index",
                        mountPath: "/usr/share/nginx/html",
                        readOnly: true,
                    }],
                    resources: {
                        requests: { cpu: "10m", memory: "16Mi" },
                        limits: { cpu: "100m", memory: "64Mi" },
                    },
                }],
                volumes: [{
                    name: "index",
                    configMap: { name: content.metadata.name },
                }],
            },
        },
    },
});

const service = new k8s.core.v1.Service("tenant-nginx", {
    metadata: { namespace: targetNamespace, labels },
    spec: {
        selector: { app: "tenant-nginx" },
        ports: [{ name: "http", port: 80, targetPort: 80 }],
    },
});

export const namespace = targetNamespace;
export const tenant = tenantId;
export const serviceName = service.metadata.name;
