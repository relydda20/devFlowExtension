import * as vscode from 'vscode';
import { OutputChannelService } from '../services/outputChannelService';
import { TelemetryAggregator } from '../services/telemetryAggregator';
import { nowIso } from '../utils/timestampUtils';
import { getWorkspaceName } from '../utils/workspaceUtils';

interface GitExtension {
    getAPI(version: 1): GitApi;
}

interface GitApi {
    repositories: GitRepository[];
    onDidOpenRepository: vscode.Event<GitRepository>;
}

interface GitRepository {
    state: {
        HEAD?: {
            name?: string;
        };
        workingTreeChanges: unknown[];
        indexChanges: unknown[];
        onDidChange: vscode.Event<void>;
    };
}

export function registerGitListener(
    context: vscode.ExtensionContext,
    aggregator: TelemetryAggregator,
    output: OutputChannelService
): void {
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;

    if (!gitExtension) {
        output.warn('Git listener skipped: built-in Git extension API is unavailable.');
        return;
    }

    try {
        const gitApi = gitExtension.getAPI(1);
        gitApi.repositories.forEach((repository) => watchRepository(context, repository, aggregator, output));
        context.subscriptions.push(
            gitApi.onDidOpenRepository((repository) => watchRepository(context, repository, aggregator, output))
        );
        output.info('Git listener registered.');
    } catch (error) {
        output.warn(`Git listener registration error: ${formatError(error)}`);
    }
}

function watchRepository(
    context: vscode.ExtensionContext,
    repository: GitRepository,
    aggregator: TelemetryAggregator,
    output: OutputChannelService
): void {
    let lastSnapshot = getChangedFilesCount(repository);

    context.subscriptions.push(
        repository.state.onDidChange(() => {
            try {
                const changedFilesCount = getChangedFilesCount(repository);

                if (changedFilesCount === lastSnapshot) {
                    return;
                }

                lastSnapshot = changedFilesCount;
                aggregator.collect({
                    type: 'git_activity',
                    timestamp: nowIso(),
                    workspace: getWorkspaceName(),
                    git: {
                        branch: repository.state.HEAD?.name,
                        changed_files_count: changedFilesCount
                    }
                });
            } catch (error) {
                output.warn(`Git repository listener error: ${formatError(error)}`);
            }
        })
    );
}

function getChangedFilesCount(repository: GitRepository): number {
    return repository.state.workingTreeChanges.length + repository.state.indexChanges.length;
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
