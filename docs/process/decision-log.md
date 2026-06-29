# Decision Log

- 2026-06-25: Keep the product centered on a Three.js globe interface, `ai-elements`-style assistant components, and Supabase-aligned schema design.
- 2026-06-28: Build the personalized OSINTel as a separate branch and in-app surface (a "My" tab + `/api/personal/*` namespace), leaving the general feed and routes unchanged.
- 2026-06-28: Port the lifescience-research-copilot retrieval and zero-hallucination logic to TypeScript inside the Express server rather than shelling out to the Python `review.py`, to keep the single-Node-process deployment model and reuse existing types and the multi-provider LLM proxy.
- 2026-06-28: Keep the research surface de-identified: only derived gene/cancer tokens are sent to external APIs (Europe PMC, ClinicalTrials.gov); no PatientProfile PII leaves the device.
