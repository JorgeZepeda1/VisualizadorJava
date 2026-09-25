# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Creating a pull request, opening a PR, preparing a branch for submission | branch-pr | /Users/desarrollo/.claude/skills/branch-pr/SKILL.md |
| "how do I do X", "find a skill for X", "is there a skill that can...", extending agent capabilities | find-skills | /Users/desarrollo/.claude/skills/find-skills/SKILL.md |
| Building with Gemini models/API, multimodal content, function calling, structured outputs, current model specs | gemini-api-dev | /Users/desarrollo/.claude/skills/gemini-api-dev/SKILL.md |
| Calling the Gemini API (Interactions API) for text gen, chat, streaming, function calling, migrating from generateContent | gemini-interactions-api | /Users/desarrollo/.claude/skills/gemini-interactions-api/SKILL.md |
| Writing Go tests, using teatest, Bubbletea TUI testing, adding test coverage | go-testing | /Users/desarrollo/.claude/skills/go-testing/SKILL.md |
| Creating a GitHub issue, reporting a bug, requesting a feature | issue-creation | /Users/desarrollo/.claude/skills/issue-creation/SKILL.md |
| "judgment day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | /Users/desarrollo/.claude/skills/judgment-day/SKILL.md |
| Creating a new skill, adding agent instructions, documenting patterns for AI | skill-creator | /Users/desarrollo/.claude/skills/skill-creator/SKILL.md |

Scanned: `~/.claude/skills/` and `~/.gemini/skills/` (identical sets — same skills mirrored to both). Not present on disk: `~/.config/opencode/skills/`, `~/.cursor/skills/`, `~/.copilot/skills/`. Project-level dirs (`.claude/skills/`, `.gemini/skills/`, `.agent/skills/`, `skills/`) do not exist yet in this project (greenfield). Skipped per convention: `sdd-*` (11 SDD workflow skills), `_shared`, `skill-registry`.

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue (`Closes #N`/`Fixes #N`/`Resolves #N`); the linked issue must carry `status:approved`
- Every PR MUST have exactly one `type:*` label matching the commit type (feat→type:feature, fix→type:bug, docs→type:docs, refactor→type:refactor, chore/style/test/build/ci→type:chore, revert→type:bug, `!`→type:breaking-change)
- Branch names MUST match `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- Commit messages MUST match `^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9\._-]+\))?!?: .+`
- No `Co-Authored-By` trailers in commits
- Run shellcheck on modified shell scripts before opening the PR
- PR body requires: linked issue, one type checkbox, 1-3 bullet summary, changes table, test plan, contributor checklist

### find-skills
- Use `npx skills find [query]` to search the open skills ecosystem; check the skills.sh leaderboard first for well-known options
- Before recommending: verify install count (prefer 1K+, be cautious under 100), source reputation (vercel-labs/anthropics/microsoft trusted), GitHub stars
- Install with `npx skills add <owner/repo@skill> -g -y` (`-g` global, `-y` skip confirmation)
- If nothing found, offer to help directly or suggest `npx skills init my-xyz-skill`

### gemini-api-dev
- Only use current models: gemini-3.1-pro-preview, gemini-3-flash-preview, gemini-3.1-flash-lite-preview, gemini-3-pro-image-preview, gemini-3.1-flash-image-preview, gemini-2.5-pro, gemini-2.5-flash — NEVER gemini-2.0-*/1.5-* (deprecated)
- Current SDKs only: `google-genai` (Python), `@google/genai` (JS/TS), `google.golang.org/genai` (Go), `com.google.genai:google-genai` (Java) — never the legacy `google-generativeai`/`@google/generative-ai` packages
- If the `search_documentation` MCP tool is available, use it as the only doc source — never fetch URLs manually when MCP is present
- Fallback docs index: `https://ai.google.dev/gemini-api/docs/llms.txt`
- For realtime audio/video streaming, install the separate `google-gemini/gemini-live-api-dev` skill

