import * as vscode from 'vscode';
import { TelemetryAggregator } from '../services/telemetryAggregator';
import { OutputChannelService } from '../services/outputChannelService';
import { buildFileMetadata, shouldTrackDocument } from '../utils/pathUtils';
import { nowIso } from '../utils/timestampUtils';
import { getWorkspaceName } from '../utils/workspaceUtils';

export function registerFileSaveListener(
    context: vscode.ExtensionContext,
    aggregator: TelemetryAggregator,
    output: OutputChannelService
): void {
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            try {
                if (!shouldTrackDocument(document)) {
                    return;
                }

                aggregator.collect({
                    type: 'file_save',
                    timestamp: nowIso(),
                    workspace: getWorkspaceName(),
                    file: buildFileMetadata(document)
                });
            } catch (error) {
                output.warn(`File save listener error: ${formatError(error)}`);
            }
        })
    );

    output.info('File save listener registered.');
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
