import * as vscode from 'vscode';

export function getWorkspaceName(): string {
    return vscode.workspace.workspaceFolders?.[0]?.name ?? 'untitled-workspace';
}

export function getWorkspaceFolderName(uri: vscode.Uri | undefined): string {
    if (!uri) {
        return getWorkspaceName();
    }

    return vscode.workspace.getWorkspaceFolder(uri)?.name ?? getWorkspaceName();
}
