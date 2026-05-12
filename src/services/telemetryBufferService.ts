import { MAX_BUFFER_SIZE } from '../constants/telemetryConfig';
import { TelemetryEvent } from '../types/telemetry';
import { OutputChannelService } from './outputChannelService';

export class TelemetryBufferService {
    private readonly telemetryBuffer: TelemetryEvent[] = [];

    constructor(private readonly output: OutputChannelService) {}

    public append(event: TelemetryEvent): void {
        this.telemetryBuffer.push(event);

        if (this.telemetryBuffer.length > MAX_BUFFER_SIZE) {
            const removed = this.telemetryBuffer.splice(0, this.telemetryBuffer.length - MAX_BUFFER_SIZE);
            this.output.warn(`Telemetry buffer reached limit; dropped ${removed.length} oldest event(s).`);
        }

        this.output.info(`Telemetry event captured: ${event.type}`);
    }

    public getQueuedTelemetry(): TelemetryEvent[] {
        return [...this.telemetryBuffer];
    }

    public clearSuccessfulBatch(count: number): void {
        this.telemetryBuffer.splice(0, count);
    }

    public size(): number {
        return this.telemetryBuffer.length;
    }
}
