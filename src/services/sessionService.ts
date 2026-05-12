import { randomUUID } from 'crypto';
import { IDLE_THRESHOLD_MS } from '../constants/telemetryConfig';
import { TelemetryEvent } from '../types/telemetry';
import { SessionSnapshot } from '../types/session';
import { isIdle } from '../heuristics/idleDetectionHeuristic';
import { OutputChannelService } from './outputChannelService';

export type RotationReason = 'idle' | 'manual_start' | 'manual_end';

export class SessionService {
    private sessionId: string = randomUUID();
    private startedAt = Date.now();
    private lastActivityAt = this.startedAt;
    private activeMs = 0;
    private idleMs = 0;
    private totalEventsCollected = 0;
    private saveEvents = 0;
    private editorSwitchEvents = 0;
    private rotationCount = 0;
    private output?: OutputChannelService;

    public setOutputChannel(output: OutputChannelService): void {
        this.output = output;
    }

    public getSessionId(): string {
        return this.sessionId;
    }

    public getLastActivityAt(): number {
        return this.lastActivityAt;
    }

    public getRotationCount(): number {
        return this.rotationCount;
    }

    public rotate(reason: RotationReason): string {
        const previousId = this.sessionId;
        this.sessionId = randomUUID();
        const now = Date.now();
        this.startedAt = now;
        this.lastActivityAt = now;
        this.activeMs = 0;
        this.idleMs = 0;
        this.totalEventsCollected = 0;
        this.saveEvents = 0;
        this.editorSwitchEvents = 0;
        this.rotationCount += 1;
        this.output?.info(`Session rotated (reason: ${reason}, previous: ${previousId}, new: ${this.sessionId})`);
        return this.sessionId;
    }

    public recordEvent(event: TelemetryEvent): void {
        const now = Date.now();
        const elapsed = Math.max(0, now - this.lastActivityAt);

        if (isIdle(this.lastActivityAt, now)) {
            this.idleMs += elapsed;
        } else {
            this.activeMs += elapsed;
        }

        this.lastActivityAt = now;
        this.totalEventsCollected += 1;

        if (event.type === 'file_save') {
            this.saveEvents += 1;
        }

        if (event.type === 'editor_switch') {
            this.editorSwitchEvents += 1;
        }
    }

    public getSnapshot(): SessionSnapshot {
        const now = Date.now();
        const activeMs = this.activeMs + (isIdle(this.lastActivityAt, now) ? 0 : Math.max(0, now - this.lastActivityAt));
        const idleMs = this.idleMs + (isIdle(this.lastActivityAt, now) ? Math.max(0, now - this.lastActivityAt) : 0);
        const sessionMinutes = Math.max(1, (now - this.startedAt) / IDLE_THRESHOLD_MS);

        return {
            active_minutes: roundMinutes(activeMs),
            idle_minutes: roundMinutes(idleMs),
            total_events_collected: this.totalEventsCollected,
            save_frequency: Number((this.saveEvents / sessionMinutes).toFixed(2)),
            editor_switch_frequency: Number((this.editorSwitchEvents / sessionMinutes).toFixed(2))
        };
    }
}

function roundMinutes(milliseconds: number): number {
    return Number((milliseconds / 60000).toFixed(2));
}
