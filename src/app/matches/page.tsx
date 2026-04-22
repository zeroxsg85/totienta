'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge, Button, Card, Col, Nav, Row, Spinner, Tab,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/lib/api';
import { CrossTreeMatch, CrossTreeLink } from '@/types';
import Link from 'next/link';

// ── Helper hiển thị ngày sinh ─────────────────────────────────────────────────
function birthYear(member?: { birthday?: { solar?: string } } | null) {
  if (!member?.birthday?.solar) return '';
  return new Date(member.birthday.solar).getFullYear().toString();
}

// ── Badge màu theo matchScore ─────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 80 ? 'danger' : score >= 40 ? 'warning' : 'secondary';
  return <Badge bg={variant}>{score}% khớp</Badge>;
}

// ── Card 1 match ──────────────────────────────────────────────────────────────
function MatchCard({
  match,
  onConfirm,
  onDeny,
  loading,
}: {
  match: CrossTreeMatch;
  onConfirm: (id: string) => void;
  onDeny: (id: string) => void;
  loading: boolean;
}) {
  const { myMember, theirMember, theirViewCode, matchFields, matchScore,
          myConfirmed, myDenied, theirConfirmed, status, autoSuggestedFrom } = match;

  const statusBadge = () => {
    if (status === 'confirmed') return <Badge bg="success">✅ Đã xác nhận – đã kết nối</Badge>;
    if (status === 'denied')   return <Badge bg="danger">❌ Đã từ chối</Badge>;
    if (myConfirmed)           return <Badge bg="info">Bạn đã xác nhận – chờ bên kia</Badge>;
    if (myDenied)              return <Badge bg="secondary">Bạn đã từ chối</Badge>;
    return <Badge bg="warning" text="dark">⏳ Chờ xác nhận</Badge>;
  };

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        {autoSuggestedFrom && (
          <small className="text-muted d-block mb-2">🤖 Gợi ý tự động từ kết nối đã xác nhận</small>
        )}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex gap-2 flex-wrap">
            <ScoreBadge score={matchScore} />
            {matchFields.map((f) => (
              <Badge key={f} bg="light" text="dark" className="border">
                {f === 'idCard' ? '🆔 CCCD/CMND' :
                 f === 'phone' ? '📞 SĐT' :
                 f === 'name+birthday' ? '👤 Tên + năm sinh' : '👤 Tên'}
              </Badge>
            ))}
          </div>
          {statusBadge()}
        </div>

        <Row className="g-3 align-items-center">
          {/* Bên của tôi */}
          <Col xs={5} className="text-center">
            <div className="fw-bold">{myMember?.name || match.memberAName}</div>
            {birthYear(myMember) && <small className="text-muted">Năm sinh: {birthYear(myMember)}</small>}
            <div><Badge bg="primary" className="mt-1">Cây của bạn</Badge></div>
          </Col>

          <Col xs={2} className="text-center fs-4">🔗</Col>

          {/* Bên kia */}
          <Col xs={5} className="text-center">
            <div className="fw-bold">{theirMember?.name || match.memberBName}</div>
            {birthYear(theirMember) && <small className="text-muted">Năm sinh: {birthYear(theirMember)}</small>}
            {theirViewCode && (
              <div>
                <Link href={`/${theirViewCode}`} target="_blank">
                  <Badge bg="secondary" className="mt-1">Xem cây kia ↗</Badge>
                </Link>
              </div>
            )}
          </Col>
        </Row>

        {/* Actions */}
        {status === 'pending' && !myConfirmed && !myDenied && (
          <div className="mt-3 d-flex gap-2 justify-content-end">
            <Button size="sm" variant="outline-danger" disabled={loading}
              onClick={() => onDeny(match._id)}>
              ✗ Không phải cùng người
            </Button>
            <Button size="sm" variant="success" disabled={loading}
              onClick={() => onConfirm(match._id)}>
              ✓ Xác nhận cùng người
            </Button>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="mt-2 text-success small">
            🎉 Hai cây gia phả đã được kết nối tại cặp thành viên này!
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

// ── Card 1 link (cây đã kết nối) ─────────────────────────────────────────────
function LinkCard({ link, myUserId }: { link: CrossTreeLink; myUserId: string }) {
  const isA = link.treeOwnerA._id === myUserId;
  const other = isA ? link.treeOwnerB : link.treeOwnerA;
  const otherViewCode = isA ? link.viewCodeB : link.viewCodeA;

  return (
    <Card className="mb-3 shadow-sm border-success">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <strong>🌳 {other.treeName || other.name}</strong>
          {otherViewCode && (
            <Link href={`/${otherViewCode}`} target="_blank">
              <Button size="sm" variant="outline-success">Xem cây ↗</Button>
            </Link>
          )}
        </div>
        <div className="text-muted small mb-2">
          {link.linkedPairs.length} cặp thành viên đã xác nhận trùng
        </div>
        <div className="d-flex flex-wrap gap-2">
          {link.linkedPairs.map((pair, i) => (
            <Badge key={i} bg="light" text="dark" className="border p-2">
              {pair.memberA?.name || '?'} ↔ {pair.memberB?.name || '?'}
            </Badge>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
// Decode userId từ JWT (chỉ dùng cho UI, không dùng cho auth)
function getMyUserId(): string {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || payload._id || '';
  } catch { return ''; }
}

export default function MatchesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [myUserId, setMyUserId] = useState('');

  const [matches, setMatches] = useState<CrossTreeMatch[]>([]);
  const [links, setLinks] = useState<CrossTreeLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState('pending');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
    if (isAuthenticated) setMyUserId(getMyUserId());
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      setLoading(true);
      try {
        const [matchRes, linkRes] = await Promise.all([
          API.get<{ matches: CrossTreeMatch[] }>('/cross-tree/matches'),
          API.get<{ links: CrossTreeLink[] }>('/cross-tree/links'),
        ]);
        setMatches(matchRes.data.matches);
        setLinks(linkRes.data.links);
      } catch {
        toast.error('Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const handleConfirm = async (id: string) => {
    setActionLoading(true);
    try {
      const { data } = await API.put<{ match: CrossTreeMatch; bothConfirmed: boolean }>(
        `/cross-tree/matches/${id}/confirm`
      );
      setMatches((prev) => prev.map((m) => m._id === id ? { ...m, ...data.match } : m));
      if (data.bothConfirmed) {
        toast.success('🎉 Cả hai đã xác nhận! Hai cây gia phả đã được kết nối.');
        // Reload links
        const { data: linkData } = await API.get<{ links: CrossTreeLink[] }>('/cross-tree/links');
        setLinks(linkData.links);
      } else {
        toast.success('Đã xác nhận! Đang chờ bên kia xác nhận.');
      }
    } catch {
      toast.error('Không thể xác nhận');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async (id: string) => {
    if (!confirm('Xác nhận đây không phải cùng 1 người?')) return;
    setActionLoading(true);
    try {
      await API.put(`/cross-tree/matches/${id}/deny`);
      setMatches((prev) => prev.map((m) => m._id === id ? { ...m, status: 'denied', myDenied: true } : m));
      toast.info('Đã đánh dấu không trùng');
    } catch {
      toast.error('Không thể cập nhật');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingMatches   = matches.filter((m) => m.status === 'pending');
  const confirmedMatches = matches.filter((m) => m.status === 'confirmed');
  const deniedMatches    = matches.filter((m) => m.status === 'denied');

  if (isLoading || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container mt-5 pt-4">
      <h2 className="mb-4">🔗 Kết nối dòng họ</h2>
      <p className="text-muted mb-4">
        Hệ thống tự động phát hiện thành viên trùng giữa các cây gia phả khác nhau. Khi cả hai quản lý xác nhận, hai cây sẽ được kết nối tại
        node chung đó.
      </p>

      {/* Cây đã kết nối */}
      {links.length > 0 && (
        <div className="mb-4">
          <h5 className="text-success">🌳 Cây gia phả đã kết nối ({links.length})</h5>
          {links.map((link) => (
            <LinkCard key={link._id} link={link} myUserId={myUserId} />
          ))}
        </div>
      )}

      {/* Danh sách matches */}
      <Tab.Container activeKey={tab} onSelect={(k) => setTab(k || "pending")}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="pending">
              Chờ xác nhận
              {pendingMatches.length > 0 && (
                <Badge bg="warning" text="dark" className="ms-1">
                  {pendingMatches.length}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="confirmed">
              Đã xác nhận
              {confirmedMatches.length > 0 && (
                <Badge bg="success" className="ms-1">
                  {confirmedMatches.length}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="denied">
              Đã từ chối
              {deniedMatches.length > 0 && (
                <Badge bg="secondary" className="ms-1">
                  {deniedMatches.length}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="pending">
            {pendingMatches.length === 0 ? (
              <p className="text-muted text-center py-4">Không có kết nối nào đang chờ xác nhận.</p>
            ) : (
              pendingMatches.map((m) => (
                <MatchCard key={m._id} match={m} loading={actionLoading} onConfirm={handleConfirm} onDeny={handleDeny} />
              ))
            )}
          </Tab.Pane>
          <Tab.Pane eventKey="confirmed">
            {confirmedMatches.length === 0 ? (
              <p className="text-muted text-center py-4">Chưa có kết nối nào được xác nhận.</p>
            ) : (
              confirmedMatches.map((m) => (
                <MatchCard key={m._id} match={m} loading={actionLoading} onConfirm={handleConfirm} onDeny={handleDeny} />
              ))
            )}
          </Tab.Pane>
          <Tab.Pane eventKey="denied">
            {deniedMatches.length === 0 ? (
              <p className="text-muted text-center py-4">Chưa có kết nối nào bị từ chối.</p>
            ) : (
              deniedMatches.map((m) => (
                <MatchCard key={m._id} match={m} loading={actionLoading} onConfirm={handleConfirm} onDeny={handleDeny} />
              ))
            )}
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
}
