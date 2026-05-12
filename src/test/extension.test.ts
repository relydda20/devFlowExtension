import * as assert from 'assert';
import { TelemetryEvent, TelemetryPayload } from '../types/telemetry';

suite('Telemetry Types Test Suite', () => {
    test('builds a valid telemetry payload', () => {
        const events: TelemetryEvent[] = [
            {
                type: 'file_save',
                timestamp: '2026-05-12T10:00:00.000Z',
                workspace: 'project-name',
                file: {
                    name: 'app.ts',
                    path: 'src/app.ts',
                    absolute_path: '/repo/src/app.ts',
                    extension: '.ts',
                    language: 'typescript',
                    workspace: 'project-name',
                    lines: 24,
                    size_bytes: 842
                }
            }
        ];

        const payload: TelemetryPayload = {
            machine_timestamp: '2026-05-12T10:00:00.000Z',
            workspace: 'project-name',
            session: {
                active_minutes: 42,
                idle_minutes: 3,
                total_events_collected: 1,
                save_frequency: 1,
                editor_switch_frequency: 0
            },
            events
        };

        assert.strictEqual(payload.workspace, 'project-name');
        assert.strictEqual(payload.events.length, 1);
        assert.strictEqual(payload.events[0].type, 'file_save');
    });
});
