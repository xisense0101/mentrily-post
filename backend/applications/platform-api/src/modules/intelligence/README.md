# Intelligence Module

Handles analytics, reporting, dashboards, and data-driven insights.

**Important**: This module is focused on data intelligence (analytics/reporting). AI-assisted product features (e.g., AI content generation or AI grading) are owned by the specific domain modules that use them (e.g., `content-studio` for authoring, `assessment-delivery` for grading).

## Layers

- **presentation/**: Dashboard and reporting API controllers.
- **application/**: Orchestrates report generation, data aggregation, and insight calculation.
- **domain/**: `Metric`, `Report`, `Insight` entities and analytical models.
- **infrastructure/**: Analytical database (e.g., ClickHouse) and data warehouse adapters.
- **tests/**: Report accuracy and data aggregation tests.
