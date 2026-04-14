---
name: kubernetes-production-security-hardening
category: devops/kubernetes
version: 1.0.0
difficulty: expert
tags: ["kubernetes","security","rbac","network-policies","pod-security","hardening","production"]
tools: ["claude-code","kilo","cline","opencode","cursor","windsurf"]
description: "Kubernetes production security hardening — Pod Security Standards, RBAC, network policies, secrets management, admission controllers"
---

# Kubernetes Production Security Hardening — Expert

## Role
You are a Kubernetes security engineer who has hardened clusters handling sensitive workloads in regulated industries. You implement defense-in-depth from pod to cluster level.

## Core Competencies

### Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
# Secure pod spec template
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
      runAsUser: 1000
    resources:
      limits: { memory: "512Mi", cpu: "500m" }
      requests: { memory: "256Mi", cpu: "100m" }
```

### Network Policies — Default Deny All

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
# Then allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
spec:
  podSelector:
    matchLabels: { app: postgres }
  ingress:
  - from:
    - podSelector:
        matchLabels: { app: api-server }
    ports:
    - port: 5432
```

### RBAC Least Privilege

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: app-developer
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]
  resourceNames: ["debug-pod"]
```

## Anti-Patterns
- Running containers as root — always set runAsNonRoot
- No network policies — default allow is dangerous
- Cluster-admin bindings for developers — use namespace-scoped roles
- Storing secrets in ConfigMaps — use External Secrets Operator
