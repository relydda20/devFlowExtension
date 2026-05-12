# DevVital AI

DevVital AI is a lightweight Visual Studio Code extension for developer workflow observability. It collects observable engineering activity inside VS Code, buffers telemetry in memory, and synchronizes batches to a backend service.

It does not analyze emotions, infer mental state, score productivity, detect burnout, or use biometric assumptions. The extension only captures explainable workflow events such as edits, saves, editor switches, debug starts, terminal opens, and lightweight Git activity.

## Tracked Events

- File saves with file metadata, line count, language, size, workspace, and timestamp
- Text changes with added/deleted character counts, changed ranges, edit duration heuristic, large paste, rewrite, and undo-cycle flags
- Active editor switches with previous/next file metadata, switch interval, cross-module switching, and rapid context switching
- Debug session starts with debug name, type, workspace, and launch configuration name
- Terminal opens with terminal name and shell path when available
- Optional Git activity via the built-in Git extension API

## Authentication

The extension authenticates with the backend using a long-lived `dvf_` API token, stored in the OS keychain via VS Code's `SecretStorage` API — never in `settings.json`, logs, or workspace files.

### Sign in via the browser (default)

1. Run **DevVital AI: Sign In** from the command palette.
2. The extension shows a short code (e.g. `BRWN-4F2X`) and opens your browser to the DevFlow website's `/extension/pair` page.
3. Sign in to the website if you are not already, confirm the code matches, and click **Approve**.
4. VS Code receives a freshly minted token automatically — no copy-paste.

### Sign in with a token (fallback for headless environments)

If you cannot open a browser (SSH, restricted container), use **DevVital AI: Sign In with Token** instead and paste a `dvf_` token you minted via `POST /api/v1/auth/tokens` against your JWT session.

If the backend returns HTTP `401`/`403` the status bar changes to `$(alert) DevVital AI: Sign in required` and the sync timer stops. Click the status bar to sign in again — the buffered events are flushed on the next successful sync.

To revoke a token: `DELETE /api/v1/auth/tokens/:id` with your JWT.

## Synchronization

Telemetry is buffered in memory and posted every 60 seconds by default:

```text
POST http://localhost:3000/api/v1/telemetry
Authorization: Bearer dvf_<your-token>
```

Each event carries a `session_id` (UUID v4) generated once per VS Code window activation, so the backend can group events from the same coding session.

Payload shape:

```json
{
  "workspace": "devvital-project",
  "machine_timestamp": "2026-05-12T10:10:00.000Z",
  "session": {
    "active_minutes": 42,
    "idle_minutes": 3,
    "total_events_collected": 128,
    "save_frequency": 4.2,
    "editor_switch_frequency": 8.1
  },
  "events": []
}
```

Failed synchronization keeps the buffer intact and retries on the next interval. Extension behavior is logged in the `DevVital AI` output channel.

## Settings

- `devvitalAI.apiUrl`
  - Default: `http://localhost:3000/api/v1/telemetry`
- `devvitalAI.apiBaseUrl`
  - Default: `""` (derived from `apiUrl`). Set explicitly when your backend is hosted at a different origin from the telemetry endpoint, e.g. `https://api.example.com`.
- `devvitalAI.syncIntervalSeconds`
  - Default: `60`

## Commands

- `DevVital AI: Sign In` — browser pairing (default)
- `DevVital AI: Sign In with Token` — paste-token fallback for headless environments
- `DevVital AI: Flush Telemetry`
- `DevVital AI: Show Telemetry Status`

## Run

```bash
npm install
npm run compile
```

Press `F5` in VS Code to launch the Extension Development Host.
