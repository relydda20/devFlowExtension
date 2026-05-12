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

## Synchronization

Telemetry is buffered in memory and posted every 60 seconds by default:

```text
POST http://localhost:3000/api/v1/telemetry
```

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
- `devvitalAI.syncIntervalSeconds`
  - Default: `60`

## Commands

- `DevVital AI: Flush Telemetry`
- `DevVital AI: Show Telemetry Status`

## Run

```bash
npm install
npm run compile
```

Press `F5` in VS Code to launch the Extension Development Host.
