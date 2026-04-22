'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, ProgressBar, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';
import { Member, ShrineOfferingStat } from '@/types';

interface ShrineModalProps {
  show: boolean;
  onHide: () => void;
  member: Member;
  baseUrl: string;
}

const INCENSE_COOLDOWN_MS  = 60 * 60 * 1000; // 60 phút
const OFFERING_COOLDOWN_MS = 60 * 60 * 1000; // 60 phút

const THEMES: Record<string, { bg: string; border: string; btnBg: string }> = {
  traditional: { bg: '#fdf5e6', border: '#8B4513', btnBg: '#8B4513' },
  modern:      { bg: '#f0f4f8', border: '#4a6fa5', btnBg: '#4a6fa5' },
  nature:      { bg: '#f0faf0', border: '#2e7d32', btnBg: '#2e7d32' },
  lotus:       { bg: '#fff0f5', border: '#ad1457', btnBg: '#ad1457' },
};

export const PRESET_OFFERINGS: { emoji: string; label: string }[] = [
  { emoji: '🎋', label: 'Nhang' },
  { emoji: '🕯️', label: 'Nến' },
  { emoji: '🌸', label: 'Hoa' },
  { emoji: '🍊', label: 'Trái cây' },
  { emoji: '🍵', label: 'Trà' },
  { emoji: '🍷', label: 'Rượu' },
  { emoji: '🍚', label: 'Cơm' },
  { emoji: '🌿', label: 'Trầu cau' },
  { emoji: '🍰', label: 'Bánh kẹo' },
  { emoji: '🧧', label: 'Vàng mã' },
  { emoji: '💧', label: 'Nước' },
];

// ── LocalStorage helpers ──────────────────────────────────────────────────────
function lsKey(memberId: string, type: string) {
  return `shrine_${type}_${memberId}`;
}

function getRemainingMs(key: string, cooldownMs: number): number {
  if (typeof window === 'undefined') return 0;
  const saved = localStorage.getItem(key);
  if (!saved) return 0;
  return Math.max(0, cooldownMs - (Date.now() - parseInt(saved, 10)));
}

function getRemainingFromDate(isoDate: string | undefined, cooldownMs: number): number {
  if (!isoDate) return 0;
  return Math.max(0, cooldownMs - (Date.now() - new Date(isoDate).getTime()));
}

/** Lấy cooldown lớn nhất giữa localStorage và DB timestamp – sống qua reload */
function resolveRemaining(lsKeyName: string, dbDate: string | undefined, cooldownMs: number): number {
  const fromLs = getRemainingMs(lsKeyName, cooldownMs);
  const fromDb = getRemainingFromDate(dbDate, cooldownMs);
  return Math.max(fromLs, fromDb);
}

function formatCountdown(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
function hasToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}

/** Lưu lựa chọn Ẩn danh trong session – chỉ hỏi 1 lần */
function isAnonChosen(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('shrine_anon') === '1';
}
function setAnonChosen() {
  sessionStorage.setItem('shrine_anon', '1');
}

type PendingAction =
  | { type: 'incense' }
  | { type: 'offering'; label: string };

