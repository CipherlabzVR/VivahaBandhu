const HOROSCOPE_SHARE_PREFIX = /^\[HoroscopeShare:([\s\S]+)\]$/;

export type HoroscopeSharePayload = {
    pages: string[];
    label?: string;
};

export function buildHoroscopeShareContent(pages: string[]): string {
    const clean = pages.map((p) => String(p || '').trim()).filter(Boolean);
    const payload: HoroscopeSharePayload = { pages: clean, label: 'Horoscope' };
    return `[HoroscopeShare:${JSON.stringify(payload)}]`;
}

export function parseHoroscopeShareFromContent(content: string): HoroscopeSharePayload | null {
    const body = String(content ?? '').trim();
    const match = body.match(HOROSCOPE_SHARE_PREFIX);
    if (!match) return null;
    try {
        const parsed = JSON.parse(match[1]!) as HoroscopeSharePayload;
        const pages = Array.isArray(parsed?.pages)
            ? parsed.pages.map((p) => String(p || '').trim()).filter(Boolean)
            : [];
        if (pages.length === 0) return null;
        return { pages, label: parsed.label || 'Horoscope' };
    } catch {
        return null;
    }
}

export function isHoroscopeShareContent(content: string): boolean {
    return parseHoroscopeShareFromContent(content) != null;
}

/** Inbox / notification preview for horoscope share messages. */
export function horoscopeSharePreviewText(content: string): string | null {
    if (!isHoroscopeShareContent(content)) return null;
    return 'Horoscope shared';
}

export type HoroscopeProfileSource = {
    horoscopeDocument?: unknown;
    HoroscopeDocument?: unknown;
    horoscopeDocument2?: unknown;
    HoroscopeDocument2?: unknown;
    horoscopeDocument3?: unknown;
    HoroscopeDocument3?: unknown;
};

export function horoscopePagesFromProfile(row: HoroscopeProfileSource | null | undefined): string[] {
    if (!row) return [];
    const pages: string[] = [];
    const d1 = String(row.horoscopeDocument ?? row.HoroscopeDocument ?? '').trim();
    const d2 = String(row.horoscopeDocument2 ?? row.HoroscopeDocument2 ?? '').trim();
    const d3 = String(row.horoscopeDocument3 ?? row.HoroscopeDocument3 ?? '').trim();
    if (d1) pages.push(d1);
    if (d2) pages.push(d2);
    if (d3) pages.push(d3);
    return pages;
}
