import * as vscode from 'vscode';
import { OutputChannelService } from '../services/outputChannelService';
import { TelemetryAggregator } from '../services/telemetryAggregator';
import { nowIso } from '../utils/timestampUtils';
import { getWorkspaceName } from '../utils/workspaceUtils';

export function registerDebugListener(
    context: vscode.ExtensionContext,
    aggregator: TelemetryAggregator,
    output: OutputChannelService
): void {
    context.subscriptions.push(
        vscode.debug.onDidStartDebugSession((session) => {
            try {
                aggregator.collect({
                    type: 'debug_session_start',
                    timestamp: nowIso(),
                    workspace: getWorkspaceName(),
                    debug: {
                        name: session.name,
                        type: session.type,
                        launch_configuration_name: session.configuration.name
                    }
                });
            } catch (error) {
                output.warn(`Debug listener error: ${formatError(error)}`);
            }
        })
    );

    output.info('Debug listener registered.');
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
