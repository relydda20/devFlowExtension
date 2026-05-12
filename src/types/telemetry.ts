export type TelemetryEventType =
    | 'file_save'
    | 'text_change'
    | 'editor_switch'
    | 'debug_session_start'
    | 'terminal_open'
    | 'git_activity';

export interface FileTelemetryMetadata {
    name: string;
    path: string;
    absolute_path: string;
    extension: string;
    language: string;
    workspace: string;
    lines: number;
    size_bytes: number;
}

export interface BaseTelemetryEvent {
    type: TelemetryEventType;
    timestamp: string;
    workspace: string;
}

export interface FileSaveTelemetryEvent extends BaseTelemetryEvent {
    type: 'file_save';
    file: FileTelemetryMetadata;
}

export interface TextChangeTelemetryEvent extends BaseTelemetryEvent {
    type: 'text_change';
    file: FileTelemetryMetadata;
    metrics: {
        characters_added: number;
        characters_deleted: number;
        change_count: number;
        affected_line_ranges: Array<{
            start: number;
            end: number;
        }>;
        edit_duration_ms: number;
        is_large_paste: boolean;
        is_possible_rewrite: boolean;
        is_possible_undo_cycle: boolean;
    };
}

export interface EditorSwitchTelemetryEvent extends BaseTelemetryEvent {
    type: 'editor_switch';
    from?: {
        file: string;
        language: string;
        module: string;
    };
    to?: {
        file: string;
        language: string;
        module: string;
    };
    metrics: {
        switch_interval_seconds: number;
        is_cross_module_switch: boolean;
        is_rapid_context_switching: boolean;
    };
}

export interface DebugSessionTelemetryEvent extends BaseTelemetryEvent {
    type: 'debug_session_start';
    debug: {
        name: string;
        type: string;
        launch_configuration_name?: string;
    };
}

export interface TerminalTelemetryEvent extends BaseTelemetryEvent {
    type: 'terminal_open';
    terminal: {
        name: string;
        shell_type?: string;
    };
}

export interface GitActivityTelemetryEvent extends BaseTelemetryEvent {
    type: 'git_activity';
    git: {
        branch?: string;
        changed_files_count: number;
    };
}

export type TelemetryEvent =
    | FileSaveTelemetryEvent
    | TextChangeTelemetryEvent
    | EditorSwitchTelemetryEvent
    | DebugSessionTelemetryEvent
    | TerminalTelemetryEvent
    | GitActivityTelemetryEvent;

export interface TelemetryPayload {
    workspace: string;
    machine_timestamp: string;
    session: {
        active_minutes: number;
        idle_minutes: number;
        total_events_collected: number;
        save_frequency: number;
        editor_switch_frequency: number;
    };
    events: TelemetryEvent[];
}
