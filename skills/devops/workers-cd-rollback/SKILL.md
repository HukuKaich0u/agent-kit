---
name: cloudflare-workers-cd-rollback
description: "GitHub Actions CD for a Cloudflare Worker with auto-rollback on smoke failure. Use when you want push-to-deploy with safety: capture pre-deploy version, deploy, smoke, rollback if smoke fails."
---

# Cloudflare Workers CD with auto-rollback

A three-workflow CD setup:
- `deploy.yml` (reusable, `workflow_call`) — the actual deploy chain: capture pre-deploy version_id → apply D1 migrations → build → deploy → smoke → auto-rollback if smoke failed → summary report.
- `cd-staging.yml` — fires on push to `main`, calls `deploy.yml` with `environment: staging`.
- `cd-production.yml` — fires on push to `release`, calls `deploy.yml` with `environment: production`.

The chain catches production-only bugs (BigInt hangs, missing env, region-only routing) without a human in the loop — failed smoke automatically restores the previous Worker version.

## When to invoke

Use when you're:
- Setting up CD for a new Cloudflare Worker and want safety beyond "wrangler deploy".
- Adding rollback to an existing manual-deploy project.
- Debugging a deploy that should have rolled back but didn't — the common causes are documented in `references/cd-traps.md`.

## Pipeline shape

```
push to main      ──► cd-staging.yml      ──┐
                                            │ uses: deploy.yml
push to release   ──► cd-production.yml   ──┘
                       │
                       ├─ capture pre-deploy version_id (first_deploy detection)
                       ├─ apply D1 migrations
                       ├─ build (project-specific — the bundled deploy.yml uses MoonBit's `moon build` as its example; replace with your build command)
                       ├─ wrangler deploy
                       ├─ smoke (continue-on-error)
                       ├─ if smoke failed: wrangler rollback <pre_deploy_id>
                       ├─ report summary
                       └─ fail the job if smoke failed (held until after rollback)
```

## What's in here

### `assets/workflows/deploy.yml`

The reusable workflow. Inputs: `environment` (staging|production), optional `message`, `skip_smoke`, `skip_rollback`. Calls `wrangler` through dotenvx so all Cloudflare credentials decrypt from a single committed `.env.cloudflare` file (rotating one repo secret rotates every CF cred).

Notable bits:
- **Pre-deploy version_id capture** handles the "Worker doesn't exist yet" first-deploy case (CF error 10007). The rollback step skips cleanly when there's no prior version.
- **`bash -e` workaround**: `set +e` before the `wrangler deployments list` call so a non-zero exit doesn't kill the step before we can branch on the actual error message.
- **`github.sha` instead of `head_commit.message`** in the deploy message. Commit bodies contain newlines + shell metachars; YAML-interpolating them is unsafe (`--yes` or `wrangler` inside a commit body would be parsed as shell tokens).

### `assets/workflows/cd-staging.yml` + `cd-production.yml`

Thin wrappers. Both include a `precheck` job that materializes `secrets.DOTENV_PRIVATE_KEY_CLOUDFLARE` presence into a job output and gates the `deploy` job via `needs:` + `if:`. Without this gate, the upstream starter-kit repo (no secret configured) gets a red CI on every push.

### `assets/scripts/smoke.ts`

Minimal smoke runner. Reads `SMOKE_BASE_URL`, optional `CF_ACCESS_CLIENT_ID/SECRET`, runs a configurable list of `{path, expectStatus}` probes. Returns non-zero if any check failed; `deploy.yml`'s rollback step keys on this exit code.

## .env.cloudflare contract

Single dotenvx-encrypted file is the source of truth for every Cloudflare credential. Repo only needs ONE GitHub Actions secret: `DOTENV_PRIVATE_KEY_CLOUDFLARE`. Rotating that key rotates every CF credential. This `.env.cloudflare` + dotenvx layout is this skill's assumed convention, not a hard requirement — adapt it to your project's existing secrets-management setup if it differs.

Keys this skill expects:

| Key | Used by |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | every `wrangler …` call |
| `CLOUDFLARE_ACCOUNT_ID` | wrangler scope |
| `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` | smoke against Access-gated prod |
| `CF_ACCESS_CLIENT_ID_STAGING` / `CF_ACCESS_CLIENT_SECRET_STAGING` | smoke against staging |

`dotenvx set KEY VALUE -f file` is **space-separated**, not `KEY=VALUE`. The latter form errors out with "missing required argument 'value'".

## References

- [`references/cd-traps.md`](references/cd-traps.md) — 8 specific GitHub Actions + wrangler traps the workflows compensate for. Read before debugging a deploy that "should have worked".

## Source

Runnable upstream references: [`mizchi/cloudflare-starterkit-mbt`](https://github.com/mizchi/cloudflare-starterkit-mbt) has a minimal runnable starter; [`mizchi/mnemo`](https://github.com/mizchi/mnemo) has a more elaborated version with multi-D1-shard migrations + utels-sourcemap upload integrated.

## Boundaries

- Do NOT deploy without capturing the pre-deploy version_id first — it is the only rollback target if smoke fails.
- Do NOT disable the auto-rollback step to "make CI green" — a red CI on smoke failure is the workflow doing its job, not a bug to silence.
- A smoke-test failure after rollback must fail the workflow (see "Fail the workflow if smoke failed") — a rollback that succeeds does not make the underlying deploy attempt a pass.

## Agent compatibility

- Claude と Codex のどちらでも使える。中身は GitHub Actions の CD パイプライン + `wrangler` なので harness 非依存。`gh` / `wrangler` が PATH にあればどの agent からでも組める。
