# Go Runtime

Go runtime is reserved for specialized workloads only:

- connector runtime / integrations
- future realtime runtime
- future execution runtime

No business-domain features should be implemented here unless justified by concurrency/integration constraints.

Execution runtime status:

- Execution orchestration is reserved for future work.
- 011G adds only a safe provider boundary in `platform-api`; Go runtime still exposes no production executor.
- No production-ready execution API exists yet.
- No sandbox implementation exists yet.
- Execution providers must be isolated from platform-api.
- Execution output must be size-limited.
- Execution must enforce timeout and memory limits.
- Execution nodes must never receive database credentials.
- Learners must never call execution nodes directly.
- Fixture execution lives in `platform-api` tests/internal harnesses only.
- Notebook execution requires stricter isolation than single-file code execution.
