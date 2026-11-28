# Dawwar team and prompts

The system prompts and settings for every employee live in `server/src/agents.js` (`seedAgents`). Edit them there; this file only lists the team.

| Employee | Role | Department |
|---|---|---|
| عمر (Omar) | Marketing Specialist | Marketing |
| مريم | Data Analyst | Data & Analytics |
| يوسف | Finance Specialist | Finance |
| سلمى | Content Creator | Content & Creative |
| زياد | Software Developer | Technology |
| نور | HR & Operations Specialist | People & Operations |

All employees share one base prompt (NEXLOVA context, no claiming access to systems they are not connected to). Omar has an extended marketing prompt with NEXLOVA brand rules and can publish through Buffer; see `publishing-api.md`.
