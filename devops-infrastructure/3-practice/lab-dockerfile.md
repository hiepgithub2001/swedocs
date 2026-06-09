# Lab — Write a Dockerfile & run a container

> **Builds:** [containers & images](../1-knowledge/containers/containers.md) — Dockerfiles,
> layers, the image/container distinction, registries. **Tools:** Docker (or Podman). **Time:**
> ~25 min.

## Goal
Turn an app into a portable [image](../1-knowledge/containers/containers.md), run it as a
container, peek at its **layers**, and understand why "works on my machine" dies here. You'll
build the [artifact](../1-knowledge/ci-cd/continuous-integration.md) the rest of the pipeline
carries.

## 1. A tiny app to containerize
Make a folder with a trivial web app — `app.py`:
```python
from http.server import HTTPServer, BaseHTTPRequestHandler
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.end_headers()
        self.wfile.write(b"hello from a container\n")
HTTPServer(("0.0.0.0", 80), H).serve_forever()
```

## 2. Write the Dockerfile
`Dockerfile` — the recipe that becomes an [image](../1-knowledge/containers/containers.md):
```dockerfile
FROM python:3.12-slim        # base layer (a minimal Python OS image)
WORKDIR /app                 # working dir inside the image
COPY app.py .                # layer: copy your code in
EXPOSE 80                    # document the port
CMD ["python", "app.py"]     # what runs when the container starts
```
Each instruction becomes a cached [layer](../1-knowledge/containers/containers.md).

## 3. Build the image
```console
$ docker build -t myapp:1.0 .
 => [1/3] FROM python:3.12-slim
 => [2/3] WORKDIR /app
 => [3/3] COPY app.py .
 => exporting to image ... => naming to docker.io/library/myapp:1.0

$ docker images myapp
REPOSITORY   TAG   IMAGE ID       SIZE
myapp        1.0   a1b2c3d4e5f6   58MB        ← your image (tiny vs a whole VM)
```

## 4. Run it as a container
```console
$ docker run -d -p 8080:80 --name web myapp:1.0   # -d detached, map host:8080→container:80
$ curl localhost:8080
hello from a container                             ← your app, running isolated

$ docker ps
CONTAINER ID  IMAGE      STATUS        PORTS
7f3a..        myapp:1.0  Up 5 seconds  0.0.0.0:8080->80/tcp
```
The [image](../1-knowledge/containers/containers.md) is the template; this running `web`
container is an *instance* of it — run the same `docker run` again and you get a second identical
container.

## 5. See the layers
```console
$ docker history myapp:1.0
IMAGE      CREATED BY                          SIZE
a1b2c3..   CMD ["python","app.py"]             0B
<missing>  COPY app.py .                       0.3kB     ← your code: a tiny top layer
<missing>  WORKDIR /app                        0B
<missing>  /bin/sh -c ... (python base) ...    58MB      ← the shared base layer
```
**Why this matters:** change only `app.py` and rebuild — Docker reuses the cached 58MB base layer
and rebuilds just the 0.3kB code layer. That's why container builds and pulls are fast.

## 6. Prove portability (the whole point)
```console
$ docker save myapp:1.0 | gzip > myapp.tar.gz   # ship this file anywhere
# on ANY machine with Docker:  docker load < myapp.tar.gz && docker run -p 8080:80 myapp:1.0
```
The *exact bytes* — app + Python + libs — run identically on any host. No "but you need Python
3.12 installed." (In real life you'd `docker push` to a [registry](../1-knowledge/containers/containers.md)
instead.)

## Exercises
1. Add a `requirements.txt` + `RUN pip install -r requirements.txt` **before** `COPY app.py` —
   why does ordering matter for layer caching? (Hint: deps change less than code.)
2. Run **two** containers from the image on different host ports — note they're isolated.
3. `docker exec -it web sh` to get a shell *inside* the container; run `ps aux` — see how few
   processes it thinks exist ([namespaces](../1-knowledge/containers/containers.md)).
4. Shrink the image: compare `python:3.12` vs `python:3.12-slim` vs `python:3.12-alpine` sizes.

## What you proved
- A **Dockerfile builds an image**; a **container is a running instance** of it.
- Images are **cached layers** — small changes rebuild fast.
- The image is **portable and immutable** — identical everywhere, killing "works on my machine."

## References
- [Containers & images](../1-knowledge/containers/containers.md)
- [Docker — Get Started](https://docs.docker.com/get-started/)
