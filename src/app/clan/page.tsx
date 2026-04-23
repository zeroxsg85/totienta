'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button, Form, InputGroup, Modal, Badge, Card, Row, Col,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit, faTrash, faPlus, faSave, faPeopleGroup,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/lib/api';
import Loading from '@/components/Loading';
import { ClanInfo, ClanEvent, LunarDate } from '@/types';
import VisibilitySettingsPanel from './VisibilitySettings';
import FundManager from '@/components/FundManager';
import UpcomingEventsWidget from '@/components/UpcomingEventsWidget';

const EVENT_TYPES = ['giỗ tổ', 'họp họ', 'tảo mộ', 'khác'] as const;
type EventType = typeof EVENT_TYPES[number];

const EMPTY_EVENT: Omit<ClanEvent, '_id'> = {
  title: '',
  date: '',
  lunarDate: {},
  type: 'khác',
  location: '',
  livestreamUrl: '',
};

/** Banner một lần: bật shrine hàng loạt cho thành viên đã mất */
function ShrineMigrationBanner() {
  const [migrating, setMigrating] = useState(false);
  const [needsMigration, setNeedsMigration] = useState<boolean | null>(null); // null = đang check

  // Check xem còn thành viên đã mất chưa bật shrine không
  useEffect(() => {
    API.get<any[]>('/members/').then(({ data }) => {
      const hasUnshined = data.some(m => m.isAlive === false && !m.shrine?.isEnabled);
      setNeedsMigration(hasUnshined);
    }).catch(() => setNeedsMigration(false));
  }, []);

  const handleMigrate = async () => {
    if (!confirm('Tự động bật bàn thờ số cho tất cả thành viên đã mất chưa có bàn thờ?')) return;
    setMigrating(true);
    try {
      const res = await API.post<{ message: string; modifiedCount: number }>('/clan/migrate-shrine');
      toast.success(res.data.message);
      setNeedsMigration(false);
    } catch {
      toast.error('Không thể chạy migration');
    } finally {
      setMigrating(false);
    }
  };

  if (needsMigration === null || needsMigration === false) return null;

  return (
    <Card className="mb-4 border-warning">
      <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <strong>🏮 Bàn thờ số cho thành viên đã mất</strong>
          <div className="text-muted small mt-1">
            Bấm để tự động bật bàn thờ số cho tất cả thành viên đã mất chưa được bật.
          </div>
        </div>
        <Button variant="warning" size="sm" onClick={handleMigrate} disabled={migrating}>
          {migrating ? 'Đang xử lý...' : '⚡ Bật tất cả ngay'}
        </Button>
      </Card.Body>
    </Card>
  );
}

