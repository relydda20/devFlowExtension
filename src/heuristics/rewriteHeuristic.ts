import { REWRITE_CHARACTER_THRESHOLD, REWRITE_WINDOW_MS } from '../constants/telemetryConfig';

interface RewriteCandidate {
    timestamp: number;
    added: number;
    deleted: number;
}

const recentChangesByFile = new Map<string, RewriteCandidate>();

export function isPossibleRewrite(filePath: string, added: number, deleted: number, timestamp = Date.now()): boolean {
    const previous = recentChangesByFile.get(filePath);
    recentChangesByFile.set(filePath, { timestamp, added, deleted });

    if (!previous || timestamp - previous.timestamp > REWRITE_WINDOW_MS) {
        return false;
    }

    const deletionThenInsertion = previous.deleted >= REWRITE_CHARACTER_THRESHOLD && added >= REWRITE_CHARACTER_THRESHOLD;
    const insertionThenDeletion = previous.added >= REWRITE_CHARACTER_THRESHOLD && deleted >= REWRITE_CHARACTER_THRESHOLD;

    return deletionThenInsertion || insertionThenDeletion;
}
