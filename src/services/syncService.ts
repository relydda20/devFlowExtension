import axios, { AxiosError } from 'axios';
import * as vscode from 'vscode';
import {
    CONFIGURATION_KEY,
    DEFAULT_API_URL,
    DEFAULT_SYNC_INTERVAL_SECONDS
} from '../constants/telemetryConfig';
import { TelemetryPayload } from '../types/telemetry';
import { nowIso } from '../utils/timestampUtils';
import { getWorkspaceName } from '../utils/workspaceUtils';
import { OutputChannelService } from './outputChannelService';
import { SessionService } from './sessionService';
import { TelemetryBufferService } from './telemetryBufferService';

export interface SyncResult {
    ok: boolean;
    sentCount: number;
    errorMessage?: string;
}

export class SyncService implements vscode.Disposable {
    private timer?: NodeJS.Timeout;

    constructor(
        private readonly buffer: TelemetryBufferService,
        private readonly session: SessionService,
        private readonly output: OutputChannelService
    ) {}

    public start(): void {
        this.stop();
        const intervalSeconds = this.getSyncIntervalSeconds();
        this.output.info(`Synchronization scheduled every ${intervalSeconds} second(s).`);
        this.timer = setInterval(() => {
            void this.sync();
        }, intervalSeconds * 1000);
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    public async sync(): Promise<SyncResult> {
        const events = this.buffer.getQueuedTelemetry();

        if (events.length === 0) {
            return { ok: true, sentCount: 0 };
        }

        const payload: TelemetryPayload = {
            workspace: getWorkspaceName(),
            machine_timestamp: nowIso(),
            session: this.session.getSnapshot(),
            events
        };

        this.output.info(`Synchronization started: ${events.length} event(s).`);

        try {
            await axios.post(this.getApiUrl(), payload, {
                timeout: 10000
            });
            this.buffer.clearSuccessfulBatch(events.length);
            this.output.info(`Synchronization success: ${events.length} event(s) sent.`);
            return { ok: true, sentCount: events.length };
        } catch (error) {
            const errorMessage = this.formatError(error);
            this.output.warn(`Synchronization failure: ${errorMessage}`);
            this.output.warn('Retry scheduled for next synchronization cycle.');
            return { ok: false, sentCount: 0, errorMessage };
        }
    }

    public dispose(): void {
        this.stop();
    }

    private getApiUrl(): string {
        return vscode.workspace.getConfiguration(CONFIGURATION_KEY).get<string>('apiUrl', DEFAULT_API_URL);
    }

    private getSyncIntervalSeconds(): number {
        const configured = vscode.workspace
            .getConfiguration(CONFIGURATION_KEY)
            .get<number>('syncIntervalSeconds', DEFAULT_SYNC_INTERVAL_SECONDS);

        return Math.max(1, configured);
    }

    private formatError(error: unknown): string {
        if (axios.isAxiosError(error)) {
            return this.formatAxiosError(error);
        }

        if (error instanceof Error) {
            return error.message;
        }

        return String(error);
    }

    private formatAxiosError(error: AxiosError): string {
        if (error.response) {
            return `HTTP ${error.response.status} ${error.response.statusText}`;
        }

        return error.message;
    }
}
