import * as vscode from 'vscode';
import { isCrossModuleSwitch, isRapidContextSwitching } from '../heuristics/contextSwitchHeuristic';
import { OutputChannelService } from '../services/outputChannelService';
import { TelemetryAggregator } from '../services/telemetryAggregator';
import { getModuleName, shouldTrackDocument, toRelativePath } from '../utils/pathUtils';
import { nowIso } from '../utils/timestampUtils';
import { getWorkspaceName } from '../utils/workspaceUtils';

interface EditorSnapshot {
    file: string;
    language: string;
    module: string;
}

let previousEditor: EditorSnapshot | undefined;
let previousSwitchAt = Date.now();

export function registerEditorSwitchListener(
    context: vscode.ExtensionContext,
    aggregator: TelemetryAggregator,
    output: OutputChannelService
): void {
    const activeEditor = vscode.window.activeTextEditor;
    previousEditor = activeEditor && shouldTrackDocument(activeEditor.document)
        ? toEditorSnapshot(activeEditor.document)
        : undefined;

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            try {
                if (!editor || !shouldTrackDocument(editor.document)) {
                    return;
                }

                const timestamp = Date.now();
                const nextEditor = toEditorSnapshot(editor.document);
                const switchIntervalSeconds = Math.round((timestamp - previousSwitchAt) / 1000);

                aggregator.collect({
                    type: 'editor_switch',
                    timestamp: nowIso(),
                    workspace: getWorkspaceName(),
                    from: previousEditor,
                    to: nextEditor,
                    metrics: {
                        switch_interval_seconds: switchIntervalSeconds,
                        is_cross_module_switch: isCrossModuleSwitch(previousEditor?.module, nextEditor.module),
                        is_rapid_context_switching: isRapidContextSwitching(timestamp)
                    }
                });

                previousEditor = nextEditor;
                previousSwitchAt = timestamp;
            } catch (error) {
                output.warn(`Editor switch listener error: ${formatError(error)}`);
            }
        })
    );

    output.info('Editor switch listener registered.');
}

function toEditorSnapshot(document: vscode.TextDocument): EditorSnapshot {
    const file = toRelativePath(document.uri);

    return {
        file,
        language: document.languageId,
        module: getModuleName(file)
    };
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
