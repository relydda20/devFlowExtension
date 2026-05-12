import * as path from 'path';
import * as vscode from 'vscode';
import { FileTelemetryMetadata } from '../types/telemetry';
import { getWorkspaceFolderName } from './workspaceUtils';

export function shouldTrackDocument(document: vscode.TextDocument | undefined): document is vscode.TextDocument {
    return document?.uri.scheme === 'file';
}

export function toRelativePath(uri: vscode.Uri): string {
    return vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
}

export function getModuleName(relativePath: string | undefined): string {
    if (!relativePath) {
        return 'unknown';
    }

    const normalized = relativePath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);

    if (parts.length >= 2 && parts[0] === 'src') {
        return `${parts[0]}/${parts[1]}`;
    }

    return parts[0] ?? 'root';
}

export function buildFileMetadata(document: vscode.TextDocument): FileTelemetryMetadata {
    const relativePath = toRelativePath(document.uri);
    const fileName = path.basename(document.uri.fsPath);
    const extension = path.extname(document.uri.fsPath);
    const text = document.getText();

    return {
        name: fileName,
        path: relativePath,
        absolute_path: document.uri.fsPath,
        extension,
        language: document.languageId,
        workspace: getWorkspaceFolderName(document.uri),
        lines: document.lineCount,
        size_bytes: Buffer.byteLength(text, 'utf8')
    };
}
