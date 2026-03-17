export interface TestimonyData {
    parsedName: string | null;
    parsedDate: string | null;       // YYYY-MM-DD or null
    parsedCategory: string | null;
    content: string;
}

/**
 * Detects and parses a testimony message from LINE.
 * Returns null if the message is not a testimony format.
 */
export function parseTestimony(text: string): TestimonyData | null {
    // Trigger: message contains #親證故事 or #親證
    if (!text.includes('#親證故事') && !text.includes('#親證')) return null;

    const parsedName = text.match(/姓名[：:]\s*(.+)/)?.[1]?.trim() ?? null;

    const rawDate = text.match(/日期[：:]\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/)?.[1];
    const parsedDate = rawDate ? rawDate.replace(/\//g, '-') : null;

    const parsedCategory = text.match(/類別[：:]\s*(.+)/)?.[1]?.trim() ?? null;

    // Content is everything after 內容：(including multi-line)
    const contentMatch = text.match(/內容[：:]\s*\n?([\s\S]+)$/);
    const content = contentMatch?.[1]?.trim() ?? null;

    if (!content) return null;

    return { parsedName, parsedDate, parsedCategory, content };
}
