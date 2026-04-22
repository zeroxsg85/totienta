'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import API from '@/lib/api';
import { VisibilitySettings, VisibilityLevel } from '@/types';

const FIELDS: { key: keyof VisibilitySettings; label: string; defaultLevel: VisibilityLevel }[] = [
  { key: 'phoneNumber', label: '📞 Số điện thoại', defaultLevel: 'member' },
  { key: 'birthday',    label: '🎂 Ngày sinh',     defaultLevel: 'member' },
  { key: 'address',     label: '🏠 Địa chỉ',        defaultLevel: 'member' },
  { key: 'idCard',      label: '🆔 Giấy tờ tùy thân', defaultLevel: 'member' },
  { key: 'occupation',  label: '💼 Nghề nghiệp',   defaultLevel: 'public' },
  { key: 'hometown',    label: '📍 Quê quán',       defaultLevel: 'public' },
  { key: 'religion',    label: '🛐 Tôn giáo',       defaultLevel: 'public' },
  { key: 'spouse',      label: '💑 Vợ/Chồng',       defaultLevel: 'member' },
  { key: 'memorial',    label: '📖 Tưởng niệm',     defaultLevel: 'public' },
  { key: 'burial',      label: '⚰️ Phần mộ',        defaultLevel: 'member' },
  { key: 'shrine',      label: '🏮 Bàn thờ số',     defaultLevel: 'public' },
  { key: 'legacy',      label: '📜 Di chúc',         defaultLevel: 'member' },
];

const LEVEL_LABELS: Record<VisibilityLevel, string> = {
  public: '🌐 Công khai',
  login:  '🔑 Đăng nhập',
  member: '🔒 Thành viên',
};

export default function VisibilitySettingsPanel() {
  const [settings, setSettings] = useState<VisibilitySettings>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    API.get<{ visibilitySettings: VisibilitySettings }>('/clan/visibility')
      .then((r) => { setSettings(r.data.visibilitySettings || {}); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const handleChange = (key: keyof VisibilitySettings, value: VisibilityLevel) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put('/clan/visibility', { visibilitySettings: settings });
      toast.success('Đã lưu cài đặt hiển thị');
    } catch {
      toast.error('Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="text-muted small">Đang tải...</p>;

  return (
    <Card className="mb-4">
      <Card.Header><strong>🔒 Cài đặt hiển thị thông tin</strong></Card.Header>
      <Card.Body>
        <p className="text-muted small mb-3">
          Chọn ai được phép xem từng loại thông tin trong gia phả của bạn.
          <br />
          🌐 <b>Công khai</b>: Ai cũng xem được &nbsp;|&nbsp;
          🔑 <b>Đăng nhập</b>: Phải có tài khoản &nbsp;|&nbsp;
          🔒 <b>Thành viên</b>: Chỉ quản lý & thành viên gia phả
        </p>
        {FIELDS.map(({ key, label, defaultLevel }) => (
          <Row key={key} className="align-items-center mb-2">
            <Col xs={6} sm={5}>
              <span style={{ fontSize: '0.9rem' }}>{label}</span>
            </Col>
            <Col xs={6} sm={7}>
              <Form.Select
                size="sm"
                value={settings[key] || defaultLevel}
                onChange={(e) => handleChange(key, e.target.value as VisibilityLevel)}
              >
                {(Object.entries(LEVEL_LABELS) as [VisibilityLevel, string][]).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        ))}
        <div className="mt-3 text-end">
          <Button variant="success" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
