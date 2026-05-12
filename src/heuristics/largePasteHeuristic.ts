import { LARGE_PASTE_CHARACTER_THRESHOLD } from '../constants/telemetryConfig';

export function isLargePaste(charactersAdded: number): boolean {
    return charactersAdded > LARGE_PASTE_CHARACTER_THRESHOLD;
}
