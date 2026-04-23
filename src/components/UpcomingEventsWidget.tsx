'use client';

import { useEffect, useState } from 'react';
import { Badge, Spinner } from 'react-bootstrap';
import Link from 'next/link';
import API from '@/lib/api';

interface EventItem {
    type: 'birthday' | 'anniversary' | 'clan';
    label: string;
    date: string;            // YYYY-MM-DD
    eventType?: string;      // loại sự kiện dòng họ
    member?: {
        _id: string;
        name: string;
        isAlive: boolean;
        viewCode?: string;
    };
    lunarDay?: number;
    lunarMonth?: number;
}

interface UpcomingData {
    today: EventItem[];
    thisWeek: EventItem[];
    thisMonth: EventItem[];
}

const TYPE_ICON: Record<string, string> = {
    birthday:    '🎂',
    anniversary: '🕯️',
    clan:        '📅',
};

const TYPE_LABEL: Record<string, string> = {
    birthday:    'Sinh nhật',
    anniversary: 'Ngày giỗ',
    'giỗ tổ':   'Giỗ tổ',
    'họp họ':   'Họp họ',
    'tảo mộ':   'Tảo mộ',
    khác:        'Sự kiện',
};

function fmtDate(iso: string) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function EventRow({ ev, showDate = false }: { ev: EventItem; showDate?: boolean }) {
    const icon  = TYPE_ICON[ev.type] ?? '📌';
    const badge = ev.type === 'birthday'    ? 'success'
                : ev.type === 'anniversary' ? 'secondary'
                : 'info';

    return (
        <div className="d-flex align-items-center gap-2 py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</span>
            <div className="flex-grow-1 min-w-0">
                <div className="fw-semibold text-truncate" style={{ fontSize: '0.93rem' }}>
                    {ev.label}
                    {ev.lunarDay && ev.lunarMonth && (
                        <span className="text-muted ms-1" style={{ fontSize: '0.78rem', fontWeight: 400 }}>
                            (âm {ev.lunarDay}/{ev.lunarMonth})
                        </span>
                    )}
                </div>
                {showDate && (
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>{fmtDate(ev.date)}</div>
                )}
            </div>
            <div className="d-flex align-items-center gap-1 flex-shrink-0">
                <Badge bg={badge} style={{ fontSize: '0.7rem' }}>
                    {TYPE_LABEL[ev.eventType ?? ev.type] ?? ev.eventType ?? ev.type}
                </Badge>
                {/* Nút vào Bàn thờ số nếu là ngày giỗ và có viewCode */}
                {ev.type === 'anniversary' && ev.member?.viewCode && ev.member?._id && (
                    <Link
                        href={`/${ev.member.viewCode}/shrine/${ev.member._id}`}
                        className="btn btn-sm btn-outline-secondary py-0 px-2"
                        style={{ fontSize: '0.75rem' }}
                        title="Vào Bàn thờ số"
                    >
                        🏮 Bàn thờ
                    </Link>
                )}
            </div>
        </div>
    );
}

function Section({ title, events, showDate = false, accent }: {
    title: string;
    events: EventItem[];
    showDate?: boolean;
    accent: string;
}) {
    if (!events.length) return null;
    return (
        <div className="mb-3">
            <div className="fw-bold mb-1" style={{ color: accent, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {title} <span className="ms-1 text-muted fw-normal">({events.length})</span>
            </div>
            {events.map((ev, i) => <EventRow key={i} ev={ev} showDate={showDate} />)}
        </div>
    );
}

export default function UpcomingEventsWidget() {
    const [data, setData]     = useState<UpcomingData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get<UpcomingData>('/members/upcoming-events')
            .then(({ data }) => setData(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>;
    if (!data) return null;

    const total = data.today.length + data.thisWeek.length + data.thisMonth.length;

    return (
        <div>
            {total === 0 ? (
                <p className="text-muted text-center py-3 mb-0" style={{ fontSize: '0.88rem' }}>
                    Không có sự kiện nào trong tháng này 🌿
                </p>
            ) : (
                <>
                    {/* ── HÔM NAY ── */}
                    {data.today.length > 0 && (
                        <div className="rounded-3 p-3 mb-3"
                            style={{ background: 'linear-gradient(135deg,#fff8e1,#fff3cd)', border: '1px solid #ffe082' }}>
                            <div className="fw-bold mb-2" style={{ color: '#b45309', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                ✨ Hôm nay
                            </div>
                            {data.today.map((ev, i) => <EventRow key={i} ev={ev} />)}
                        </div>
                    )}

                    <Section title="📆 Trong tuần này" events={data.thisWeek} showDate accent="#1d4ed8" />
                    <Section title="🗓️ Còn lại trong tháng" events={data.thisMonth} showDate accent="#6b7280" />
                </>
            )}
        </div>
    );
}
