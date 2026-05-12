import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME } from '../constants/telemetryConfig';

export class OutputChannelService implements vscode.Disposable {
    private readonly channel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

    public info(message: string): void {
        this.channel.appendLine(`[info] ${new Date().toISOString()} ${message}`);
    }

    public warn(message: string): void {
        this.channel.appendLine(`[warn] ${new Date().toISOString()} ${message}`);
    }

    public dispose(): void {
        this.channel.dispose();
    }
}
