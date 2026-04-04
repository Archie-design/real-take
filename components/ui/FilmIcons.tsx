import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/** 膠卷圓盤 */
export function FilmReelIcon({ size = 24, className = '', strokeWidth = 1.5 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" />
            <circle cx="12" cy="12" r="2.5" />
            {/* 6 spokes */}
            <line x1="12" y1="9.5" x2="12" y2="2.5" />
            <line x1="15.5" y1="10.5" x2="20.7" y2="7.5" />
            <line x1="15.5" y1="13.5" x2="20.7" y2="16.5" />
            <line x1="12" y1="14.5" x2="12" y2="21.5" />
            <line x1="8.5" y1="13.5" x2="3.3" y2="16.5" />
            <line x1="8.5" y1="10.5" x2="3.3" y2="7.5" />
            {/* hub detail */}
            <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

/** 膠卷條紋 */
export function FilmStripIcon({ size = 24, className = '', strokeWidth = 1.5 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {/* main strip body */}
            <rect x="2" y="7" width="20" height="10" rx="1.5" />
            {/* top perforations */}
            <rect x="4" y="3" width="3" height="4" rx="1" />
            <rect x="10.5" y="3" width="3" height="4" rx="1" />
            <rect x="17" y="3" width="3" height="4" rx="1" />
            {/* bottom perforations */}
            <rect x="4" y="17" width="3" height="4" rx="1" />
            <rect x="10.5" y="17" width="3" height="4" rx="1" />
            <rect x="17" y="17" width="3" height="4" rx="1" />
            {/* frame dividers */}
            <line x1="8.5" y1="8" x2="8.5" y2="16" />
            <line x1="15.5" y1="8" x2="15.5" y2="16" />
        </svg>
    );
}

/** 3D 眼鏡 */
export function Glasses3DIcon({ size = 24, className = '', strokeWidth = 1.5 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {/* left lens */}
            <path d="M1.5 10.5 C1.5 8 2.5 7 4.5 7 L9.5 7 C11.5 7 12 8.5 12 10.5 C12 12.5 11.5 14 9.5 14 L4.5 14 C2.5 14 1.5 13 1.5 10.5 Z" />
            {/* right lens */}
            <path d="M12 10.5 C12 8.5 12.5 7 14.5 7 L19.5 7 C21.5 7 22.5 8 22.5 10.5 C22.5 13 21.5 14 19.5 14 L14.5 14 C12.5 14 12 12.5 12 10.5 Z" />
            {/* left temple */}
            <line x1="1.5" y1="10.5" x2="0" y2="9.5" />
            {/* right temple */}
            <line x1="22.5" y1="10.5" x2="24" y2="9.5" />
        </svg>
    );
}

/** 導演喊聲筒 */
export function MegaphoneIcon({ size = 24, className = '', strokeWidth = 1.5 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {/* body + cone */}
            <path d="M3 9 L3 15 L7 15 L13 19 L13 5 L7 9 Z" />
            {/* small arc */}
            <path d="M16 9.5 C17 9.5 18 10.6 18 12 C18 13.4 17 14.5 16 14.5" />
            {/* large arc */}
            <path d="M16 6.5 C19 6.5 21.5 9 21.5 12 C21.5 15 19 17.5 16 17.5" />
            {/* handle */}
            <line x1="5" y1="15" x2="5" y2="20" />
        </svg>
    );
}

/** 電影打板機 (進階版) */
export function ClapperIcon({ size = 24, className = '', strokeWidth = 1.5 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {/* board body */}
            <rect x="2" y="9" width="20" height="13" rx="2" />
            {/* top flap */}
            <path d="M2 9 L2 6 L22 6 L22 9" />
            {/* diagonal stripes on flap */}
            <line x1="5" y1="6" x2="7" y2="9" />
            <line x1="9" y1="6" x2="11" y2="9" />
            <line x1="13" y1="6" x2="15" y2="9" />
            <line x1="17" y1="6" x2="19" y2="9" />
            {/* text area lines */}
            <line x1="5" y1="13" x2="19" y2="13" />
            <line x1="5" y1="17" x2="19" y2="17" />
        </svg>
    );
}

/** 放映機 */
export function ProjectorIcon({ size = 24, className = '', strokeWidth = 1.5 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {/* body */}
            <rect x="2" y="7" width="14" height="10" rx="2" />
            {/* lens */}
            <circle cx="16" cy="12" r="3" />
            <circle cx="16" cy="12" r="1.2" fill="currentColor" stroke="none" />
            {/* film reels on top */}
            <circle cx="5" cy="5" r="2" />
            <circle cx="11" cy="5" r="2" />
            <line x1="5" y1="5" x2="11" y2="5" />
            {/* projection beam */}
            <path d="M19 10 L23 7" strokeDasharray="1.5 1.5" />
            <path d="M19 14 L23 17" strokeDasharray="1.5 1.5" />
            {/* stand */}
            <line x1="9" y1="17" x2="9" y2="21" />
            <line x1="6" y1="21" x2="12" y2="21" />
        </svg>
    );
}

/**
 * 全頁背景裝飾：浮動電影圖示
 * 放在 login 頁面或主頁背景層。
 */
export function FilmBackgroundDecorations() {
    return (
        <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {/* top-left: film reel */}
            <FilmReelIcon
                size={160}
                strokeWidth={0.9}
                className="absolute -top-10 -left-10 text-white/[0.10] rotate-12"
            />
            {/* top-right: clapperboard */}
            <ClapperIcon
                size={130}
                strokeWidth={0.9}
                className="absolute top-8 -right-8 text-white/[0.10] -rotate-15"
            />
            {/* bottom-left: film strip */}
            <FilmStripIcon
                size={150}
                strokeWidth={0.9}
                className="absolute -bottom-8 -left-6 text-white/[0.10] rotate-6"
            />
            {/* bottom-right: 3d glasses */}
            <Glasses3DIcon
                size={120}
                strokeWidth={0.9}
                className="absolute bottom-20 -right-4 text-white/[0.10] -rotate-8"
            />
            {/* center area extras */}
            <FilmReelIcon
                size={90}
                strokeWidth={0.9}
                className="absolute top-1/3 right-1/4 text-white/[0.06] rotate-45"
            />
            <MegaphoneIcon
                size={100}
                strokeWidth={0.9}
                className="absolute top-1/2 left-1/5 text-white/[0.06] -rotate-12"
            />
        </div>
    );
}

/**
 * 水平膠卷條紋裝飾帶
 * 放在 Header 底部或區塊分隔線。
 */
export function FilmStripDivider({ className = '' }: { className?: string }) {
    // A repeating SVG pattern of film sprocket holes + frame lines
    return (
        <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
            <svg width="100%" height="20" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="filmstrip-pattern" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
                        {/* top sprocket hole */}
                        <rect x="4" y="1" width="6" height="5" rx="1.5" fill="currentColor" opacity="0.35" />
                        {/* bottom sprocket hole */}
                        <rect x="4" y="14" width="6" height="5" rx="1.5" fill="currentColor" opacity="0.35" />
                        {/* frame divider */}
                        <line x1="14" y1="0" x2="14" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
                    </pattern>
                </defs>
                <rect width="100%" height="20" fill="url(#filmstrip-pattern)" />
            </svg>
        </div>
    );
}
