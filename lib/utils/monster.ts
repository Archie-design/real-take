/**
 * Returns the image path for a monster based on its type and zone.
 * Returns null if no image is available (caller should fall back to emoji).
 */
export function getMonsterImageSrc(type?: string, zone?: string): string | null {
    if (type === 'elite') return '/images/monsters/monster_elite.png';
    if (type === 'demon') return '/images/monsters/monster_demon.png';
    if (zone) {
        const zoneMap: Record<string, string> = {
            pride: '/images/monsters/monster_pride.png',
            doubt: '/images/monsters/monster_doubt.png',
            anger: '/images/monsters/monster_anger.png',
            greed: '/images/monsters/monster_greed.png',
            delusion: '/images/monsters/monster_delusion.png',
            chaos: '/images/monsters/monster_chaos.png',
        };
        if (zoneMap[zone]) return zoneMap[zone];
    }
    return '/images/monsters/monster_wild.png';
}
