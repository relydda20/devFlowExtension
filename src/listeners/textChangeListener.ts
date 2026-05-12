import * as vscode from 'vscode';
import { isLargePaste } from '../heuristics/largePasteHeuristic';
import { isPossibleRewrite } from '../heuristics/rewriteHeuristic';
import { isPossibleUndoCycle } from '../heuristics/undoPatternHeuristic';
import { OutputChannelService } from '../services/outputChannelService';
import { TelemetryAggregator } from '../services/telemetryAggregator';
import { buildFileMetadata, shouldTrackDocument, toRelativePath } from '../utils/pathUtils';
import { nowIso } from '../utils/timestampUtils';
import { getWorkspaceName } from '../utils/workspaceUtils';

const lastEditByFile = new Map<string, number>();

export function registerTextChangeListener(
    context: vscode.ExtensionContext,
    aggregator: TelemetryAggregator,
    output: OutputChannelService
): void {
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            try {
                if (!shouldTrackDocument(event.document) || event.contentChanges.length === 0) {
                    return;
                }

                const filePath = toRelativePath(event.document.uri);
                const timestamp = Date.now();
                const lastEditAt = lastEditByFile.get(filePath) ?? timestamp;
                lastEditByFile.set(filePath, timestamp);

                const charactersAdded = event.contentChanges.reduce((sum, change) => sum + change.text.length, 0);
                const charactersDeleted = event.contentChanges.reduce(
                    (sum, change) => sum + Math.max(0, change.rangeLength),
                    0
                );

                aggregator.collect({
                    type: 'text_change',
                    timestamp: nowIso(),
                    workspace: getWorkspaceName(),
                    file: buildFileMetadata(event.document),
                    metrics: {
                        characters_added: charactersAdded,
                        characters_deleted: charactersDeleted,
                        change_count: event.contentChanges.length,
                        affected_line_ranges: event.contentChanges.map((change) => ({
                            start: change.range.start.line + 1,
                            end: change.range.end.line + 1
                        })),
                        edit_duration_ms: Math.max(0, timestamp - lastEditAt),
                        is_large_paste: isLargePaste(charactersAdded),
                        is_possible_rewrite: isPossibleRewrite(filePath, charactersAdded, charactersDeleted, timestamp),
                        is_possible_undo_cycle: isPossibleUndoCycle(filePath, charactersAdded, charactersDeleted, timestamp)
                    }
                });
            } catch (error) {
                output.warn(`Text change listener error: ${formatError(error)}`);
            }
        })
    );

    output.info('Text change listener registered.');
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
