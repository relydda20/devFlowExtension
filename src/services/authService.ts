import * as vscode from 'vscode';
import { SECRET_KEY } from '../constants/telemetryConfig';

export type AuthState = 'signed-in' | 'signed-out';

export class AuthService implements vscode.Disposable {
    private readonly stateEmitter = new vscode.EventEmitter<AuthState>();

    public readonly onDidChangeState: vscode.Event<AuthState> = this.stateEmitter.event;

    constructor(private readonly context: vscode.ExtensionContext) {}

    public getToken(): Thenable<string | undefined> {
        return this.context.secrets.get(SECRET_KEY);
    }

    public async setToken(value: string): Promise<void> {
        await this.context.secrets.store(SECRET_KEY, value);
        this.stateEmitter.fire('signed-in');
    }

    public async clearToken(): Promise<void> {
        await this.context.secrets.delete(SECRET_KEY);
        this.stateEmitter.fire('signed-out');
    }

    public async isSignedIn(): Promise<boolean> {
        const token = await this.context.secrets.get(SECRET_KEY);
        return Boolean(token);
    }

    public dispose(): void {
        this.stateEmitter.dispose();
    }
}
