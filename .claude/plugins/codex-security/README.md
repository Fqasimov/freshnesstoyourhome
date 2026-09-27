# Codex Security skills (vendored)

Security-review skills from OpenAI's Codex Security plugin, copied from
https://github.com/openai/codex-security (plugins/codex-security) at commit
`9abe68ce5d542d3f8e041778424510768bc8e513`, Apache-2.0 (see LICENSE). Unmodified.

The skills live here with the `references/`, `scripts/` and `schemas/`
they read by relative path; `.claude/skills/<name>` links to each one so
Claude Code finds it.

Written for Codex. Left out: `deep-security-scan` (it only runs through the
Codex Security plugin server) and `triage-finding/evals` (a test suite).
`security-scan` and `security-diff-scan` use their prompt-only path here,
since the plugin's MCP tools are not present; their Python helpers need
Python 3.12+.

To update: re-copy the same folders from a newer commit.
