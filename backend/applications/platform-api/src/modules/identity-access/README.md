# Identity and Access Module

Handles the internal representation of users (Principals), links to external identity providers (e.g., Clerk), invitations, and the orchestration of permission policy evaluations.

This module does **not** own password hashing, login forms, or core credential processing; these are delegated to external Identity Providers (IDPs).

## Domain Model

### Entities

- **Principal**: The internal representation of a person or service entity within Mentrily.
- **ExternalIdentity**: A link to a credential managed by an external provider (e.g., Clerk user ID).
- **Invitation**: Orchestrates the flow for onboarding new users into a workspace.
- **AccessSession**: Encapsulates the current authentication context for a request.
- **ServiceCredential**: Manages non-human identities for API access.

### Value Objects & Enums

- **PrincipalId**: Strongly typed identifier for principals.
- **ExternalProvider**: Enum of supported IDPs (CLERK, GOOGLE, GITHUB).
- **PrincipalStatus**: Status lifecycle (ACTIVE, SUSPENDED, DELETED).
- **InvitationStatus**: Lifecycle of an invite (PENDING, ACCEPTED, REVOKED, EXPIRED).
- **ServiceCredentialStatus**: Lifecycle of an API key (ACTIVE, REVOKED, EXPIRED).

### Repositories

- **PrincipalRepository**: Persistence for internal identities.
- **ExternalIdentityRepository**: Mapping between internal and external identities.
- **AccessSessionRepository**: Session state management.
- **InvitationRepository**: Invitation lifecycle management.
- **ServiceCredentialRepository**: API key management.

### Domain Events

- `PrincipalProvisioned`
- `ExternalIdentityLinked`
- `InvitationCreated`
- `InvitationAccepted`
- `InvitationRevoked`
- `ServiceCredentialIssued`
- `ServiceCredentialRevoked`

## Layers

- **presentation/**: Internal API controllers and webhooks for syncing identity events (e.g., Clerk webhooks).
- **application/**: Use cases for invitations, identity linking, and session management.
- **domain/**: Entities, Value Objects, and Repository Interfaces.
- **infrastructure/**: Adapters for external identity providers (Clerk) and database persistence.
- **tests/**: Unit and integration tests for identity and access logic.
