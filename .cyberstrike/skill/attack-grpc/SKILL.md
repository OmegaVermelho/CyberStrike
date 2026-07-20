---
name: attack-grpc
description: "gRPC vulnerability testing — server reflection abuse, insecure channels, metadata auth bypass, gRPC-Web proxy quirks"
category: "web-application"
version: "1.0"
author: "cyberstrike-official"
tags:
  - grpc
  - protobuf
  - api
  - web
  - attack
tech_stack:
  - grpc
  - protobuf
  - grpc-web
cwe_ids:
  - CWE-200
  - CWE-284
  - CWE-319
chains_with:
  - attack-graphql
  - wstg-apit-02
prerequisites:
  - wstg-apit-01
severity_boost:
  wstg-apit-02: "Reflection-exposed service + missing per-RPC authz = full BOLA across every method"
---

# gRPC Vulnerability Testing

## Objective

Exploit gRPC-specific vulnerabilities: service enumeration via reflection, missing transport/channel security, per-RPC authorization gaps, and gRPC-Web proxy translation issues.

## Testing Methodology

### Phase 1: Discovery

```bash
# Confirm the target speaks gRPC (HTTP/2, content-type application/grpc)
curl -sk -o /dev/null -w "%{http_version} %{content_type}\n" \
  --http2-prior-knowledge https://TARGET:PORT/

# Fingerprint via known service/method names from JS bundles or mobile app strings
grep -roE '/[A-Za-z0-9_.]+/[A-Za-z0-9_]+' app-bundle/ | grep -i service
```

### Phase 2: Reflection Abuse

If server reflection (`grpc.reflection.v1alpha.ServerReflection`) is enabled, the entire API surface — services, methods, message schemas — can be enumerated without any `.proto` file.

```bash
# List all services
grpcurl -plaintext TARGET:PORT list

# List all methods on a service
grpcurl -plaintext TARGET:PORT list PackageName.ServiceName

# Describe a method's full request/response schema
grpcurl -plaintext TARGET:PORT describe PackageName.ServiceName.MethodName

# Dump the entire schema for offline analysis
grpcurl -plaintext TARGET:PORT describe > schema-dump.txt
```

Treat an open reflection endpoint on anything but a local/dev environment as an information-disclosure finding on its own — it hands over the full attack surface map.

### Phase 3: Insecure Channel / Transport

```bash
# Does the service accept plaintext (no TLS) at all?
grpcurl -plaintext TARGET:PORT list

# If TLS is present, check cert validation is actually enforced server-side (mTLS)
# — not just offered. Try connecting with no client cert or a self-signed one:
grpcurl -insecure TARGET:PORT list          # server accepts unverified cert = weak TLS
evans -r --host TARGET --port PORT repl     # interactive explorer, easier for manual probing
```

A server that accepts `-plaintext` in production, or accepts any self-signed client cert when mTLS is advertised, indicates the transport security is cosmetic.

### Phase 4: Authorization Bypass via Metadata

gRPC auth is almost always implemented as custom interceptor logic reading request **metadata** (headers), not a framework default — meaning it's easy to get wrong per-method.

```bash
# Call a sensitive method with no auth metadata at all
grpcurl -plaintext TARGET:PORT PackageName.AdminService.DeleteUser

# Call with a token from a *different*, lower-privileged account (BOLA/IDOR)
grpcurl -plaintext -H 'authorization: Bearer LOW_PRIV_TOKEN' \
  -d '{"user_id": "OTHER_USERS_ID"}' \
  TARGET:PORT PackageName.UserService.GetUserDetails

# Try case/whitespace variants of the metadata key — some interceptors match exact-case only
grpcurl -plaintext -H 'Authorization: Bearer TOKEN' TARGET:PORT PackageName.Service.Method
```

Enumerate every method found in Phase 2 and call each one both unauthenticated and cross-account — interceptors are frequently applied to some methods/services and forgotten on others (especially newly added RPCs).

### Phase 5: gRPC-Web Proxy Quirks

Browser clients can't speak raw HTTP/2 gRPC, so deployments front it with a translation proxy (Envoy, grpc-web, or a custom gateway). The proxy is a distinct attack surface from the gRPC service itself.

```bash
# The proxy re-exposes gRPC over HTTP/1.1 — test it with normal web attack tooling too
curl -s -X POST https://TARGET/package.Service/Method \
  -H 'content-type: application/grpc-web-text' \
  --data-binary @request.b64

# CORS on the grpc-web endpoint — misconfigured origin reflection is common
curl -s -I -X OPTIONS https://TARGET/package.Service/Method \
  -H 'Origin: https://evil.example' \
  -H 'Access-Control-Request-Method: POST'
```

Check whether the proxy enforces the *same* per-method authorization as the backend, or whether it's a naive pass-through — proxies added late in a project's life frequently skip auth entirely and rely on "the backend will check," which Phase 4 may have just disproven.

### Phase 6: Message-Level Abuse

```bash
# Oversized / malformed messages — streaming RPCs are a common DoS vector
grpcurl -plaintext -d '{"data": "'$(python3 -c 'print("A"*50000000)')'"}' \
  TARGET:PORT PackageName.Service.StreamingMethod

# Fuzz message fields with protoscope for wire-format-level mutation
protoscope -s < captured_request.bin | protoscope > mutated_request.bin
```

## Skill Usage

```
skill search --tech grpc,protobuf
skill load wstg-apit-01      # API recon methodology
skill load attack-graphql    # if the same backend also exposes GraphQL
```

## What Constitutes a Finding

| Finding | Severity |
|---------|----------|
| Reflection enabled in production (full schema disclosure) | Medium (P3) |
| Plaintext channel accepted in production | High (P2) |
| mTLS advertised but client cert not actually validated | High (P2) |
| Sensitive RPC callable with no auth metadata | Critical (P1) |
| Cross-account data access via RPC (BOLA) | Critical (P1) |
| gRPC-Web proxy skips authorization the backend enforces | Critical (P1) |
| Permissive CORS on grpc-web endpoint carrying auth metadata | High (P2) |
| Unbounded message size on streaming RPC (DoS) | Medium (P3) |

## Tools

| Tool | Purpose |
|------|---------|
| grpcurl | CLI client for reflection, listing, describing, and invoking RPCs |
| grpcui | Web UI equivalent of grpcurl — good for manual exploration |
| evans | Interactive gRPC REPL client |
| ghz | Load/stress testing a specific RPC (DoS and rate-limit checks) |
| protoscope | Wire-format disassembler/assembler for raw protobuf fuzzing |
| Wireshark (with protobuf/gRPC dissector) | Inspect raw HTTP/2 frames when reflection is disabled |

## References

- OWASP API Security Top 10 (BOLA, broken authentication apply directly to gRPC RPCs)
- gRPC Authentication docs (github.com/grpc/grpc/blob/master/doc/grpc-auth-support.md)