export default function ClanPage(): JSX.Element | null {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewCode, setViewCode] = useState<string>('');

  // Data
  const [clanInfo, setClanInfo] = useState<ClanInfo>({});
  const [events, setEvents] = useState<ClanEvent[]>([]);
  const [widgetKey, setWidgetKey] = useState(0);

  // Event modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClanEvent | null>(null);
  const [eventForm, setEventForm] = useState<Omit<ClanEvent, '_id'>>(EMPTY_EVENT);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchClanData();
      // Lấy viewCode để tạo link public
      API.get<{ viewCode: string }>('/members/view-code')
        .then(({ data }) => setViewCode(data.viewCode || ''))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const fetchClanData = async () => {
    try {
      const { data } = await API.get<{ clanInfo: ClanInfo; events: ClanEvent[] }>('/clan');
      setClanInfo(data.clanInfo || {});
      setEvents(data.events || []);
    } catch {
      toast.error('Lỗi khi tải dữ liệu dòng họ');
    } finally {
      setLoading(false);
    }
  };

  // ── Save clan info ────────────────────────────────────────────────────────────
  const handleSaveClanInfo = async () => {
    setSaving(true);
    try {
      await API.put('/clan/info', clanInfo);
      toast.success('Đã lưu thông tin dòng họ');
    } catch {
      toast.error('Lỗi khi lưu thông tin dòng họ');
    } finally {
      setSaving(false);
    }
  };


  // ── Event CRUD ────────────────────────────────────────────────────────────────
  const openAddEvent = () => {
    setEditingEvent(null);
    setEventForm(EMPTY_EVENT);
    setShowEventModal(true);
  };

  const openEditEvent = (ev: ClanEvent) => {
    setEditingEvent(ev);
    setEventForm({
      title: ev.title,
      date: ev.date || '',
      lunarDate: ev.lunarDate || {},
      type: ev.type || 'khác',
      location: ev.location || '',
      livestreamUrl: ev.livestreamUrl || '',
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingEvent?._id) {
        const { data } = await API.put<ClanEvent>(`/clan/events/${editingEvent._id}`, eventForm);
        setEvents((prev) => prev.map((ev) => ev._id === editingEvent._id ? { ...data, _id: editingEvent._id } : ev));
        toast.success('Đã cập nhật sự kiện');
      } else {
        const { data } = await API.post<ClanEvent>('/clan/events', eventForm);
        setEvents((prev) => [...prev, data]);
        toast.success('Đã thêm sự kiện');
      }
      setWidgetKey(k => k + 1);
      setShowEventModal(false);
    } catch {
      toast.error('Lỗi khi lưu sự kiện');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Xóa sự kiện này?')) return;
    try {
      await API.delete(`/clan/events/${id}`);
      setEvents((prev) => prev.filter((ev) => ev._id !== id));
      setWidgetKey(k => k + 1);
      toast.success('Đã xóa sự kiện');
    } catch {
      toast.error('Lỗi khi xóa sự kiện');
    }
  };

  const setLunar = (patch: Partial<LunarDate>) =>
    setEventForm((prev) => ({ ...prev, lunarDate: { ...prev.lunarDate, ...patch } }));

  const EVENT_TYPE_LABELS: Record<EventType, string> = {
    'giỗ tổ': '🏮 Giỗ tổ',
    'họp họ': '👥 Họp họ',
    'tảo mộ': '⚰️ Tảo mộ',
    'khác': '📅 Khác',
  };

  if (isLoading || loading) return <Loading text="Đang tải..." />;
  if (!isAuthenticated) return null;

  return (
    <div className="container mt-5 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h2 className="mb-0">
          <FontAwesomeIcon icon={faPeopleGroup} className="me-2" />
          Quản Lý Dòng Họ
        </h2>
        {viewCode && (
          <Link
            href={`/${viewCode}/clan`}
            target="_blank"
            className="btn btn-outline-primary btn-sm"
          >
            🔗 Trang công khai dòng họ ↗
          </Link>
        )}
      </div>

      {/* ══════════════ SỰ KIỆN SẮP TỚI ══════════════ */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Header className="bg-white border-bottom">
          <strong>🗓️ Sự kiện sắp tới</strong>
          <span className="text-muted ms-2" style={{ fontSize: '0.82rem' }}>
            sinh nhật · ngày giỗ · sự kiện dòng họ
          </span>
        </Card.Header>
        <Card.Body className="py-2">
          <UpcomingEventsWidget refreshKey={widgetKey} />
        </Card.Body>
      </Card>

      {/* ══════════════ THÔNG TIN DÒNG HỌ ══════════════ */}
      <Card className="mb-4">
        <Card.Header>
          <strong>🏰 Thông tin dòng họ</strong>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <InputGroup>
                <InputGroup.Text>Gốc tích</InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Nguồn gốc dòng họ..."
                  value={clanInfo.origin || ""}
                  onChange={(e) => setClanInfo({ ...clanInfo, origin: e.target.value })}
                />
              </InputGroup>
            </Col>
            <Col xs={12} md={6}>
              <InputGroup>
                <InputGroup.Text>Quê gốc</InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Quê hương tổ tiên..."
                  value={clanInfo.ancestralHome || ""}
                  onChange={(e) => setClanInfo({ ...clanInfo, ancestralHome: e.target.value })}
                />
              </InputGroup>
            </Col>
            <Col xs={12} md={6}>
              <InputGroup>
                <InputGroup.Text>Gia huấn</InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Câu châm ngôn / gia huấn..."
                  value={clanInfo.motto || ""}
                  onChange={(e) => setClanInfo({ ...clanInfo, motto: e.target.value })}
                />
              </InputGroup>
            </Col>
            <Col xs={12} md={6}>
              <InputGroup>
                <InputGroup.Text>Biểu tượng (URL)</InputGroup.Text>
                <Form.Control
                  type="url"
                  placeholder="https://..."
                  value={clanInfo.crest || ""}
                  onChange={(e) => setClanInfo({ ...clanInfo, crest: e.target.value })}
                />
              </InputGroup>
            </Col>
          </Row>
          {clanInfo.crest && (
            <div className="mt-3">
              <img src={clanInfo.crest} alt="Biểu tượng dòng họ" style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }} />
            </div>
          )}
          <div className="mt-3">
            <Button variant="primary" onClick={handleSaveClanInfo} disabled={saving}>
              <FontAwesomeIcon icon={faSave} className="me-1" />
              {saving ? "Đang lưu..." : "Lưu thông tin dòng họ"}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* ══════════════ SỰ KIỆN DÒNG HỌ ══════════════ */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>📅 Sự kiện dòng họ</strong>
          <Button variant="outline-primary" size="sm" onClick={openAddEvent}>
            <FontAwesomeIcon icon={faPlus} /> Thêm sự kiện
          </Button>
        </Card.Header>
        <Card.Body>
          {events.length === 0 ? (
            <p className="text-muted text-center">Chưa có sự kiện nào. Nhấn "Thêm sự kiện" để tạo.</p>
          ) : (
            <div className="d-flex flex-column gap-2">
              {events.map((ev) => (
                <div key={ev._id} className="border rounded p-3 d-flex justify-content-between align-items-start">
                  <div>
                    <div className="fw-bold">{ev.title}</div>
                    <div className="small text-muted">
                      <Badge bg="secondary" className="me-1">
                        {EVENT_TYPE_LABELS[ev.type as EventType] || ev.type}
                      </Badge>
                      {ev.date && <span className="me-2">📅 {new Date(ev.date).toLocaleDateString("vi-VN")}</span>}
                      {ev.lunarDate?.day && ev.lunarDate?.month && (
                        <span className="me-2">
                          🌙 Ngày {ev.lunarDate.day} tháng {ev.lunarDate.month}
                        </span>
                      )}
                      {ev.location && <span className="me-2">📍 {ev.location}</span>}
                    </div>
                    {ev.livestreamUrl && (
                      <a href={ev.livestreamUrl} target="_blank" rel="noopener noreferrer" className="small">
                        🔴 Xem livestream
                      </a>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <Button variant="outline-primary" size="sm" onClick={() => openEditEvent(ev)}>
                      <FontAwesomeIcon icon={faEdit} />
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDeleteEvent(ev._id!)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ══════════════ QUỸ DÒNG HỌ ══════════════ */}
      <Card className="mb-4">
        <Card.Header>
          <strong>💰 Quỹ dòng họ</strong>
        </Card.Header>
        <Card.Body>
          <FundManager />
        </Card.Body>
      </Card>

      {/* ══════════════ BẬT SHRINE CHO NGƯỜI ĐÃ MẤT ══════════════ */}
      <ShrineMigrationBanner />

      {/* ══════════════ CÀI ĐẶT HIỂN THỊ ══════════════ */}
      <VisibilitySettingsPanel />

      {/* ══════════════ MODAL SỰ KIỆN ══════════════ */}
      <Modal show={showEventModal} onHide={() => setShowEventModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingEvent ? "Chỉnh sửa sự kiện" : "Thêm sự kiện mới"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSaveEvent}>
            <InputGroup className="mb-3">
              <InputGroup.Text>Tên</InputGroup.Text>
              <Form.Control
                type="text"
                required
                placeholder="Tên sự kiện..."
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              />
            </InputGroup>

            <InputGroup className="mb-3">
              <InputGroup.Text>Loại</InputGroup.Text>
              <Form.Select
                value={eventForm.type || "khác"}
                onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as EventType })}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EVENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Form.Select>
            </InputGroup>

            <InputGroup className="mb-3">
              <InputGroup.Text>Ngày (dương)</InputGroup.Text>
              <Form.Control
                type="date"
                value={eventForm.date || ""}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              />
            </InputGroup>

            <Row className="mb-3 g-2">
              <Col xs={4}>
                <InputGroup>
                  <InputGroup.Text>Ngày ÂL</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min={1}
                    max={30}
                    value={eventForm.lunarDate?.day || ""}
                    onChange={(e) => setLunar({ day: Number(e.target.value) })}
                  />
                </InputGroup>
              </Col>
              <Col xs={4}>
                <InputGroup>
                  <InputGroup.Text>Tháng ÂL</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min={1}
                    max={12}
                    value={eventForm.lunarDate?.month || ""}
                    onChange={(e) => setLunar({ month: Number(e.target.value) })}
                  />
                </InputGroup>
              </Col>
              <Col xs={4}>
                <InputGroup>
                  <InputGroup.Text>Năm</InputGroup.Text>
                  <Form.Control
                    type="number"
                    value={eventForm.lunarDate?.year || ""}
                    onChange={(e) => setLunar({ year: Number(e.target.value) })}
                  />
                </InputGroup>
              </Col>
            </Row>

            <InputGroup className="mb-3">
              <InputGroup.Text>Địa điểm</InputGroup.Text>
              <Form.Control
                type="text"
                value={eventForm.location || ""}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              />
            </InputGroup>

            <InputGroup className="mb-3">
              <InputGroup.Text>URL Livestream</InputGroup.Text>
              <Form.Control
                type="url"
                placeholder="https://..."
                value={eventForm.livestreamUrl || ""}
                onChange={(e) => setEventForm({ ...eventForm, livestreamUrl: e.target.value })}
              />
            </InputGroup>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowEventModal(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
