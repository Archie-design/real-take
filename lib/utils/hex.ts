export function axialToPixel(q: number, r: number, size: number) {
    const x = size * Math.sqrt(3) * (q + r / 2);
    const y = size * 3 / 2 * r;
    return { x, y };
}

export const axialToPixelPos = axialToPixel;

export function pixelToAxial(x: number, y: number, size: number) {
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
    const r = (2 / 3 * y) / size;
    return axialRound(q, r, -q - r);
}

function axialRound(fq: number, fr: number, fs: number) {
    let q = Math.round(fq);
    let r = Math.round(fr);
    let s = Math.round(fs);

    const qDiff = Math.abs(q - fq);
    const rDiff = Math.abs(r - fr);
    const sDiff = Math.abs(s - fs);

    if (qDiff > rDiff && qDiff > sDiff) {
        q = -r - s;
    } else if (rDiff > sDiff) {
        r = -q - s;
    }
    return { q, r };
}

export const getHexPointsStr = (cx: number, cy: number, r: number): string => {
    let points = "";
    for (let i = 0; i < 6; i++) {
        const angle_rad = (Math.PI / 180) * (60 * i - 30);
        points += `${cx + r * Math.cos(angle_rad)},${cy + r * Math.sin(angle_rad)} `;
    }
    return points;
};

export const getHexRegion = (radius: number): { q: number, r: number }[] => {
    const results: { q: number, r: number }[] = [];
    for (let q = -radius; q <= radius; q++) {
        for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
            results.push({ q, r });
        }
    }
    return results;
};

export const getHexDist = (q1: number, r1: number, q2: number, r2: number): number => {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
};

/**
 * Returns the direction index (0-5) from one hex to an adjacent hex
 */
export function getHexDirection(fromQ: number, fromR: number, toQ: number, toR: number): number {
    const dq = toQ - fromQ;
    const dr = toR - fromR;
    const directions = [
        { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
        { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }
    ];
    return directions.findIndex(d => d.q === dq && d.r === dr);
}

/**
 * Calculates flanking/backstab multiplier based on attacker and target orientations
 * @param attackerPos Attacker's {q, r}
 * @param targetPos Target's {q, r}
 * @param targetFacing Direction the target is currently facing (0-5)
 */
export function getCombatMultiplier(attackerPos: { q: number, r: number }, targetPos: { q: number, r: number }, targetFacing: number): number {
    const attackDir = getHexDirection(attackerPos.q, attackerPos.r, targetPos.q, targetPos.r);

    // Relative direction of attack compared to where target is facing
    // 0: front, 1: front-right, 2: back-right, 3: back (Backstab), 4: back-left, 5: front-left
    const relativeDir = (attackDir - targetFacing + 6) % 6;

    if (relativeDir === 3) return 1.5; // Backstab
    if (relativeDir === 2 || relativeDir === 4) return 1.3; // Flanking
    return 1.0; // Frontal
}

function cubeLerp(a: any, b: any, t: number) {
    return {
        q: a.q + (b.q - a.q) * t,
        r: a.r + (b.r - a.r) * t,
        s: a.s + (b.s - a.s) * t
    };
}

export function hexLineDraw(a: { q: number, r: number }, b: { q: number, r: number }): { q: number, r: number }[] {
    const s_a = -a.q - a.r;
    const s_b = -b.q - b.r;
    const N = getHexDist(a.q, a.r, b.q, b.r);
    const results: { q: number, r: number }[] = [];
    if (N === 0) return [a];

    // Nudge to avoid boundary ties
    const aNudged = { q: a.q + 1e-6, r: a.r + 1e-6, s: s_a - 2e-6 };
    const bNudged = { q: b.q + 1e-6, r: b.r + 1e-6, s: s_b - 2e-6 };

    for (let i = 0; i <= N; i++) {
        const t = 1.0 / N * i;
        const lerp = cubeLerp(aNudged, bNudged, t);
        const rounded = axialRound(lerp.q, lerp.r, lerp.s);
        results.push({ q: rounded.q, r: rounded.r });
    }
    return results;
}
