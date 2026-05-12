import * as vscode from 'vscode';
import { registerDebugListener } from './listeners/debugListener';
import { registerEditorSwitchListener } from './listeners/editorSwitchListener';
import { registerFileSaveListener } from './listeners/fileSaveListener';
import { registerGitListener } from './listeners/gitListener';
import { registerTerminalListener } from './listeners/terminalListener';
import { registerTextChangeListener } from './listeners/textChangeListener';
import { CONFIGURATION_KEY } from './constants/telemetryConfig';
import { OutputChannelService } from './services/outputChannelService';
import { SessionService } from './services/sessionService';
import { SyncService } from './services/syncService';
import { TelemetryAggregator } from './services/telemetryAggregator';
import { TelemetryBufferService } from './services/telemetryBufferService';

export function activate(context: vscode.ExtensionContext): void {
    const output = new OutputChannelService();
    const buffer = new TelemetryBufferService(output);
    const session = new SessionService();
    const aggregator = new TelemetryAggregator(buffer, session);
    const syncService = new SyncService(buffer, session, output);
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    output.info('Extension activated.');

    statusBar.command = 'devvitalAI.showStatus';
    statusBar.tooltip = 'DevVital AI telemetry buffer status';
    statusBar.show();

    const updateStatusBar = () => {
        statusBar.text = `$(pulse) DevVital AI: ${buffer.size()} queued`;
    };

    context.subscriptions.push(output, syncService, statusBar);

    registerFileSaveListener(context, aggregator, output);
    registerTextChangeListener(context, aggregator, output);
    registerEditorSwitchListener(context, aggregator, output);
    registerDebugListener(context, aggregator, output);
    registerTerminalListener(context, aggregator, output);
    registerGitListener(context, aggregator, output);
    output.info('Listeners registered.');

    context.subscriptions.push(
        vscode.commands.registerCommand('devvitalAI.flushTelemetry', async () => {
            const result = await syncService.sync();
            updateStatusBar();

            if (result.ok) {
                vscode.window.showInformationMessage(
                    result.sentCount === 0
                        ? 'DevVital AI: no telemetry waiting to send.'
                        : `DevVital AI: sent ${result.sentCount} telemetry event(s).`
                );
                return;
            }

            vscode.window.showWarningMessage(`DevVital AI: telemetry sync failed. ${result.errorMessage}`);
        }),
        vscode.commands.registerCommand('devvitalAI.showStatus', () => {
            const snapshot = session.getSnapshot();
            vscode.window.showInformationMessage(
                `DevVital AI: ${buffer.size()} queued, ${snapshot.total_events_collected} collected, ${snapshot.active_minutes} active minute(s).`
            );
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (!event.affectsConfiguration(CONFIGURATION_KEY)) {
                return;
            }

            syncService.start();
            output.info('Configuration updated; synchronization timer restarted.');
        })
    );

    syncService.start();
    updateStatusBar();

    const statusInterval = setInterval(updateStatusBar, 5000);
    context.subscriptions.push({
        dispose: () => clearInterval(statusInterval)
    });
}

export function deactivate(): void {}
