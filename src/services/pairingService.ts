import axios from 'axios';
import * as vscode from 'vscode';
import { CONFIGURATION_KEY, DEFAULT_API_BASE_URL, DEFAULT_API_URL } from '../constants/telemetryConfig';
import { OutputChannelService } from './outputChannelService';

const POLL_INTERVAL_MS = 2000;
const BACKOFF_CAP_MS = 30_000;

export interface CreatedPairing {
    pairing_id: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
}

type ExchangeResponse =
    | { status: 'pending' }
    | { status: 'approved'; token: string }
    | { status: 'consumed' }
    | { status: 'expired' };

export type PairingOutcome =
    | { kind: 'approved'; token: string }
    | { kind: 'cancelled' }
    | { kind: 'expired' }
    | { kind: 'error'; message: string };

export class PairingService {
    constructor(private readonly output: OutputChannelService) {}

    public async runPairingFlow(cancelToken: vscode.CancellationToken, onCode: (userCode: string) => void): Promise<PairingOutcome> {
        let pairing: CreatedPairing;
        try {
            pairing = await this.startPairing();
        } catch (err) {
            return { kind: 'error', message: this.formatError(err) };
        }

        onCode(pairing.user_code);

        const verificationUrl = `${pairing.verification_uri}?code=${encodeURIComponent(pairing.user_code)}`;
        try {
            await vscode.env.openExternal(vscode.Uri.parse(verificationUrl));
        } catch (err) {
            this.output.warn(`Could not open browser: ${this.formatError(err)}. Visit ${verificationUrl} manually.`);
        }

        let delay = POLL_INTERVAL_MS;
        while (!cancelToken.isCancellationRequested) {
            await this.sleep(delay, cancelToken);
            if (cancelToken.isCancellationRequested) break;

            try {
                const result = await this.poll(pairing.pairing_id);
                delay = POLL_INTERVAL_MS;
                if (result.status === 'approved') {
                    return { kind: 'approved', token: result.token };
                }
                if (result.status === 'expired') {
                    return { kind: 'expired' };
                }
                if (result.status === 'consumed') {
                    return { kind: 'error', message: 'Pairing was already consumed by another client.' };
                }
            } catch (err) {
                this.output.warn(`Pairing poll failed: ${this.formatError(err)}; backing off.`);
                delay = Math.min(delay * 2, BACKOFF_CAP_MS);
            }
        }

        return { kind: 'cancelled' };
    }

    public async startPairing(): Promise<CreatedPairing> {
        const url = `${this.getApiBaseUrl()}/api/v1/auth/pairings`;
        const res = await axios.post<CreatedPairing>(url, undefined, { timeout: 10_000 });
        return res.data;
    }

    public async poll(pairingId: string): Promise<ExchangeResponse> {
        const url = `${this.getApiBaseUrl()}/api/v1/auth/pairings/${encodeURIComponent(pairingId)}/exchange`;
        try {
            const res = await axios.post<ExchangeResponse>(url, undefined, { timeout: 10_000 });
            return res.data;
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 410) {
                return { status: 'expired' };
            }
            if (axios.isAxiosError(err) && err.response?.status === 429) {
                return { status: 'pending' };
            }
            throw err;
        }
    }

    private getApiBaseUrl(): string {
        const config = vscode.workspace.getConfiguration(CONFIGURATION_KEY);
        const explicit = config.get<string>('apiBaseUrl');
        if (explicit && explicit.length > 0) {
            return explicit.replace(/\/$/, '');
        }
        const telemetryUrl = config.get<string>('apiUrl', DEFAULT_API_URL);
        const stripped = telemetryUrl.replace(/\/api\/v1\/telemetry\/?$/, '');
        return stripped.length > 0 ? stripped : DEFAULT_API_BASE_URL;
    }

    private sleep(ms: number, token: vscode.CancellationToken): Promise<void> {
        return new Promise((resolve) => {
            const handle = setTimeout(() => {
                disposable.dispose();
                resolve();
            }, ms);
            const disposable = token.onCancellationRequested(() => {
                clearTimeout(handle);
                disposable.dispose();
                resolve();
            });
        });
    }

    private formatError(error: unknown): string {
        if (axios.isAxiosError(error)) {
            if (error.response) return `HTTP ${error.response.status} ${error.response.statusText}`;
            return error.message;
        }
        if (error instanceof Error) return error.message;
        return String(error);
    }
}
