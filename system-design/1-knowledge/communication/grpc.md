# gRPC & RPC

> RPC (Remote Procedure Call) makes calling a function on another machine look like a
> local call. **gRPC** is a modern, high-performance RPC framework using Protocol
> Buffers over HTTP/2.

## Problem
REST/JSON is human-friendly but verbose and slow for chatty **internal** service-to-
service traffic. For microservices making millions of calls, you want a compact binary
format, a strict contract, and low latency.

## Core concepts

**How gRPC works**
- Define services and messages in a **`.proto`** file (the contract).
- Compile it to generate **client and server stubs** in many languages.
- Messages are serialized with **Protocol Buffers** (binary, compact, fast).
- Transport is **HTTP/2** → multiplexing, header compression, streaming.

```protobuf
service UserService {
  rpc GetUser (GetUserRequest) returns (User);
}
message GetUserRequest { int64 id = 1; }
message User { int64 id = 1; string name = 2; }
```

```mermaid
flowchart LR
    C[Client stub] -- protobuf/HTTP2 --> S[Server stub]
    Proto[.proto contract] --> C
    Proto --> S
```

**Four call types** — unary, server-streaming, client-streaming, and
**bidirectional streaming** (great for real-time pipelines).

## Trade-offs
- ✅ **Fast & compact** (binary), **strongly typed** contract, codegen, streaming,
  language-agnostic. Ideal for **internal microservices**.
- ⚠️ Not human-readable; **limited browser support** (needs gRPC-Web proxy); harder to
  debug with curl; schema must be shared and versioned carefully.
- **REST vs gRPC** — REST for public/browser-facing APIs; gRPC for internal,
  performance-critical east-west traffic.

## Real-world examples
- **Google** runs gRPC internally at massive scale (it's derived from Stubby).
- **Netflix, Square, Cloudflare** use gRPC for service-to-service communication; it's
  the default RPC in many service meshes.

## References
- [grpc.io](https://grpc.io/)
- [Protocol Buffers](https://protobuf.dev/)
