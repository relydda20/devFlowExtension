import * as vscode from 'vscode';
import {
    CONFIGURATION_KEY,
    IDLE_SESSION_TIMEOUT_MS,
    IDLE_SESSION_TIMEOUT_MIN_MS
} from '../constants/telemetryConfig';
import { RawTelemetryEvent, TelemetryEvent } from '../types/telemetry';
import { SessionService } from './sessionService';
import { TelemetryBufferService } from './telemetryBufferService';

const DEFAULT_TIMEOUT_MINUTES = IDLE_SESSION_TIMEOUT_MS / 60000;

export class TelemetryAggregator {
    constructor(
        private readonly buffer: TelemetryBufferService,
        private readonly session: SessionService
    ) {}

    public collect(event: RawTelemetryEvent): void {
        if (this.shouldRotateForIdle()) {
            this.session.rotate('idle');
        }
        const stamped = { ...event, session_id: this.session.getSessionId() } as TelemetryEvent;
        this.session.recordEvent(stamped);
        this.buffer.append(stamped);
    }

    private shouldRotateForIdle(): boolean {
        const timeoutMs = this.getIdleTimeoutMs();
        return Date.now() - this.session.getLastActivityAt() > timeoutMs;
    }

    private getIdleTimeoutMs(): number {
        const minutes = vscode.workspace
            .getConfiguration(CONFIGURATION_KEY)
            .get<number>('idleSessionTimeoutMinutes', DEFAULT_TIMEOUT_MINUTES);
        const raw = Number(minutes) * 60000;
        if (!Number.isFinite(raw) || raw < IDLE_SESSION_TIMEOUT_MIN_MS) {
            return IDLE_SESSION_TIMEOUT_MIN_MS;
        }
        return raw;
    }
}
