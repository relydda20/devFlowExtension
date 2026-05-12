import { RAPID_SWITCH_THRESHOLD, RAPID_SWITCH_WINDOW_MS } from '../constants/telemetryConfig';

const switchTimestamps: number[] = [];

export function isCrossModuleSwitch(previousModule: string | undefined, nextModule: string | undefined): boolean {
    return Boolean(previousModule && nextModule && previousModule !== nextModule);
}

export function isRapidContextSwitching(timestamp = Date.now()): boolean {
    switchTimestamps.push(timestamp);

    while (switchTimestamps.length > 0 && timestamp - switchTimestamps[0] > RAPID_SWITCH_WINDOW_MS) {
        switchTimestamps.shift();
    }

    return switchTimestamps.length > RAPID_SWITCH_THRESHOLD;
}
