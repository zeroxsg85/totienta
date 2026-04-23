'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Badge, Card, Col, Nav, Row, Spinner, Tab, Table, ProgressBar, Modal,
} from 'react-bootstrap';
import Link from 'next/link';
import API from '@/lib/api';
import useDeviceType from '@/hooks/useDeviceType';
import { getCivilName } from '@/lib/nameUtils';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClanEvent {
  _id?: string;
  title: string;
  date?: string;
  lunarDate?: { day?: number; month?: number; year?: number };
  type?: string;
  location?: string;
  livestreamUrl?: string;
}

interface ClanFund {
  _id: string;
  name: string;
  targetAmount: number;
  currency: string;
  purpose?: string;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
}

interface FundTransaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  transactionCode?: string;
  member?: { name: string } | null;
  memberName?: string;
  recipient?: string;
  note?: string;
}

interface MemberEvent {
  type: 'birthday' | 'anniversary';
  label: string;
  date: string; // YYYY-MM-DD
  member?: { _id: string; name: string; viewCode?: string };
  lunarDay?: number;
  lunarMonth?: number;
}

interface PublicClanData {
  treeName: string;
  clanInfo: { origin?: string; ancestralHome?: string; motto?: string };
  events: ClanEvent[];
  memberEvents: MemberEvent[];
  funds: ClanFund[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number, currency = 'VND') =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(n);

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const EVENT_TYPE_ICON: Record<string, string> = {
  'giỗ tổ': '🏮', 'họp họ': '👥', 'tảo mộ': '🌿', khác: '📅',
};


// ── FundDetailModal (public, read-only) ───────────────────────────────────────
function FundDetailModal({ fund, viewCode, onHide }: { fund: ClanFund; viewCode: string; onHide: () => void }) {
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('income');

  useEffect(() => {
    API.get<FundTransaction[]>(`/clan/public/${viewCode}/funds/${fund._id}/transactions`)
      .then(({ data }) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fund._id, viewCode]);

  const income  = transactions.filter(t => t.type === 'income');
  const expense = transactions.filter(t => t.type === 'expense');
  const balance = fund.balance ?? (fund.incomeTotal - fund.expenseTotal);
  const progress = fund.targetAmount > 0 ? Math.min(100, (balance / fund.targetAmount) * 100) : null;

  return (
    <Modal show onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>💰 {fund.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <Tab.Container activeKey={tab} onSelect={k => setTab(k || 'income')}>
          <Nav variant="tabs" className="px-3 pt-2">
            <Nav.Item><Nav.Link eventKey="overview">📊 Tổng quan</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="income">💚 Thu ({income.length})</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="expense">🔴 Chi ({expense.length})</Nav.Link></Nav.Item>
          </Nav>
          <Tab.Content className="p-3">
            {/* Tổng quan */}
            <Tab.Pane eventKey="overview">
              <Row className="g-3 mb-3">
                {[
                  { label: 'Tổng thu', value: fmt(fund.incomeTotal, fund.currency), color: 'success', border: 'border-success' },
                  { label: 'Tổng chi', value: fmt(fund.expenseTotal, fund.currency), color: 'danger', border: 'border-danger' },
                  { label: 'Số dư',    value: fmt(balance, fund.currency),           color: balance >= 0 ? 'primary' : 'warning', border: balance >= 0 ? 'border-primary' : 'border-warning' },
                ].map(s => (
                  <Col xs={12} sm={4} key={s.label}>
                    <Card className={`text-center ${s.border}`}>
                      <Card.Body className="py-3">
                        <div className={`fw-bold fs-5 text-${s.color}`}>{s.value}</div>
                        <small className="text-muted">{s.label}</small>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              {progress !== null && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small>Tiến độ mục tiêu</small>
                    <small className="fw-semibold">{fmt(balance, fund.currency)} / {fmt(fund.targetAmount, fund.currency)}</small>
                  </div>
                  <ProgressBar now={progress}
                    label={`${Math.round(progress)}%`}
                    variant={progress >= 100 ? 'success' : progress >= 60 ? 'info' : 'warning'} />
                </div>
              )}
              {fund.purpose && <p className="text-muted small">📝 {fund.purpose}</p>}
            </Tab.Pane>

            {/* Thu */}
            <Tab.Pane eventKey="income">
              {loading ? <Spinner animation="border" size="sm" /> : (
                <TxTable rows={income} type="income" currency={fund.currency} />
              )}
            </Tab.Pane>

            {/* Chi */}
            <Tab.Pane eventKey="expense">
              {loading ? <Spinner animation="border" size="sm" /> : (
                <TxTable rows={expense} type="expense" currency={fund.currency} />
              )}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
}

function TxTable({ rows, type, currency }: { rows: FundTransaction[]; type: 'income' | 'expense'; currency: string }) {
  const { isMobile } = useDeviceType();
  if (!rows.length) return <p className="text-muted text-center py-4">Chưa có giao dịch nào.</p>;

  const personName = (tx: FundTransaction) => {
    const raw = tx.memberName || (tx.member as any)?.name || '';
    return getCivilName(raw) || raw || '—';
  };

  if (isMobile) {
    return (
      <div className="d-flex flex-column gap-2">
        {rows.map(tx => (
          <Card key={tx._id} className="border-0 bg-light">
            <Card.Body className="py-2 px-3">
              <div className="d-flex justify-content-between align-items-start">
                <div className="fw-semibold" style={{ fontSize: '0.95rem' }}>
                  {type === 'income' ? personName(tx) : (tx.recipient || '—')}
                </div>
                <span className={`fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}`} style={{ whiteSpace: 'nowrap' }}>
                  {type === 'income' ? '+' : '-'}{fmt(tx.amount, currency)}
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                {fmtDate(tx.date)}
                {tx.transactionCode && <> · <code>{tx.transactionCode}</code></>}
                {tx.note && <> · {tx.note}</>}
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Table hover size="sm">
      <thead className="table-light">
        <tr>
          <th>Ngày</th>
          <th>Mã GD</th>
          {type === 'income'  && <th>Người đóng</th>}
          {type === 'expense' && <th>Thụ hưởng</th>}
          <th className="text-end">Số tiền</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(tx => (
          <tr key={tx._id}>
            <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(tx.date)}</td>
            <td>{tx.transactionCode ? <code className="small">{tx.transactionCode}</code> : '—'}</td>
            {type === 'income'  && <td>{personName(tx)}</td>}
            {type === 'expense' && <td>{tx.recipient || '—'}</td>}
            <td className={`text-end fw-semibold ${type === 'income' ? 'text-success' : 'text-danger'}`}>
              {type === 'income' ? '+' : '-'}{fmt(tx.amount, currency)}
            </td>
            <td className="text-muted small">{tx.note || '—'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PublicClanPage() {
  const { viewCode } = useParams<{ viewCode: string }>();
  const [data, setData]     = useState<PublicClanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('gio');
  const [detailFund, setDetailFund] = useState<ClanFund | null>(null);

  useEffect(() => {
    API.get<PublicClanData>(`/clan/public/${viewCode}`)
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [viewCode]);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
      <Spinner animation="border" />
    </div>
  );

  if (!data) return (
    <div className="text-center mt-5">
      <p className="text-muted">Không tìm thấy thông tin dòng họ.</p>
      <Link href={`/${viewCode}`} className="btn btn-outline-primary">← Xem cây gia phả</Link>
    </div>
  );

  const upcomingEvents = [...(data.events || [])].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  const memberEvents  = data.memberEvents || [];
  const anniversaries = memberEvents.filter(e => e.type === 'anniversary');
  const birthdays     = memberEvents.filter(e => e.type === 'birthday');
  // Tab "Sự kiện": sinh nhật + sự kiện tùy chỉnh
  const generalCount  = birthdays.length + upcomingEvents.length;
  const gioCount      = anniversaries.length;

  return (
    <div className="container mt-4 pb-5" style={{ maxWidth: 860 }}>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link href={`/${viewCode}`} className="btn btn-outline-secondary btn-sm">← Cây gia phả</Link>
        <div>
          <h4 className="mb-0">{data.treeName}</h4>
          {data.clanInfo?.motto && <small className="text-muted fst-italic">"{data.clanInfo.motto}"</small>}
        </div>
      </div>

      <Tab.Container activeKey={tab} onSelect={k => setTab(k || 'events')}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="gio">
              🕯️ Ngày Giỗ
              {gioCount > 0 && <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.7rem' }}>{gioCount}</Badge>}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="events">
              📅 Sự kiện &amp; Sinh nhật
              {generalCount > 0 && <Badge bg="primary" className="ms-1" style={{ fontSize: '0.7rem' }}>{generalCount}</Badge>}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="funds">
              💰 Quỹ dòng họ
              {data.funds.length > 0 && <Badge bg="success" className="ms-1" style={{ fontSize: '0.7rem' }}>{data.funds.length}</Badge>}
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          {/* ── GIỖ ── */}
          <Tab.Pane eventKey="gio">
            {anniversaries.length === 0 ? (
              <p className="text-muted text-center py-5">Chưa có thông tin ngày giỗ.</p>
            ) : (
              <Row className="g-3">
                {anniversaries.map((ev, i) => (
                  <Col xs={12} md={6} key={i}>
                    <Card className="h-100" style={{ borderColor: '#d4a96a' }}>
                      <Card.Body className="d-flex align-items-center gap-3">
                        <span style={{ fontSize: '2rem', flexShrink: 0 }}>🕯️</span>
                        <div className="flex-grow-1">
                          <div className="fw-bold" style={{ fontSize: '1rem' }}>{ev.label}</div>
                          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                            📆 {fmtDate(ev.date)}
                            {ev.lunarDay && ev.lunarMonth && (
                              <span className="ms-2">🌙 {ev.lunarDay}/{ev.lunarMonth} âm lịch</span>
                            )}
                          </div>
                        </div>
                        {ev.member?.viewCode && ev.member?._id && (
                          <Link
                            href={`/${ev.member.viewCode}/shrine/${ev.member._id}`}
                            className="btn btn-sm btn-outline-secondary flex-shrink-0"
                            style={{ fontSize: '0.8rem' }}
                          >
                            🏮 Bàn thờ
                          </Link>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Tab.Pane>

          {/* ── SỰ KIỆN & SINH NHẬT ── */}
          <Tab.Pane eventKey="events">
            {generalCount === 0 ? (
              <p className="text-muted text-center py-5">Chưa có sự kiện nào.</p>
            ) : (
              <>
                {/* Sinh nhật */}
                {birthdays.length > 0 && (
                  <div className="mb-4">
                    {upcomingEvents.length > 0 && (
                      <h6 className="text-muted mb-2" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🎂 Sinh nhật ({birthdays.length})
                      </h6>
                    )}
                    <Row className="g-2">
                      {birthdays.map((ev, i) => (
                        <Col xs={12} md={6} key={i}>
                          <Card className="h-100 border-0 bg-light">
                            <Card.Body className="py-2 px-3 d-flex align-items-center gap-2">
                              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🎂</span>
                              <div className="flex-grow-1">
                                <div className="fw-semibold" style={{ fontSize: '0.93rem' }}>{ev.label}</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>📆 {fmtDate(ev.date)}</div>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}

                {/* Sự kiện tùy chỉnh */}
                {upcomingEvents.length > 0 && (
                  <>
                    {birthdays.length > 0 && (
                      <h6 className="text-muted mb-2" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📅 Sự kiện ({upcomingEvents.length})
                      </h6>
                    )}
                    <Row className="g-3">
                      {upcomingEvents.map((ev, i) => (
                        <Col xs={12} md={6} key={ev._id || i}>
                          <Card className="h-100">
                            <Card.Body>
                              <div className="d-flex gap-2 align-items-start">
                                <span style={{ fontSize: '1.5rem' }}>{EVENT_TYPE_ICON[ev.type || ''] || '📅'}</span>
                                <div className="flex-grow-1">
                                  <div className="fw-semibold">{ev.title}</div>
                                  {ev.type && (
                                    <Badge bg="secondary" className="mb-1" style={{ fontSize: '0.7rem' }}>{ev.type}</Badge>
                                  )}
                                  <div className="text-muted small">
                                    {ev.date && <span>📆 {fmtDate(ev.date)}</span>}
                                    {ev.lunarDate?.day && ev.lunarDate?.month && (
                                      <span className="ms-2">
                                        🌙 {ev.lunarDate.day}/{ev.lunarDate.month}
                                        {ev.lunarDate.year ? `/${ev.lunarDate.year}` : ''} âm lịch
                                      </span>
                                    )}
                                  </div>
                                  {ev.location && <div className="text-muted small">📍 {ev.location}</div>}
                                  {ev.livestreamUrl && (
                                    <a href={ev.livestreamUrl} target="_blank" rel="noopener noreferrer"
                                      className="btn btn-sm btn-outline-danger mt-1 py-0">
                                      🔴 Xem livestream
                                    </a>
                                  )}
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </>
                )}
              </>
            )}
          </Tab.Pane>

          {/* ── QUỸ ── */}
          <Tab.Pane eventKey="funds">
            {data.funds.length === 0 ? (
              <p className="text-muted text-center py-5">Chưa có quỹ nào được công bố.</p>
            ) : (
              <Row className="g-3">
                {data.funds.map(fund => {
                  const balance = fund.balance ?? (fund.incomeTotal - fund.expenseTotal);
                  const progress = fund.targetAmount > 0 ? Math.min(100, (balance / fund.targetAmount) * 100) : null;
                  return (
                    <Col xs={12} md={6} key={fund._id}>
                      <Card className="h-100" style={{ cursor: 'pointer' }}
                        onClick={() => setDetailFund(fund)}>
                        <Card.Body>
                          <Card.Title className="fs-6 mb-1">{fund.name}</Card.Title>
                          {fund.purpose && <p className="text-muted small mb-2">{fund.purpose}</p>}
                          <div className="d-flex gap-3 mb-2">
                            <div>
                              <small className="text-muted d-block">Thu</small>
                              <span className="text-success fw-semibold">{fmt(fund.incomeTotal, fund.currency)}</span>
                            </div>
                            <div>
                              <small className="text-muted d-block">Chi</small>
                              <span className="text-danger fw-semibold">{fmt(fund.expenseTotal, fund.currency)}</span>
                            </div>
                            <div>
                              <small className="text-muted d-block">Số dư</small>
                              <span className={`fw-bold ${balance >= 0 ? 'text-primary' : 'text-warning'}`}>
                                {fmt(balance, fund.currency)}
                              </span>
                            </div>
                          </div>
                          {progress !== null && (
                            <>
                              <ProgressBar now={progress}
                                variant={progress >= 100 ? 'success' : progress >= 60 ? 'info' : 'warning'}
                                style={{ height: 6 }} className="mb-1" />
                              <small className="text-muted">
                                {Math.round(progress)}% mục tiêu {fmt(fund.targetAmount, fund.currency)}
                              </small>
                            </>
                          )}
                          <div className="text-primary small mt-2">Nhấn để xem chi tiết →</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Fund detail modal */}
      {detailFund && (
        <FundDetailModal
          fund={detailFund}
          viewCode={viewCode}
          onHide={() => setDetailFund(null)}
        />
      )}
    </div>
  );
}
