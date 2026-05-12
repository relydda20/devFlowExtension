import * as vscode from 'vscode';
import { OutputChannelService } from '../services/outputChannelService';
import { TelemetryAggregator } from '../services/telemetryAggregator';
import { nowIso } from '../utils/timestampUtils';
import { getWorkspaceName } from '../utils/workspaceUtils';

export function registerTerminalListener(
    context: vscode.ExtensionContext,
    aggregator: TelemetryAggregator,
    output: OutputChannelService
): void {
    context.subscriptions.push(
        vscode.window.onDidOpenTerminal((terminal) => {
            try {
                aggregator.collect({
                    type: 'terminal_open',
                    timestamp: nowIso(),
                    workspace: getWorkspaceName(),
                    terminal: {
                        name: terminal.name,
                        shell_type: getShellType(terminal)
                    }
                });
            } catch (error) {
                output.warn(`Terminal listener error: ${formatError(error)}`);
            }
        })
    );

    output.info('Terminal listener registered.');
}

function getShellType(terminal: vscode.Terminal): string | undefined {
    const creationOptions = terminal.creationOptions;

    if ('shellPath' in creationOptions) {
        return creationOptions.shellPath;
    }

    return undefined;
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
