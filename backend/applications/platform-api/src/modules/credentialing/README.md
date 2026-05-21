# Credentialing Module

Issues and manages certificates, badges, and digital credentials.

## Layers

- **presentation/**: Credential API controllers and verification DTOs.
- **application/**: Orchestrates certificate generation and digital badge issuance.
- **domain/**: `Certificate`, `Badge`, `Credential` entities and issuance rules.
- **infrastructure/**: PDF generation and digital signature adapters.
- **tests/**: Credential integrity and issuance logic tests.