// ── ShrineLog type ────────────────────────────────────────────────────────────
interface ShrineLogEntry {
  _id: string;
  action: 'incense' | 'offering';
  offeringLabel?: string;
  displayName: string;
  createdAt: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShrineModal({ show, onHide, member, baseUrl }: ShrineModalProps): JSX.Element | null {
  const router = useRouter();

  const [incenseCount, setIncenseCount]       = useState(member.shrine?.incenseCount || 0);
  const [incenseRemaining, setIncenseRemaining] = useState(0);
  const [burningIncense, setBurningIncense]   = useState(false);

  const [offeringStats, setOfferingStats]         = useState<ShrineOfferingStat[]>(member.shrine?.offeringStats || []);
  const [offeringRemaining, setOfferingRemaining] = useState<Record<string, number>>({});
  const [offeringPanel, setOfferingPanel]         = useState(false);
  const [offeringLoading, setOfferingLoading]     = useState<string | null>(null);

  // Identity modal
  const [showIdentity, setShowIdentity]   = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Shrine log
  const [shrineLogs, setShrineLogs]     = useState<ShrineLogEntry[]>([]);
  const [showLog, setShowLog]           = useState(false);
  const logFetched                      = useRef(false);

  const theme         = THEMES[member.shrine?.backgroundTheme || ''] || THEMES['traditional'];
  const featuredLabels = new Set(member.shrine?.offerings || []);

  // ── lastIncense / lastOffered từ state offeringStats ──────────────────────
  const incenseDbDate = member.shrine?.lastIncense;

  // ── Tick cooldowns mỗi giây (sử dụng resolveRemaining) ───────────────────
  useEffect(() => {
    if (!show) return;

    const tick = () => {
      // Incense: max(localStorage, DB)
      setIncenseRemaining(
        resolveRemaining(lsKey(member._id, 'incense'), incenseDbDate, INCENSE_COOLDOWN_MS)
      );

      // Offerings: max(localStorage, DB lastOffered per item)
      const rem: Record<string, number> = {};
      PRESET_OFFERINGS.forEach(({ label }) => {
        const stat = offeringStats.find((s) => s.label === label);
        rem[label] = resolveRemaining(
          lsKey(member._id, `offering_${label}`),
          stat?.lastOffered,
          OFFERING_COOLDOWN_MS
        );
      });
      setOfferingRemaining(rem);
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [show, member._id, incenseDbDate, offeringStats]);

  // ── Reset khi đổi member ──────────────────────────────────────────────────
  useEffect(() => {
    setIncenseCount(member.shrine?.incenseCount || 0);
    setOfferingStats(member.shrine?.offeringStats || []);
    setOfferingPanel(false);
    setShowLog(false);
    logFetched.current = false;
  }, [member._id]);

  // ── Tải shrine log khi mở log panel ──────────────────────────────────────
  useEffect(() => {
    if (!showLog || logFetched.current) return;
    logFetched.current = true;
    API.get<ShrineLogEntry[]>(`/members/${member._id}/shrine/logs`)
      .then((r) => setShrineLogs(r.data))
      .catch(() => {});
  }, [showLog, member._id]);

  // ── Kiểm tra xem cần hỏi identity không ──────────────────────────────────
  const needsIdentityCheck = (): boolean => !hasToken() && !isAnonChosen();

  // ── Thực thi thắp nhang ───────────────────────────────────────────────────
  const doBurnIncense = useCallback(async () => {
    setBurningIncense(true);
    try {
      const res = await API.post<{ incenseCount: number; lastIncense: string }>(
        `/members/${member._id}/shrine/incense`
      );
      setIncenseCount(res.data.incenseCount);
      localStorage.setItem(lsKey(member._id, 'incense'), String(Date.now()));
      setIncenseRemaining(INCENSE_COOLDOWN_MS);
      toast.success('🙏 Đã thắp nhang – nhang cháy trong 60 phút');
      logFetched.current = false; // refresh log
    } catch {
      toast.error('Không thể thắp nhang lúc này');
    } finally {
      setBurningIncense(false);
    }
  }, [member._id]);

  // ── Thực thi dâng lễ vật ─────────────────────────────────────────────────
  const doOffer = useCallback(async (label: string) => {
    setOfferingLoading(label);
    try {
      const res = await API.post<ShrineOfferingStat>(`/members/${member._id}/shrine/offering`, { label });
      setOfferingStats((prev) => {
        const exists = prev.find((s) => s.label === label);
        if (exists)
          return prev.map((s) =>
            s.label === label ? { ...s, count: res.data.count, lastOffered: res.data.lastOffered } : s
          );
        return [...prev, res.data];
      });
      localStorage.setItem(lsKey(member._id, `offering_${label}`), String(Date.now()));
      setOfferingRemaining((prev) => ({ ...prev, [label]: OFFERING_COOLDOWN_MS }));
      const preset = PRESET_OFFERINGS.find((p) => p.label === label);
      toast.success(`🙏 Đã dâng ${preset?.emoji || ''} ${label}`);
      logFetched.current = false;
    } catch {
      toast.error('Không thể dâng lễ vật lúc này');
    } finally {
      setOfferingLoading(null);
    }
  }, [member._id]);

  // ── Nút thắp nhang (có kiểm tra identity) ────────────────────────────────
  const handleBurnIncense = useCallback(async () => {
    if (incenseRemaining > 0 || burningIncense) return;
    if (needsIdentityCheck()) {
      setPendingAction({ type: 'incense' });
      setShowIdentity(true);
      return;
    }
    await doBurnIncense();
  }, [incenseRemaining, burningIncense, doBurnIncense]);

  // ── Nút dâng lễ vật (có kiểm tra identity) ───────────────────────────────
  const handleOffer = useCallback(async (label: string) => {
    const rem = resolveRemaining(
      lsKey(member._id, `offering_${label}`),
      offeringStats.find((s) => s.label === label)?.lastOffered,
      OFFERING_COOLDOWN_MS
    );
    if (rem > 0 || offeringLoading) return;
    if (needsIdentityCheck()) {
      setPendingAction({ type: 'offering', label });
      setShowIdentity(true);
      return;
    }
    await doOffer(label);
  }, [member._id, offeringStats, offeringLoading, doOffer]);

  // ── Identity modal handlers ───────────────────────────────────────────────
  const handleIdentityChoice = useCallback(
    async (choice: 'login' | 'register' | 'anon') => {
      setShowIdentity(false);

      if (choice === 'login') {
        router.push('/login');
        return;
      }
      if (choice === 'register') {
        router.push('/register');
        return;
      }

      // Ẩn danh – lưu vào session để không hỏi lại
      setAnonChosen();

      if (pendingAction?.type === 'incense') {
        await doBurnIncense();
      } else if (pendingAction?.type === 'offering') {
        await doOffer(pendingAction.label);
      }
      setPendingAction(null);
    },
    [pendingAction, doBurnIncense, doOffer, router]
  );

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!member.shrine?.isEnabled) return null;

  const defaultAvatar = member.gender === 'male' ? '/avatars/noManProfile.png' : '/avatars/noWomanProfile.png';
  const avatarSrc = member.avatar
    ? member.avatar.startsWith('http') ? member.avatar : `${baseUrl}/${member.avatar}`
    : defaultAvatar;

  const incenseOnCooldown = incenseRemaining > 0;
  const incensePct = Math.round((incenseRemaining / INCENSE_COOLDOWN_MS) * 100);
  const totalOfferings = offeringStats.reduce((sum, s) => sum + (s.count || 0), 0);

  return (
    <>
      {/* ── Shrine Modal ─────────────────────────────────────────────────── */}
      <Modal show={show} onHide={onHide} centered scrollable>
        <Modal.Header closeButton style={{ background: theme.bg, borderBottom: `2px solid ${theme.border}` }}>
          <Modal.Title style={{ color: theme.border }}>🏮 Bàn Thờ Số</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ background: theme.bg, textAlign: 'center' }}>
          {/* Avatar + tên */}
          <div className="mb-3">
            <img
              src={avatarSrc}
              alt={member.name}
              style={{ width: 100, height: 100, borderRadius: '50%', border: `3px solid ${theme.border}`, objectFit: 'cover' }}
            />
            <h5 className="mt-2 mb-0" style={{ color: theme.border }}>{member.name}</h5>
            {member.deathDate?.solar && (
              <small className="text-muted">{new Date(member.deathDate.solar).getFullYear()}</small>
            )}
          </div>

          {/* Lời ai điếu */}
          {member.memorial?.epitaph && (
            <blockquote
              className="blockquote mb-3"
              style={{ borderLeft: `3px solid ${theme.border}`, paddingLeft: 12, textAlign: 'left' }}
            >
              <p className="fst-italic small mb-0">"{member.memorial.epitaph}"</p>
            </blockquote>
          )}

          {/* ── Nhang ── */}
          <div className="mb-3">
            <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{incenseOnCooldown ? '🕯️' : '🪔'}</div>
            <div className="text-muted small mt-1">
              Đã thắp <strong>{incenseCount}</strong> nén nhang
            </div>
            {incenseOnCooldown && (
              <div className="px-4 mt-2">
                <ProgressBar now={incensePct} variant="warning" style={{ height: 5 }} />
                <small className="text-muted">Nhang đang cháy... còn {formatCountdown(incenseRemaining)}</small>
              </div>
            )}
            <Button
              className="mt-2 px-4"
              onClick={handleBurnIncense}
              disabled={incenseOnCooldown || burningIncense}
              style={{ background: incenseOnCooldown ? '#aaa' : theme.btnBg, border: 'none' }}
            >
              {burningIncense
                ? '🙏 Đang thắp...'
                : incenseOnCooldown
                ? `⏳ ${formatCountdown(incenseRemaining)}`
                : '🙏 Thắp nhang'}
            </Button>
          </div>

          <hr style={{ borderColor: theme.border, opacity: 0.3 }} />

          {/* ── Lễ vật ── */}
          <div className="mb-2">
            <div className="d-flex justify-content-between align-items-center px-1 mb-2">
              <span style={{ color: theme.border, fontWeight: 600 }}>
                🎁 Lễ vật {totalOfferings > 0 && <Badge bg="secondary">{totalOfferings}</Badge>}
              </span>
              <Button
                size="sm"
                onClick={() => setOfferingPanel((v) => !v)}
                style={{ background: theme.btnBg, border: 'none' }}
              >
                {offeringPanel ? 'Thu gọn ▲' : 'Dâng lễ vật ▼'}
              </Button>
            </div>

            {/* Thống kê nhanh */}
            {offeringStats.length > 0 && !offeringPanel && (
              <div className="d-flex justify-content-center flex-wrap gap-1 mb-1">
                {[...offeringStats]
                  .sort((a, b) => (b.count || 0) - (a.count || 0))
                  .slice(0, 5)
                  .map((s) => {
                    const preset = PRESET_OFFERINGS.find((p) => p.label === s.label);
                    return (
                      <span key={s.label} className="badge bg-secondary" style={{ fontSize: '0.85rem' }}>
                        {preset?.emoji} {s.label} ×{s.count}
                      </span>
                    );
                  })}
              </div>
            )}

            {/* Panel chọn lễ vật */}
            {offeringPanel && (
              <div className="border rounded p-2" style={{ background: '#fff8', textAlign: 'left' }}>
                {PRESET_OFFERINGS.map(({ emoji, label }) => {
                  const stat = offeringStats.find((s) => s.label === label);
                  const rem = offeringRemaining[label] || 0;
                  const onCooldown = rem > 0;
                  const featured = featuredLabels.has(label);
                  const loading = offeringLoading === label;

                  return (
                    <div
                      key={label}
                      className="d-flex justify-content-between align-items-center py-2"
                      style={{ borderBottom: '1px solid #eee' }}
                    >
                      <div>
                        <span style={{ fontSize: '1.1rem' }}>{emoji}</span>{' '}
                        <span style={{ fontWeight: featured ? 600 : 400 }}>{label}</span>
                        {stat?.count ? <span className="text-muted small ms-2">×{stat.count}</span> : null}
                        {stat?.lastOffered && (
                          <div style={{ fontSize: '0.7rem', color: '#999' }}>
                            Gần nhất: {new Date(stat.lastOffered).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        disabled={onCooldown || !!loading}
                        onClick={() => handleOffer(label)}
                        style={{
                          background: onCooldown ? '#ccc' : theme.btnBg,
                          border: 'none',
                          minWidth: 72,
                          fontSize: '0.8rem',
                        }}
                      >
                        {loading ? '...' : onCooldown ? formatCountdown(rem) : 'Dâng'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr style={{ borderColor: theme.border, opacity: 0.3 }} />

          {/* ── Lịch sử hoạt động ── */}
          <div>
            <div className="d-flex justify-content-between align-items-center px-1 mb-1">
              <span style={{ color: theme.border, fontWeight: 600 }}>📜 Hoạt động</span>
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => setShowLog((v) => !v)}
              >
                {showLog ? 'Thu gọn ▲' : 'Xem ▼'}
              </Button>
            </div>
            {showLog && (
              <div style={{ textAlign: 'left', maxHeight: 220, overflowY: 'auto' }}>
                {shrineLogs.length === 0 ? (
                  <p className="text-muted small text-center my-2">Chưa có hoạt động nào</p>
                ) : (
                  shrineLogs.map((log) => {
                    const preset =
                      log.action === 'offering'
                        ? PRESET_OFFERINGS.find((p) => p.label === log.offeringLabel)
                        : null;
                    return (
                      <div
                        key={log._id}
                        className="d-flex justify-content-between align-items-center py-1 px-1"
                        style={{ borderBottom: '1px solid #f0e8d8', fontSize: '0.8rem' }}
                      >
                        <span>
                          {log.action === 'incense' ? '🙏 Thắp nhang' : `🙏 Dâng ${preset?.emoji || ''} ${log.offeringLabel}`}
                          {' '}
                          <span className="text-muted">– {log.displayName}</span>
                        </span>
                        <span className="text-muted" style={{ whiteSpace: 'nowrap', marginLeft: 8 }}>
                          {new Date(log.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer style={{ background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
          <Button variant="outline-secondary" onClick={onHide}>Đóng</Button>
        </Modal.Footer>
      </Modal>

      {/* ── Identity Modal ───────────────────────────────────────────────── */}
      <Modal show={showIdentity} onHide={() => setShowIdentity(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1rem' }}>🙏 Bạn muốn tiếp tục với tư cách?</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center pb-2">
          <p className="text-muted small mb-3">
            Hành động của bạn sẽ được ghi lại để tưởng nhớ người đã mất.
          </p>
          <div className="d-grid gap-2">
            <Button
              onClick={() => handleIdentityChoice('login')}
              style={{ background: '#4a6fa5', border: 'none' }}
            >
              🔐 Đăng nhập tài khoản
            </Button>
            <Button
              variant="outline-primary"
              onClick={() => handleIdentityChoice('register')}
            >
              📝 Đăng ký tài khoản mới
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => handleIdentityChoice('anon')}
            >
              👤 Tiếp tục Ẩn danh
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
