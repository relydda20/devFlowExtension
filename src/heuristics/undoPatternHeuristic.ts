import { UNDO_WINDOW_MS } from '../constants/telemetryConfig';

interface UndoSignal {
    timestamp: number;
    direction: 'insert' | 'delete' | 'mixed';
}

const recentSignalsByFile = new Map<string, UndoSignal[]>();

export function isPossibleUndoCycle(filePath: string, added: number, deleted: number, timestamp = Date.now()): boolean {
    const direction = getDirection(added, deleted);
    const recentSignals = recentSignalsByFile.get(filePath) ?? [];
    const activeSignals = recentSignals.filter((signal) => timestamp - signal.timestamp <= UNDO_WINDOW_MS);
    activeSignals.push({ timestamp, direction });
    recentSignalsByFile.set(filePath, activeSignals);

    if (activeSignals.length < 4) {
        return false;
    }

    const lastFour = activeSignals.slice(-4);
    return lastFour.every((signal) => signal.direction !== 'mixed')
        && lastFour[0].direction !== lastFour[1].direction
        && lastFour[1].direction !== lastFour[2].direction
        && lastFour[2].direction !== lastFour[3].direction;
}

function getDirection(added: number, deleted: number): 'insert' | 'delete' | 'mixed' {
    if (added > 0 && deleted === 0) {
        return 'insert';
    }

    if (deleted > 0 && added === 0) {
        return 'delete';
    }

    return 'mixed';
}
