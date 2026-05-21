# Workspace Lifecycle

## Lifecycle States

1. **Personal-only**: User exists as a `Principal` without a `Workspace` affiliation (Free/Individual path).
2. **Workspace-provisioned**: Owner creates a `Workspace` entity and baseline governance (roles/permissions) is established.
3. **Activated**: Billing/entitlements and seat model are active.
4. **Operational**: Members, teams, and domain settings are managed.
5. **Suspended**: Policy/billing hold with constrained operations.
6. **Archived/Deleted**: Retained for compliance or permanently removed.

## Governance Rules

- **Workspace Membership**: Decides access in team and enterprise plans.
- **Explicit Creation**: Workspace creation is an explicit action; free accounts remain personal and do not trigger automatic workspace creation.
- **Personal Entitlements Without Workspace**: Personal-only principals can still evaluate Free plan entitlements via principal-scoped entitlement subjects without creating a workspace.
- **Experiences**: Principals can hold different roles in different workspaces, switching between learner and creator experiences based on context.
- **Tenancy Isolation**: Resource access is always scoped to the active workspace context in the `RequestContext`.
- **Invitation Acceptance Authorization**: Accepting an invitation is a verified-token onboarding flow that authorizes join actions through invitation state and expiry checks.
- **Admin vs Onboarding Separation**: Invitation acceptance is distinct from admin-driven member management; privileged admin use cases require workspace actor context and are not the authorization source for invitee onboarding.
- **Precondition-First Acceptance**: Invitation prerequisites (including invited-role resolution when specified) are validated before invitation acceptance or membership mutation to prevent partial state updates.
