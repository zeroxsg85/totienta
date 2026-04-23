'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Card, Modal, Form, Row, Col, Tab, Nav,
  Badge, Spinner, Table, ProgressBar,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import API from '@/lib/api';
import { ClanFund, FundTransaction, Member } from '@/types';
import useDeviceType from '@/hooks/useDeviceType';
import { getCivilName } from '@/lib/nameUtils';

// ── MemberSearchSelect ─────────────────────────────────────────────────────────
interface MemberSearchSelectProps {
  members: Pick<Member, '_id' | 'name'>[];
  value: string;
  onChange: (id: string) => void;
}
function MemberSearchSelect({ members, value, onChange }: MemberSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Hiển thị tên thành viên đang chọn
  const selectedName = members.find(m => m._id === value)?.name ?? '';

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? members.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    : members;

  const handleSelect = (id: string, name: string) => {
    onChange(id);
    setQuery(name);
    setOpen(false);
  };

  const handleClear = () => { onChange(''); setQuery(''); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="input-group">
        <Form.Control
          placeholder="Tìm thành viên..."
          value={open ? query : (selectedName || query)}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(''); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
        />
        {value && (
          <Button variant="outline-secondary" onClick={handleClear} tabIndex={-1}>✕</Button>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 1050, width: '100%',
          background: '#fff', border: '1px solid #dee2e6',
          borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          <div
            className="px-3 py-2 text-muted small"
            style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
            onMouseDown={() => handleSelect('', '')}
          >
            — Không chọn —
          </div>
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-muted small">Không tìm thấy</div>
          )}
          {filtered.map(m => (
            <div key={m._id}
              className={`px-3 py-2 ${m._id === value ? 'bg-primary text-white' : ''}`}
              style={{ cursor: 'pointer' }}
              onMouseDown={() => handleSelect(m._id, m.name)}
              onMouseEnter={e => { if (m._id !== value) (e.target as HTMLElement).style.background = '#f0f4ff'; }}
              onMouseLeave={e => { if (m._id !== value) (e.target as HTMLElement).style.background = ''; }}
            >
              {m.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number, currency = 'VND') =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN');

// ── FundFormModal ──────────────────────────────────────────────────────────────
interface FundFormModalProps {
  show: boolean;
  onHide: () => void;
  initial?: Partial<ClanFund>;
  onSaved: (fund: ClanFund) => void;
}
function FundFormModal({ show, onHide, initial, onSaved }: FundFormModalProps) {
  const [form, setForm] = useState({ name: '', targetAmount: 0, currency: 'VND', purpose: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({
        name:         initial?.name         ?? '',
        targetAmount: initial?.targetAmount  ?? 0,
        currency:     initial?.currency     ?? 'VND',
        purpose:      initial?.purpose      ?? '',
      });
    }
  }, [show, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Tên quỹ không được để trống');
    setSaving(true);
    try {
      const { data } = initial?._id
        ? await API.put<ClanFund>(`/clan/funds/${initial._id}`, form)
        : await API.post<ClanFund>('/clan/funds', form);
      onSaved(data);
      onHide();
      toast.success(initial?._id ? 'Đã cập nhật quỹ' : 'Đã tạo quỹ mới');
    } catch {
      toast.error('Lỗi khi lưu quỹ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{initial?._id ? 'Chỉnh sửa quỹ' : 'Tạo quỹ mới'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Tên quỹ <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Quỹ Khuyến Học, Quỹ Trùng Tu..."
            />
          </Form.Group>
          <Row className="g-2 mb-3">
            <Col xs={8}>
              <Form.Label>Mục tiêu</Form.Label>
              <Form.Control
                type="number" min={0}
                value={form.targetAmount}
                onChange={e => setForm({ ...form, targetAmount: Number(e.target.value) })}
              />
            </Col>
            <Col xs={4}>
              <Form.Label>Đơn vị</Form.Label>
              <Form.Select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option>VND</option>
                <option>USD</option>
              </Form.Select>
            </Col>
          </Row>
          <Form.Group>
            <Form.Label>Mục đích / Ghi chú</Form.Label>
            <Form.Control
              as="textarea" rows={2}
              value={form.purpose}
              onChange={e => setForm({ ...form, purpose: e.target.value })}
              placeholder="Mô tả mục đích của quỹ..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Hủy</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" /> : 'Lưu'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

// ── TransactionFormModal ───────────────────────────────────────────────────────
interface TxFormProps {
  show: boolean;
  onHide: () => void;
  fundId: string;
  currency: string;
  defaultType?: 'income' | 'expense';
  initial?: Partial<FundTransaction>;
  members: Pick<Member, '_id' | 'name'>[];
  onSaved: (tx: FundTransaction) => void;
}
function TransactionFormModal({ show, onHide, fundId, currency, defaultType = 'income', initial, members, onSaved }: TxFormProps) {
  const blank = useCallback(() => ({
    type:            defaultType,
    amount:          0,
    date:            new Date().toISOString().slice(0, 10),
    transactionCode: '',
    member:          '',
    memberName:      '',
    recipient:       '',
    note:            '',
  }), [defaultType]);

  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      if (initial?._id) {
        setForm({
          type:            initial.type            ?? defaultType,
          amount:          initial.amount          ?? 0,
          date:            initial.date            ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
          transactionCode: initial.transactionCode ?? '',
          member:          (initial.member as any)?._id ?? '',
          memberName:      initial.memberName      ?? '',
          recipient:       initial.recipient       ?? '',
          note:            initial.note            ?? '',
        });
      } else {
        setForm(blank());
      }
    }
  }, [show, initial, blank, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) return toast.error('Số tiền phải lớn hơn 0');
    if (!form.date) return toast.error('Vui lòng chọn ngày');

    const payload = {
      ...form,
      amount: Number(form.amount),
      member: form.member || null,
    };

    setSaving(true);
    try {
      const { data } = initial?._id
        ? await API.put<FundTransaction>(`/clan/funds/${fundId}/transactions/${initial._id}`, payload)
        : await API.post<FundTransaction>(`/clan/funds/${fundId}/transactions`, payload);
      onSaved(data);
      onHide();
      toast.success(initial?._id ? 'Đã cập nhật giao dịch' : 'Đã thêm giao dịch');
    } catch {
      toast.error('Lỗi khi lưu giao dịch');
    } finally {
      setSaving(false);
    }
  };

  const isIncome = form.type === 'income';

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{initial?._id ? 'Chỉnh sửa giao dịch' : `Thêm giao dịch ${isIncome ? 'thu' : 'chi'}`}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="g-3">
            {/* Loại giao dịch */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Loại</Form.Label>
                <div className="d-flex gap-3">
                  {(['income', 'expense'] as const).map(t => (
                    <Form.Check key={t} type="radio" id={`type-${t}`}
                      label={t === 'income' ? '💚 Thu' : '🔴 Chi'}
                      checked={form.type === t}
                      onChange={() => setForm({ ...form, type: t })}
                    />
                  ))}
                </div>
              </Form.Group>
            </Col>

            {/* Số tiền + Ngày */}
            <Col xs={6} md={4}>
              <Form.Label>Số tiền ({currency}) <span className="text-danger">*</span></Form.Label>
              <Form.Control type="number" min={0}
                value={form.amount}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </Col>
            <Col xs={6} md={4}>
              <Form.Label>Ngày <span className="text-danger">*</span></Form.Label>
              <Form.Control type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Label>Mã giao dịch</Form.Label>
              <Form.Control placeholder="VD: FT24112300001"
                value={form.transactionCode}
                onChange={e => setForm({ ...form, transactionCode: e.target.value })}
              />
            </Col>

            {/* Thu: thành viên đóng góp */}
            {isIncome && (
              <>
                <Col xs={12} md={6}>
                  <Form.Label>Thành viên đóng góp</Form.Label>
                  <MemberSearchSelect
                    members={members}
                    value={form.member}
                    onChange={id => setForm({ ...form, member: id })}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label>Tên ghi nhận (nếu khác)</Form.Label>
                  <Form.Control placeholder="Để trống = lấy tên thành viên"
                    value={form.memberName}
                    onChange={e => setForm({ ...form, memberName: e.target.value })}
                  />
                </Col>
              </>
            )}

            {/* Chi: người/việc thụ hưởng */}
            {!isIncome && (
              <Col xs={12}>
                <Form.Label>Người/Việc thụ hưởng <span className="text-danger">*</span></Form.Label>
                <Form.Control placeholder="VD: Nguyễn Văn A – học bổng THPT, Sửa mộ tổ..."
                  value={form.recipient}
                  onChange={e => setForm({ ...form, recipient: e.target.value })}
                />
              </Col>
            )}

            {/* Ghi chú */}
            <Col xs={12}>
              <Form.Label>Ghi chú</Form.Label>
              <Form.Control as="textarea" rows={2}
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Hủy</Button>
          <Button type="submit" variant={isIncome ? 'success' : 'danger'} disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" /> : 'Lưu'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

// ── TransactionTable ───────────────────────────────────────────────────────────
interface TxTableProps {
  transactions: FundTransaction[];
  type: 'income' | 'expense';
  currency: string;
  onEdit: (tx: FundTransaction) => void;
  onDelete: (tx: FundTransaction) => void;
}
function TransactionTable({ transactions, type, currency, onEdit, onDelete }: TxTableProps) {
  const { isMobile } = useDeviceType();
  const rows = transactions.filter(t => t.type === type);
  if (!rows.length) return <p className="text-muted text-center py-4">Chưa có giao dịch nào.</p>;

  const personName = (tx: FundTransaction) => {
    const raw = tx.memberName || (tx.member as any)?.name || '';
    return getCivilName(raw) || raw || '—';
  };

  // ── Mobile: card list ──────────────────────────────────────────────────────
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
                <span className={`fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                  {type === 'income' ? '+' : '-'}{fmt(tx.amount, currency)}
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                {fmtDate(tx.date)}
                {tx.transactionCode && <> · <code>{tx.transactionCode}</code></>}
                {tx.note && <> · {tx.note}</>}
              </div>
              <div className="d-flex gap-1 mt-1">
                <Button size="sm" variant="outline-secondary" className="py-0 px-2" style={{ fontSize: '0.75rem' }}
                  onClick={() => onEdit(tx)}>✏️ Sửa</Button>
                <Button size="sm" variant="outline-danger" className="py-0 px-2" style={{ fontSize: '0.75rem' }}
                  onClick={() => onDelete(tx)}>🗑️</Button>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
    );
  }

  // ── Desktop: table ─────────────────────────────────────────────────────────
  return (
    <Table hover size="sm" className="mb-0">
      <thead className="table-light">
        <tr>
          <th>Ngày</th>
          <th>Mã GD</th>
          {type === 'income'  && <th>Người đóng</th>}
          {type === 'expense' && <th>Thụ hưởng</th>}
          <th className="text-end">Số tiền</th>
          <th>Ghi chú</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(tx => (
          <tr key={tx._id}>
            <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(tx.date)}</td>
            <td>
              {tx.transactionCode
                ? <code className="small">{tx.transactionCode}</code>
                : <span className="text-muted">—</span>}
            </td>
            {type === 'income' && <td>{personName(tx)}</td>}
            {type === 'expense' && <td>{tx.recipient || <span className="text-muted">—</span>}</td>}
            <td className={`text-end fw-semibold ${type === 'income' ? 'text-success' : 'text-danger'}`}>
              {type === 'income' ? '+' : '-'}{fmt(tx.amount, currency)}
            </td>
            <td className="text-muted small">{tx.note || '—'}</td>
            <td style={{ whiteSpace: 'nowrap' }}>
              <Button size="sm" variant="outline-secondary" className="me-1 py-0"
                onClick={() => onEdit(tx)}>✏️</Button>
              <Button size="sm" variant="outline-danger" className="py-0"
                onClick={() => onDelete(tx)}>🗑️</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// ── FundDetailModal ────────────────────────────────────────────────────────────
interface FundDetailProps {
  fund: ClanFund;
  show: boolean;
  onHide: () => void;
  members: Pick<Member, '_id' | 'name'>[];
  onFundUpdated: (fund: ClanFund) => void;
}
function FundDetailModal({ fund, show, onHide, members, onFundUpdated }: FundDetailProps) {
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [editTx, setEditTx] = useState<FundTransaction | undefined>();
  const [defaultTxType, setDefaultTxType] = useState<'income' | 'expense'>('income');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchTransactions = useCallback(async () => {
    setLoadingTx(true);
    try {
      const { data } = await API.get<FundTransaction[]>(`/clan/funds/${fund._id}/transactions`);
      setTransactions(data);
    } catch {
      toast.error('Lỗi khi tải giao dịch');
    } finally {
      setLoadingTx(false);
    }
  }, [fund._id]);

  useEffect(() => {
    if (show) fetchTransactions();
  }, [show, fetchTransactions]);

  const handleTxSaved = (tx: FundTransaction) => {
    setTransactions(prev => {
      const idx = prev.findIndex(t => t._id === tx._id);
      const next = idx >= 0 ? prev.map((t, i) => i === idx ? tx : t) : [tx, ...prev];
      return next;
    });
    // Refresh fund totals
    API.get<ClanFund[]>('/clan/funds').then(({ data }) => {
      const updated = data.find(f => f._id === fund._id);
      if (updated) onFundUpdated(updated);
    });
  };

  const handleDeleteTx = async (tx: FundTransaction) => {
    if (!confirm('Xóa giao dịch này?')) return;
    try {
      await API.delete(`/clan/funds/${fund._id}/transactions/${tx._id}`);
      setTransactions(prev => prev.filter(t => t._id !== tx._id));
      toast.success('Đã xóa giao dịch');
      API.get<ClanFund[]>('/clan/funds').then(({ data }) => {
        const updated = data.find(f => f._id === fund._id);
        if (updated) onFundUpdated(updated);
      });
    } catch {
      toast.error('Lỗi khi xóa');
    }
  };

  const openAddTx = (type: 'income' | 'expense') => {
    setEditTx(undefined);
    setDefaultTxType(type);
    setShowTxForm(true);
  };

  const balance = fund.balance ?? (fund.incomeTotal - fund.expenseTotal);
  const progress = fund.targetAmount > 0 ? Math.min(100, (balance / fund.targetAmount) * 100) : null;

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>💰 {fund.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <Tab.Container activeKey={activeTab} onSelect={k => setActiveTab(k || 'overview')}>
            <Nav variant="tabs" className="px-3 pt-2">
              <Nav.Item><Nav.Link eventKey="overview">📊 Tổng quan</Nav.Link></Nav.Item>
              <Nav.Item><Nav.Link eventKey="income">💚 Thu ({transactions.filter(t => t.type === 'income').length})</Nav.Link></Nav.Item>
              <Nav.Item><Nav.Link eventKey="expense">🔴 Chi ({transactions.filter(t => t.type === 'expense').length})</Nav.Link></Nav.Item>
            </Nav>

            <Tab.Content className="p-3">
              {/* ── TỔNG QUAN ── */}
              <Tab.Pane eventKey="overview">
                <Row className="g-3 mb-3">
                  <Col xs={12} sm={4}>
                    <Card className="text-center border-success">
                      <Card.Body className="py-3">
                        <div className="text-success fw-bold fs-5">{fmt(fund.incomeTotal, fund.currency)}</div>
                        <small className="text-muted">Tổng thu</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={12} sm={4}>
                    <Card className="text-center border-danger">
                      <Card.Body className="py-3">
                        <div className="text-danger fw-bold fs-5">{fmt(fund.expenseTotal, fund.currency)}</div>
                        <small className="text-muted">Tổng chi</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={12} sm={4}>
                    <Card className={`text-center border-${balance >= 0 ? 'primary' : 'warning'}`}>
                      <Card.Body className="py-3">
                        <div className={`fw-bold fs-5 ${balance >= 0 ? 'text-primary' : 'text-warning'}`}>{fmt(balance, fund.currency)}</div>
                        <small className="text-muted">Số dư hiện tại</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {fund.targetAmount > 0 && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small>Tiến độ mục tiêu</small>
                      <small className="fw-semibold">{fmt(balance, fund.currency)} / {fmt(fund.targetAmount, fund.currency)}</small>
                    </div>
                    <ProgressBar
                      now={progress!}
                      label={`${Math.round(progress!)}%`}
                      variant={progress! >= 100 ? 'success' : progress! >= 60 ? 'info' : 'warning'}
                    />
                  </div>
                )}

                {fund.purpose && <p className="text-muted small mb-3">📝 {fund.purpose}</p>}

                {/* 10 giao dịch gần nhất */}
                <h6 className="text-muted">Giao dịch gần đây</h6>
                {loadingTx ? <Spinner animation="border" size="sm" /> : (
                  <Table responsive hover size="sm">
                    <tbody>
                      {transactions.slice(0, 10).map(tx => (
                        <tr key={tx._id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(tx.date)}</td>
                          <td>
                            <Badge bg={tx.type === 'income' ? 'success' : 'danger'}>
                              {tx.type === 'income' ? 'Thu' : 'Chi'}
                            </Badge>
                          </td>
                          <td>{tx.type === 'income'
                            ? (tx.memberName || (tx.member as any)?.name || '—')
                            : (tx.recipient || '—')}
                          </td>
                          <td className={`text-end fw-semibold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                            {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount, fund.currency)}
                          </td>
                        </tr>
                      ))}
                      {!transactions.length && (
                        <tr><td colSpan={4} className="text-center text-muted py-3">Chưa có giao dịch nào</td></tr>
                      )}
                    </tbody>
                  </Table>
                )}
              </Tab.Pane>

              {/* ── THU ── */}
              <Tab.Pane eventKey="income">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <strong>Tổng thu:</strong>{' '}
                    <span className="text-success fw-bold">{fmt(fund.incomeTotal, fund.currency)}</span>
                  </div>
                  <Button size="sm" variant="success" onClick={() => openAddTx('income')}>
                    + Thêm thu
                  </Button>
                </div>
                {loadingTx ? <Spinner animation="border" size="sm" /> : (
                  <TransactionTable
                    transactions={transactions} type="income" currency={fund.currency}
                    onEdit={tx => { setEditTx(tx); setDefaultTxType('income'); setShowTxForm(true); }}
                    onDelete={handleDeleteTx}
                  />
                )}
              </Tab.Pane>

              {/* ── CHI ── */}
              <Tab.Pane eventKey="expense">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <strong>Tổng chi:</strong>{' '}
                    <span className="text-danger fw-bold">{fmt(fund.expenseTotal, fund.currency)}</span>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => openAddTx('expense')}>
                    + Thêm chi
                  </Button>
                </div>
                {loadingTx ? <Spinner animation="border" size="sm" /> : (
                  <TransactionTable
                    transactions={transactions} type="expense" currency={fund.currency}
                    onEdit={tx => { setEditTx(tx); setDefaultTxType('expense'); setShowTxForm(true); }}
                    onDelete={handleDeleteTx}
                  />
                )}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button size="sm" variant="success" onClick={() => openAddTx('income')}>+ Thu</Button>
          <Button size="sm" variant="danger"  onClick={() => openAddTx('expense')}>+ Chi</Button>
        </Modal.Footer>
      </Modal>

      <TransactionFormModal
        show={showTxForm}
        onHide={() => setShowTxForm(false)}
        fundId={fund._id}
        currency={fund.currency}
        defaultType={defaultTxType}
        initial={editTx}
        members={members}
        onSaved={handleTxSaved}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN: FundManager
// ══════════════════════════════════════════════════════════════════════════════
export default function FundManager() {
  const [funds, setFunds] = useState<ClanFund[]>([]);
  const [members, setMembers] = useState<Pick<Member, '_id' | 'name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editFund, setEditFund] = useState<ClanFund | undefined>();
  const [detailFund, setDetailFund] = useState<ClanFund | null>(null);

  const fetchFunds = useCallback(async () => {
    try {
      const { data } = await API.get<ClanFund[]>('/clan/funds');
      setFunds(data);
    } catch {
      toast.error('Lỗi khi tải danh sách quỹ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunds();
    API.get<Member[]>('/members/').then(({ data }) =>
      setMembers(data.map(m => ({ _id: m._id, name: m.name })))
    ).catch(() => {});
  }, [fetchFunds]);

  const handleFundSaved = (fund: ClanFund) => {
    setFunds(prev => {
      const idx = prev.findIndex(f => f._id === fund._id);
      return idx >= 0 ? prev.map((f, i) => i === idx ? fund : f) : [fund, ...prev];
    });
  };

  const handleDeleteFund = async (fund: ClanFund) => {
    if (!confirm(`Xóa quỹ "${fund.name}" và toàn bộ giao dịch?`)) return;
    try {
      await API.delete(`/clan/funds/${fund._id}`);
      setFunds(prev => prev.filter(f => f._id !== fund._id));
      toast.success('Đã xóa quỹ');
    } catch {
      toast.error('Lỗi khi xóa quỹ');
    }
  };

  if (loading) return <Spinner animation="border" size="sm" />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="text-muted">Quản lý các quỹ của dòng họ</span>
        <Button size="sm" onClick={() => { setEditFund(undefined); setShowCreateForm(true); }}>
          + Tạo quỹ mới
        </Button>
      </div>

      {funds.length === 0 && (
        <p className="text-muted text-center py-3">Chưa có quỹ nào. Nhấn "+ Tạo quỹ mới" để bắt đầu.</p>
      )}

      <Row className="g-3">
        {funds.map(fund => {
          const balance = fund.balance ?? (fund.incomeTotal - fund.expenseTotal);
          const progress = fund.targetAmount > 0 ? Math.min(100, (balance / fund.targetAmount) * 100) : null;
          return (
            <Col key={fund._id} xs={12} md={6}>
              <Card className={`h-100 ${!fund.isEnabled ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <Card.Title className="mb-0 fs-6">{fund.name}</Card.Title>
                      {fund.purpose && <small className="text-muted">{fund.purpose}</small>}
                    </div>
                    <div className="d-flex gap-1">
                      <Button size="sm" variant="outline-secondary" className="py-0"
                        onClick={() => { setEditFund(fund); setShowCreateForm(true); }}>✏️</Button>
                      <Button size="sm" variant="outline-danger" className="py-0"
                        onClick={() => handleDeleteFund(fund)}>🗑️</Button>
                    </div>
                  </div>

                  <div className="d-flex gap-3 mb-2">
                    <div><small className="text-muted">Thu</small><div className="text-success fw-semibold">{fmt(fund.incomeTotal, fund.currency)}</div></div>
                    <div><small className="text-muted">Chi</small><div className="text-danger fw-semibold">{fmt(fund.expenseTotal, fund.currency)}</div></div>
                    <div><small className="text-muted">Số dư</small><div className={`fw-bold ${balance >= 0 ? 'text-primary' : 'text-warning'}`}>{fmt(balance, fund.currency)}</div></div>
                  </div>

                  {progress !== null && (
                    <div className="mb-2">
                      <ProgressBar now={progress} label={`${Math.round(progress)}%`}
                        variant={progress >= 100 ? 'success' : progress >= 60 ? 'info' : 'warning'}
                        style={{ height: 8 }} />
                      <small className="text-muted">Mục tiêu: {fmt(fund.targetAmount, fund.currency)}</small>
                    </div>
                  )}

                  <Button size="sm" variant="outline-primary" className="w-100 mt-1"
                    onClick={() => setDetailFund(fund)}>
                    Xem chi tiết & giao dịch →
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Create / Edit fund */}
      <FundFormModal
        show={showCreateForm}
        onHide={() => setShowCreateForm(false)}
        initial={editFund}
        onSaved={handleFundSaved}
      />

      {/* Fund detail modal */}
      {detailFund && (
        <FundDetailModal
          show={!!detailFund}
          fund={detailFund}
          onHide={() => setDetailFund(null)}
          members={members}
          onFundUpdated={updated => {
            setFunds(prev => prev.map(f => f._id === updated._id ? updated : f));
            setDetailFund(updated);
          }}
        />
      )}
    </>
  );
}
