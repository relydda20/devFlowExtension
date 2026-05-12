import { IDLE_THRESHOLD_MS } from '../constants/telemetryConfig';

export function isIdle(lastActivityAt: number, timestamp = Date.now()): boolean {
    return timestamp - lastActivityAt > IDLE_THRESHOLD_MS;
}
