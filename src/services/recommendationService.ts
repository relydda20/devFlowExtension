import axios from 'axios';
import * as vscode from 'vscode';
import {
    CONFIGURATION_KEY,
    DEFAULT_API_URL
} from '../constants/telemetryConfig';
import { AuthService } from './authService';
import { OutputChannelService } from './outputChannelService';

type PendingRecommendation = {
    id: number;
    state_type: string;
    confidence_score: number;
    recommendation_type: string;
    recommendation_text: string;
    reasoning: string | null;
    user_action: string | null;
    created_at: string;
};

type PendingResponse = { recommendation: PendingRecommendation | null };

const ACTION_LABELS = {
    accepted: 'Take it',
    snoozed: 'Snooze 30m',
    dismissed: 'Dismiss'
} as const;

export class RecommendationService {
    private lastShownId: number | null = null;

    constructor(
        private readonly auth: AuthService,
        private readonly output: OutputChannelService
    ) {}

    public async pollAndNotify(): Promise<void> {
        const token = await this.auth.getToken();
        if (!token) {return;}

        let pending: PendingRecommendation | null;
        try {
            pending = await this.fetchPending(token);
        } catch (err) {
            this.output.warn(`Recommendation poll failed: ${this.formatError(err)}`);
            return;
        }

        if (!pending) {return;}
        if (this.lastShownId === pending.id) {return;}

        this.lastShownId = pending.id;
        void this.showNotification(pending, token);
    }

    private async fetchPending(token: string): Promise<PendingRecommendation | null> {
        const response = await axios.get<PendingResponse>(
            `${this.getApiBaseUrl()}/recommendations/pending`,
            {
                timeout: 10000,
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data?.recommendation ?? null;
    }

    private async showNotification(rec: PendingRecommendation, token: string): Promise<void> {
        const choice = await vscode.window.showInformationMessage(
            rec.recommendation_text,
            ACTION_LABELS.accepted,
            ACTION_LABELS.snoozed,
            ACTION_LABELS.dismissed
        );
        if (!choice) {return;} // user closed the toast without clicking; leave pending

        let action: 'accepted' | 'snoozed' | 'dismissed';
        if (choice === ACTION_LABELS.accepted) {action = 'accepted';}
        else if (choice === ACTION_LABELS.snoozed) {action = 'snoozed';}
        else {action = 'dismissed';}

        try {
            await axios.post(
                `${this.getApiBaseUrl()}/recommendations/${rec.id}/action`,
                { action },
                {
                    timeout: 10000,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            this.output.info(`Recommendation ${rec.id} marked as ${action}.`);
        } catch (err) {
            this.output.warn(`Failed to record recommendation action: ${this.formatError(err)}`);
        }
    }

    private getApiBaseUrl(): string {
        const telemetryUrl = vscode.workspace
            .getConfiguration(CONFIGURATION_KEY)
            .get<string>('apiUrl', DEFAULT_API_URL);
        // Strip the trailing /telemetry (or any other path past /api/v1) to get the v1 base.
        const idx = telemetryUrl.lastIndexOf('/api/v1');
        if (idx === -1) {
            // Fall back: assume the URL IS the base.
            return telemetryUrl.replace(/\/$/, '');
        }
        return telemetryUrl.slice(0, idx + '/api/v1'.length);
    }

    private formatError(error: unknown): string {
        if (axios.isAxiosError(error)) {
            return error.response ? `HTTP ${error.response.status}` : error.message;
        }
        return error instanceof Error ? error.message : String(error);
    }
}
