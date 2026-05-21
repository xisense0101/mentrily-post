# Role and Permission Model

## Core Principle

Permissions are the source of authorization truth. Roles are presets that map to permission bundles.

## Experiences vs. Identities

- **Learner/Creator** are **experiences**, not permanent mutually exclusive identities.
- A single person can hold permissions that unlock both learner and creator experiences simultaneously.
- Backend authorization is **permission-based**, using structured keys (e.g., `workspace.members.manage`).

## Membership-driven Access

- Workspace membership grants a principal context within a team or organization.
- Membership in a workspace decides access for team-based plans.
- **Free/Personal Accounts**: Remain personal and do not require automatic workspace creation. They exist outside the organizational workspace model but can be invited into one.

## Identity Provider Separation

- **Clerk** is an external identity provider (IDP).
- Clerk does **not** own Mentrily's internal domain model.
- Mentrily maps external Clerk IDs to internal `Principal` entities which are then governed by internal workspace membership and permission rules.

## Super-admin Separation

- Platform super-admin capabilities are isolated from workspace permissions and must be tightly audited.

## Auditability Requirements

- All privileged permission changes are logged.
- Policy evaluation denials and overrides are traceable.
- Security investigations can reconstruct who had what permission and when.
