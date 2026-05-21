# Cloudflare Edge Model

## Responsibilities

- DNS and tenant domain management
- CDN caching and global acceleration
- WAF and bot protection
- Rate limiting
- Tenant routing
- Signed asset protection

## Tenant routing

- Hostname/subdomain maps to tenant/workspace context.
- Unknown domains fail closed.

## Custom domains

- Domain ownership verification required.
- Per-tenant routing metadata is centrally managed.

## Asset protection

- Sensitive media served via signed URL/token policies.
- Edge validation occurs before origin access.

## Cache rules

- Cache static/public content aggressively.
- Bypass or carefully scope caching for personalized/tenant-sensitive responses.
