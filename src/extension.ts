import * as vscode from 'vscode';
import { registerDebugListener } from './listeners/debugListener';
import { registerEditorSwitchListener } from './listeners/editorSwitchListener';
import { registerFileSaveListener } from './listeners/fileSaveListener';
import { registerGitListener } from './listeners/gitListener';
import { registerTerminalListener } from './listeners/terminalListener';
import { registerTextChangeListener } from './listeners/textChangeListener';
import { CONFIGURATION_KEY } from './constants/telemetryConfig';
import { AuthService } from './services/authService';
import { OutputChannelService } from './services/outputChannelService';
import { SessionService } from './services/sessionService';
import { SyncService, SyncResult } from './services/syncService';
import { TelemetryAggregator } from './services/telemetryAggregator';
import { TelemetryBufferService } from './services/telemetryBufferService';

export function activate(context: vscode.ExtensionContext): void {
    const output = new OutputChannelService();
    const buffer = new TelemetryBufferService(output);
    const session = new SessionService();
    const aggregator = new TelemetryAggregator(buffer, session);
    const auth = new AuthService(context);
    const syncService = new SyncService(buffer, session, auth, output);
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    session.setOutputChannel(output);

    output.info('Extension activated.');

    let signedIn = false;
    let lastAuthFailure = false;

    const updateStatusBar = () => {
        if (!signedIn) {
            statusBar.text = '$(circle-slash) DevVital AI: Signed Out';
            statusBar.command = 'devvitalAI.signIn';
            statusBar.tooltip = 'Click to sign in to DevVital AI';
            return;
        }
        if (lastAuthFailure) {
            statusBar.text = '$(alert) DevVital AI: Sign in required';
            statusBar.command = 'devvitalAI.signIn';
            statusBar.tooltip = 'Click to sign in to DevVital AI';
            return;
        }
        statusBar.text = `$(check) DevVital AI: ${buffer.size()} queued`;
        statusBar.command = 'devvitalAI.showStatus';
        statusBar.tooltip = 'DevVital AI: signed in. Click for telemetry buffer status.';
    };

    const applyResult = (result: SyncResult) => {
        const wasAuthFailure = lastAuthFailure;
        lastAuthFailure = result.authFailure === true;
        if (wasAuthFailure && !lastAuthFailure) {
            syncService.start();
        }
        updateStatusBar();
    };

    const promptReauthAfter401 = async () => {
        const choice = await vscode.window.showWarningMessage(
            'DevVital AI: your session is no longer valid. Telemetry has been paused. Sign in again to resume.',
            'Sign In'
        );
        if (choice === 'Sign In') {
            await vscode.commands.executeCommand('devvitalAI.signIn');
        }
    };

    statusBar.show();

    context.subscriptions.push(
        output,
        auth,
        syncService,
        statusBar,
        auth.onDidChangeState((state) => {
            signedIn = state === 'signed-in';
            if (signedIn) {
                lastAuthFailure = false;
            }
            updateStatusBar();
        })
    );

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
            applyResult(result);

            if (result.ok) {
                vscode.window.showInformationMessage(
                    result.sentCount === 0
                        ? 'DevVital AI: no telemetry waiting to send.'
                        : `DevVital AI: sent ${result.sentCount} telemetry event(s).`
                );
                return;
            }

            if (result.authFailure) {
                void promptReauthAfter401();
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
        vscode.commands.registerCommand('devvitalAI.signIn', async () => {
            const token = await vscode.window.showInputBox({
                password: true,
                ignoreFocusOut: true,
                prompt: 'Paste your DevVital AI API token (starts with dvf_)',
                placeHolder: 'dvf_...',
                validateInput: (value) => value.startsWith('dvf_') ? null : 'Token should start with dvf_'
            });
            if (!token) {
                return;
            }

            await auth.setToken(token);
            const result = await syncService.sync();
            applyResult(result);

            if (result.authFailure) {
                vscode.window.showWarningMessage('DevVital AI: token rejected. Please try again.');
                return;
            }

            vscode.window.showInformationMessage('DevVital AI: signed in.');
        }),
        vscode.commands.registerCommand('devvitalAI.startNewSession', async () => {
            if (!(await auth.isSignedIn())) {
                vscode.window.showInformationMessage('DevVital AI: sign in first to control sessions.');
                return;
            }
            session.rotate('manual_start');
            vscode.window.showInformationMessage('DevVital AI: started a new session.');
        }),
        vscode.commands.registerCommand('devvitalAI.endSession', async () => {
            if (!(await auth.isSignedIn())) {
                vscode.window.showInformationMessage('DevVital AI: sign in first to control sessions.');
                return;
            }
            session.rotate('manual_end');
            vscode.window.showInformationMessage('DevVital AI: session ended; a new one will start on your next edit.');
        }),
        vscode.commands.registerCommand('devvitalAI.signOut', async () => {
            if (!(await auth.isSignedIn())) {
                return;
            }
            const choice = await vscode.window.showWarningMessage(
                'Sign out of DevVital AI? Telemetry will stop until you sign in again.',
                { modal: true },
                'Sign Out'
            );
            if (choice !== 'Sign Out') {
                return;
            }
            await auth.clearToken();
            vscode.window.showInformationMessage('DevVital AI: signed out.');
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (!event.affectsConfiguration(CONFIGURATION_KEY)) {
                return;
            }

            if (signedIn && !lastAuthFailure) {
                syncService.start();
                output.info('Configuration updated; synchronization timer restarted.');
            }
        })
    );

    void (async () => {
        signedIn = await auth.isSignedIn();
        if (signedIn) {
            syncService.start();
        } else {
            output.info('No API token configured; run "DevVital AI: Sign In" to start syncing.');
        }
        updateStatusBar();
    })();

    const statusInterval = setInterval(updateStatusBar, 5000);
    context.subscriptions.push({
        dispose: () => clearInterval(statusInterval)
    });
}

export function deactivate(): void {}
