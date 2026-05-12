import { TelemetryEvent } from '../types/telemetry';
import { SessionService } from './sessionService';
import { TelemetryBufferService } from './telemetryBufferService';

export class TelemetryAggregator {
    constructor(
        private readonly buffer: TelemetryBufferService,
        private readonly session: SessionService
    ) {}

    public collect(event: TelemetryEvent): void {
        this.session.recordEvent(event);
        this.buffer.append(event);
    }
}
