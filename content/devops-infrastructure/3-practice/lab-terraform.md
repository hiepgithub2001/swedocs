# Lab — Describe infrastructure with Terraform

> **Builds:** [Infrastructure as Code](../1-knowledge/fundamentals/infrastructure-as-code.md) —
> declarative desired state, the plan/apply workflow, idempotency, state. **Tools:**
> [Terraform](https://developer.hashicorp.com/terraform/install) (or OpenTofu). **Time:** ~25 min.
> **No cloud account needed** — we use the local `docker` provider so it's free and offline.

## Goal
Experience the [IaC](../1-knowledge/fundamentals/infrastructure-as-code.md) loop firsthand:
**declare** infrastructure in a file, **preview** the diff, **apply** it, prove it's
**idempotent**, then **destroy** it — all from version-controllable code. We use Docker as the
"infrastructure" so it runs locally, but the workflow is identical for AWS/GCP.

## 1. Declare desired state
`main.tf` — "I want an nginx container running," declaratively:
```hcl
terraform {
  required_providers { docker = { source = "kreuzwerker/docker" } }
}
provider "docker" {}

resource "docker_image" "nginx" {
  name = "nginx:1.27"
}
resource "docker_container" "web" {
  name  = "tf-web"
  image = docker_image.nginx.image_id
  ports { internal = 80, external = 8080 }
}
```
You described *what should exist* — not the steps to create it.

## 2. Init & preview (plan)
```console
$ terraform init        # downloads the provider
Terraform has been successfully initialized!

$ terraform plan        # PREVIEW — changes nothing, shows the diff
  + docker_image.nginx will be created
  + docker_container.web will be created
      + name = "tf-web"
      + ports { external = 8080, internal = 80 }
Plan: 2 to add, 0 to change, 0 to destroy.       ← review this like a code change
```
The [plan](../1-knowledge/fundamentals/infrastructure-as-code.md) is the killer feature: see
*exactly* what will happen before anything does.

## 3. Apply
```console
$ terraform apply       # type 'yes' to confirm
docker_image.nginx: Creation complete
docker_container.web: Creation complete

$ curl -s localhost:8080 | head -1
<!DOCTYPE html>          ← the container Terraform created is running
```

## 4. Prove idempotency (the key idea)
Run plan/apply **again** without changing the file:
```console
$ terraform plan
No changes. Your infrastructure matches the configuration.    ← idempotent!
```
Reality already matches the desired state, so Terraform does **nothing**. The file is the source
of truth — run it once or a hundred times, same result. This is what makes IaC safe and
[environments reproducible](../1-knowledge/fundamentals/environments-and-release-flow.md).

## 5. Change something & see the diff
Edit `external = 8080` → `external = 9090`, then:
```console
$ terraform plan
  ~ docker_container.web must be replaced
      ~ ports { external = 8080 -> 9090 }      ← Terraform computed the exact change
Plan: 1 to add, 0 to change, 1 to destroy.
```
You declared a new desired state; Terraform figured out the steps. Apply it and the container
moves to port 9090.

## 6. Inspect state & destroy
```console
$ terraform state list          # what Terraform is tracking
docker_container.web
docker_image.nginx

$ terraform destroy             # tear it all down cleanly
Destroy complete! Resources: 2 destroyed.
```
The [state](../1-knowledge/fundamentals/infrastructure-as-code.md) file is how Terraform remembers
what it created so it knows what to change or destroy.

## Exercises
1. Commit `main.tf` to Git — your infra is now versioned, diffable, and reviewable like any code.
2. Add a second container (`tf-web-2` on another port) — apply and watch only the *new* resource
   get created (idempotency leaves the first alone).
3. Manually `docker rm -f tf-web`, then `terraform plan` — watch Terraform **detect the drift**
   and offer to recreate it.
4. Add a `variable "port"` and pass `-var port=8888` — parameterized, reusable infra.

## What you proved
- IaC is **declarative**: you describe the end state, the tool computes the steps.
- The **plan → apply** workflow previews changes before they happen.
- It's **idempotent** and **state-tracked** — reality is kept matching the code, and
  [drift](../1-knowledge/fundamentals/infrastructure-as-code.md) is detectable.

## References
- [Infrastructure as Code](../1-knowledge/fundamentals/infrastructure-as-code.md)
- [Terraform — Get Started](https://developer.hashicorp.com/terraform/tutorials)
