import { RawTelemetryEvent, TelemetryEvent } from '../types/telemetry';
import { SessionService } from './sessionService';
import { TelemetryBufferService } from './telemetryBufferService';

export class TelemetryAggregator {
    constructor(
        private readonly buffer: TelemetryBufferService,
        private readonly session: SessionService
    ) {}

    public collect(event: RawTelemetryEvent): void {
        const stamped = { ...event, session_id: this.session.getSessionId() } as TelemetryEvent;
        this.session.recordEvent(stamped);
        this.buffer.append(stamped);
    }
}
