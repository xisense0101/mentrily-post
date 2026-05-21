# Workspace Governance Module

Manages the lifecycle, configuration, and membership of workspaces (tenants).

## Domain Model

### Entities

- **Workspace**: The core tenant entity representing an organization or project.
- **WorkspaceMember**: Links a Principal to a Workspace with a specific status.
- **WorkspaceRole**: Defines a named set of permissions within a workspace.
- **WorkspacePermission**: Individual permission keys assigned to a role.
- **Team**: Logical grouping of members within a workspace.
- **WorkspaceDomain**: Custom domains associated with and verified for a workspace.
- **WorkspaceBranding**: Visual identity configuration (logo, colors, favicon).

### Value Objects & Enums

- **WorkspaceId**: Strongly typed identifier for workspaces.
- **WorkspaceSlug**: URL-friendly, unique identifier for a workspace with strict validation.
- **WorkspaceStatus**: Lifecycle of a workspace (ACTIVE, SUSPENDED, DELETED).
- **MembershipStatus**: State of a member's affiliation (ACTIVE, INACTIVE).
- **WorkspaceDomainStatus**: Verification state of a domain (PENDING, VERIFIED, FAILED).
- **PermissionKey**: Structured key for permissions (e.g., `workspace.members.manage`).

### Repositories

- **WorkspaceRepository**
- **WorkspaceMemberRepository**
- **WorkspaceRoleRepository**
- **WorkspacePermissionRepository**
- **TeamRepository**
- **WorkspaceDomainRepository**
- **WorkspaceBrandingRepository**

### Domain Events

- `WorkspaceProvisioned`
- `WorkspaceUpdated`
- `WorkspaceSuspended`
- `WorkspaceMemberAdded`
- `WorkspaceMemberRemoved`
- `WorkspaceRoleAssigned`
- `WorkspaceDomainVerified`
- `WorkspaceBrandingUpdated`

## Layers

- **presentation/**: Workspace management endpoints and DTOs.
- **application/**: Orchestrates workspace creation, member invitations, and setting updates.
- **domain/**: Entities, Value Objects, and Repository Interfaces.
- **infrastructure/**: Persistence adapters for workspace data.
- **tests/**: Multi-tenant isolation and governance logic tests.