### gemini-interactions-api
- Only current models (see gemini-api-dev) plus agent `deep-research-pro-preview-12-2025`; never gemini-2.0-*/1.5-*
- SDKs: `google-genai` >= 1.55.0 (Python), `@google/genai` >= 1.33.0 (JS/TS)
- Use the Interactions API (`client.interactions.create`) instead of legacy `generateContent`/`startChat`; `previous_interaction_id` replaces manual history management
- Agents require `background=True`; poll `client.interactions.get(id)` until status is `completed`/`failed`
- Interactions are stored by default (`store=true`: paid 55 days, free 1 day); `store=false` disables `previous_interaction_id` and `background`
- Re-specify `tools`/`system_instruction`/`generation_config` every turn — they are interaction-scoped, not persisted across turns
- If the `search_documentation` MCP tool is available, use it as the only doc source

### go-testing
- Use table-driven tests (`tests := []struct{name, input, expected, wantErr}`) with `t.Run(tt.name, ...)`
- Test Bubbletea state via `Model.Update()` directly for unit-level assertions; use `teatest.NewTestModel` + `tm.Send(tea.KeyMsg{...})` + `tm.WaitFinished` for full interactive flows
- Use golden-file testing for `View()` output (`testdata/*.golden`; `-update` flag regenerates them)
- Use `t.TempDir()` for file-operation tests; mock `os/exec` via an interface rather than invoking real commands in unit tests
- Commands: `go test ./...`, `go test -cover ./...`, `go test -short ./...` (skips integration tests)

### issue-creation
- Blank issues are disabled — MUST use the Bug Report or Feature Request template
- Every issue auto-gets `status:needs-review`; a maintainer MUST add `status:approved` before any PR can link it
- Questions go to GitHub Discussions, never issues
- Search existing issues for duplicates before creating a new one
- `gh issue create --template "bug_report.yml"|"feature_request.yml"`

### judgment-day
- Launch TWO independent blind judge sub-agents in parallel (never sequential); neither sees the other's findings
- The orchestrator never reviews code itself — only launches judges and synthesizes verdicts
- Classify every WARNING as real (a normal user can trigger it → fix required) or theoretical (needs contrived/malicious conditions → report as INFO only, don't fix, don't block)
- APPROVED requires 0 confirmed CRITICALs + 0 confirmed real WARNINGs; theoretical warnings/suggestions may remain
- After 2 fix+re-judge iterations with issues still remaining, ASK the user before continuing — never auto-escalate
- MUST NOT git push/commit after fixes until re-judgment completes; MUST NOT declare done until every judgment reaches a terminal state (APPROVED/ESCALATED)
- Resolve the project skill registry BEFORE launching judges; inject matching compact rules into both judge prompts and the fix-agent prompt identically

### skill-creator
- Skill dir layout: `skills/{name}/SKILL.md` (required) + optional `assets/` (templates/schemas) + `references/` (LOCAL doc paths only, never web URLs)
- Required frontmatter: `name`, `description` (what + Trigger), `license: Apache-2.0`, `metadata.author`, `metadata.version`
- Don't create a skill for trivial/self-explanatory/one-off patterns — only for repeated patterns or project-specific conventions that diverge from generic best practice
- No "Keywords" section (agent searches frontmatter, not body); keep code examples minimal; no troubleshooting sections
- After creating, register it in `AGENTS.md`: `| {skill-name} | {description} | [SKILL.md](skills/{skill-name}/SKILL.md) |`

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| — | — | Ninguna encontrada todavía. Proyecto greenfield: sin `AGENTS.md`, `CLAUDE.md` de proyecto, `.cursorrules`, `GEMINI.md` ni `copilot-instructions.md` en la raíz de `/Users/desarrollo/VisualizadorJava`. Las reglas específicas del proyecto (idioma, fidelidad JDK 17, cero red en runtime, etc.) viven por ahora en `openspec/config.yaml` → sección `rules`. Vuelve a correr `sdd-init` o el skill `skill-registry` si se agrega un archivo de convenciones más adelante.

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
