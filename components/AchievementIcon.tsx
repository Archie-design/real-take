'use client';
import { useState } from 'react';
import type { AchievementDef } from '@/lib/achievements';

/**
 * Renders an achievement icon: shows the PNG from /images/achievements/{id}.png
 * if it exists, otherwise falls back to the emoji icon defined in AchievementDef.
 *
 * To swap in an AI-generated image, simply place a file at:
 *   public/images/achievements/{achievement_id}.png
 * No code changes needed.
 */
export function AchievementIcon({ def, size }: { def: AchievementDef; size: 'md' | 'lg' }) {
    const [imgFailed, setImgFailed] = useState(false);
    const sizeClass = size === 'lg' ? 'w-20 h-20' : 'w-10 h-10';
    const emojiClass = size === 'lg' ? 'text-5xl' : 'text-2xl';

    if (!imgFailed) {
        return (
            <div className={`${sizeClass} rounded-xl overflow-hidden shrink-0`}>
                <img
                    src={`/images/achievements/${def.id}.png`}
                    alt={def.name}
                    className="w-full h-full object-cover"
                    onError={() => setImgFailed(true)}
                />
            </div>
        );
    }
    return <span className={emojiClass}>{def.icon}</span>;
}
