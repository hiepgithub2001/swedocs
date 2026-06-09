# Lab — Deploy to a local Kubernetes cluster (`kind`)

> **Builds:** [Kubernetes](../1-knowledge/containers/kubernetes.md) — pods, deployments, services,
> self-healing, [rolling updates](../1-knowledge/ci-cd/continuous-delivery-deployment.md). **Tools:**
> Docker + [`kind`](https://kind.sigs.k8s.io/) (Kubernetes-in-Docker) + `kubectl`. **Time:** ~30 min.

## Goal
Run a real Kubernetes cluster on your laptop, deploy an app, then **watch it self-heal** and do a
**rolling update**. You'll see the [reconciliation loop](../1-knowledge/containers/kubernetes.md)
with your own eyes — declare a state, watch K8s maintain it.

## 1. Create a cluster
```console
$ kind create cluster --name lab
$ kubectl get nodes
NAME                 STATUS   ROLES           AGE
lab-control-plane    Ready    control-plane   30s        ← a cluster, on your laptop
```

## 2. Declare a Deployment + Service
`app.yaml` — desired state: 3 replicas behind a stable [Service](../1-knowledge/containers/service-networking-load-balancing.md):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: web }
spec:
  replicas: 3
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: web } }
    spec:
      containers:
        - name: web
          image: nginx:1.25          # any image works; nginx is handy
          ports: [{ containerPort: 80 }]
---
apiVersion: v1
kind: Service
metadata: { name: web }
spec:
  selector: { app: web }
  ports: [{ port: 80, targetPort: 80 }]
```
```console
$ kubectl apply -f app.yaml
$ kubectl get pods
NAME          READY   STATUS    AGE
web-xxx-aaa   1/1     Running   8s
web-xxx-bbb   1/1     Running   8s
web-xxx-ccc   1/1     Running   8s        ← 3 pods, as declared
```

## 3. Watch it self-heal
Delete a pod and watch Kubernetes [reconcile](../1-knowledge/containers/kubernetes.md) back to 3:
```console
$ kubectl delete pod web-xxx-aaa
$ kubectl get pods -w                      # -w = watch, live
web-xxx-bbb   1/1   Running       40s
web-xxx-ccc   1/1   Running       40s
web-xxx-ddd   0/1   ContainerCreating   2s   ← a replacement appears automatically
web-xxx-ddd   1/1   Running       5s         ← back to 3, you did nothing
```
You declared `replicas: 3`; K8s *maintains* 3. That's the whole model.

## 4. Do a rolling update
Change the image version and apply — watch a [rolling update](../1-knowledge/ci-cd/continuous-delivery-deployment.md):
```console
$ kubectl set image deployment/web web=nginx:1.27
$ kubectl rollout status deployment/web
Waiting for rollout: 1 old replica pending termination...
deployment "web" successfully rolled out      ← pods replaced a few at a time, no downtime

$ kubectl rollout undo deployment/web          # instant rollback to the previous version
```
Old and new pods briefly coexisted while traffic kept flowing — zero-downtime deploy, built in.

## 5. Reach the service
```console
$ kubectl port-forward service/web 8080:80 &
$ curl -s localhost:8080 | head -1
<!DOCTYPE html>                                ← the Service load-balanced you to one of the pods
```
The [Service](../1-knowledge/containers/service-networking-load-balancing.md) gave a stable
endpoint across all 3 ever-changing pods.

## 6. Clean up
```console
$ kind delete cluster --name lab
```

## Exercises
1. `kubectl scale deployment/web --replicas=6` then re-check `kubectl get endpoints web` — the
   [Service](../1-knowledge/containers/service-networking-load-balancing.md) tracks the new pods
   automatically.
2. `kubectl describe pod <name>` — read the events (scheduled → pulled image → started).
3. Set a bad image (`nginx:doesnotexist`) and watch the rollout get **stuck** (and that
   `rollout undo` saves you) — a safe failure.
4. Add `resources: { limits: { memory: 64Mi } }` and observe [cgroup](../1-knowledge/containers/containers.md)
   limits in action.

## What you proved
- Kubernetes runs your **declared desired state** and **self-heals** to maintain it.
- **Rolling updates & rollback** are built-in and zero-downtime.
- A **Service** gives a stable endpoint that load-balances across dynamic pods.

## References
- [Kubernetes](../1-knowledge/containers/kubernetes.md) · [Service networking](../1-knowledge/containers/service-networking-load-balancing.md)
- [kind docs](https://kind.sigs.k8s.io/) · [kubectl cheat sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
