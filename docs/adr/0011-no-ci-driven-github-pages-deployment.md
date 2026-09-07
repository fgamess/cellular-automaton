# ADR-0011: No CI-driven GitHub Pages deployment, for now

- **Status:** Accepted
- **Date:** 2026-09-07
- **Related:** ADR-0001

## Context

CA-C's story file named a live demo as an acceptance criterion: the browser delivery published to
GitHub Pages from CI. Before building it, the mechanism was checked against this repository rather
than assumed from the GitHub Actions documentation, because the documentation and the platform
disagree in a way that would otherwise surface as a confusing CI failure partway through the story.

Measured directly against this repository: `has_pages: false`, and `GET
/repos/{owner}/{repo}/pages` returns `404`. Pages is not enabled here. Enabling it from a workflow
was the load-bearing assumption, and it does not hold:

- `actions/configure-pages`'s own `enablement` input documents that turning Pages on requires "a
  token other than `GITHUB_TOKEN`": the default token a workflow runs with cannot do it.
- The underlying call, `POST /repos/{owner}/{repo}/pages`, needs the `administration:write`
  permission, which is **not a grantable scope in a workflow's `permissions:` block at all**. There
  is no `permissions:` entry that reaches it.
- A job-level `permissions:` block **replaces** the workflow-level one rather than merging with it, a
  detail that would otherwise silently drop permissions a different job in the same file depends on.
- The current action versions are `deploy-pages@v5.0.1`, `upload-pages-artifact@v5.0.0`, and
  `configure-pages@v6.0.0`; both official READMEs pin stale `v3`/`v4` examples, which is the version
  drift that made this worth checking against the platform rather than the docs. Separately,
  `actions/upload-artifact`'s output cannot be deployed directly: `upload-pages-artifact` packages
  it into the tar format `deploy-pages` expects.

So the criterion as scoped, a workflow that both enables Pages and deploys to it, cannot be
satisfied with `GITHUB_TOKEN` alone. Enabling Pages first, once, through the repository's own
Settings UI or an authenticated call outside CI, would unblock `deploy-pages`, but that is a one-time
manual step outside the workflow, not a CI capability, and changes what the acceptance criterion
would actually be asserting.

## Decision

**Drop the GitHub Pages deployment from CA-C.** `pnpm build` still emits a real, working bundle
(`pnpm dev` and `pnpm preview` both serve it), which is what the architecture claim (a browser
delivery exists and runs against the unchanged domain) actually rests on. Publishing that bundle
somewhere reachable is distribution, not proof of the architecture, and the story's substance does
not depend on it.

## Consequences

**Positive**

- CA-C's CI does not carry a step that can only pass after a manual, out-of-band setup step
  (enabling Pages) that CI itself cannot perform: no half-green workflow, no permission a workflow
  cannot actually hold.
- The refuted mechanism is recorded here rather than left to be rediscovered: a later story that
  wants a live demo starts from "Pages must be enabled once, outside CI, before `deploy-pages` can
  run" instead of re-deriving it from action READMEs that pin stale, disagreeing versions.

**Negative / accepted**

- There is no public, browsable build of the current browser delivery. Anyone who wants to see it
  runs `pnpm dev` locally; the README's "Running it" section documents that path and names no demo
  link.
- If a live demo is wanted later, enabling Pages is a one-time manual action (repository Settings, or
  an authenticated API call with a token carrying `administration:write`, never `GITHUB_TOKEN`)
  that has to happen once, outside any workflow, before a `deploy-pages` step in CI would have
  anything to deploy to.

## Alternatives considered

- **Enable Pages from the workflow with `configure-pages`.** Refuted, not merely rejected:
  `configure-pages`'s own `enablement` documentation states it needs a token other than
  `GITHUB_TOKEN`, and the underlying `administration:write` permission is not something a workflow's
  `permissions:` block can grant.
- **Grant broader permissions at the job level to reach `administration:write`.** Not possible:
  `administration:write` is not one of the scopes `permissions:` exposes at all, at either the
  workflow or job level: this is a platform limit, not a configuration gap.
- **Ship the built bundle as a release artifact instead of a live page.** Not pursued: it answers a
  different need (a downloadable build) than the one the acceptance criterion asked for (a reachable
  URL), and nothing in the story depended on either.
