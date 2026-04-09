'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faExpand, faCamera, faLink, faLightbulb, faPhoneAlt } from '@fortawesome/free-solid-svg-icons';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import API from '@/lib/api';
import FamilyTree from '@/components/FamilyTree';
import FamilyListView from '@/components/FamilyListView';
import MemberCard from '@/components/MemberCard';
import SuggestionModal from '@/components/SuggestionModal';
import Loading from '@/components/Loading';
import useDeviceType from '@/hooks/useDeviceType';
import { Member } from '@/types';
import Link from 'next/link';

interface ViewAccessClientProps {
  viewCode: string;
}

export default function ViewAccessClient({ viewCode }: ViewAccessClientProps): JSX.Element {
  const searchParams = useSearchParams();
  const treeRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useDeviceType();

  const [familyTree, setFamilyTree] = useState<Member[] | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showMemberCard, setShowMemberCard] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [treeKey, setTreeKey] = useState<number>(0);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState<boolean>(false);
  const [hideFemale, setHideFemale] = useState<boolean>(false);

  const baseUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:4867"
      : "https://app.totienta.com";

  // Tính toán thống kê
  const stats = useMemo(() => {
    if (!allMembers.length) {
      return {
        totalGenerations: 0,
        total: 0,
        male: 0,
        female: 0,
        alive: 0,
        deceased: 0,
      };
    }

    const total = allMembers.length;
    const male = allMembers.filter((m) => m.gender === 'male').length;
    const female = allMembers.filter((m) => m.gender === 'female').length;
    const alive = allMembers.filter((m) => m.isAlive === true).length;
    const deceased = allMembers.filter((m) => m.isAlive === false).length;

    const getDepth = (node: Member, depth: number = 1): number => {
      if (!node.children || node.children.length === 0) return depth;
      return Math.max(
        ...node.children
          .filter((c): c is Member => typeof c === 'object')
          .map((c) => getDepth(c, depth + 1))
      );
    };

    const totalGenerations =
      familyTree && familyTree.length > 0
        ? Math.max(...familyTree.map((root) => getDepth(root)))
        : 0;

    return { totalGenerations, total, male, female, alive, deceased };
  }, [allMembers, familyTree]);

  // Lấy search từ URL khi load
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchTerm(searchFromUrl);
    }
  }, [searchParams]);

  // Cập nhật URL khi search thay đổi
  const updateSearchUrl = (term: string) => {
    setSearchTerm(term);
    const url = new URL(window.location.href);
    if (term) {
      url.searchParams.set('search', term);
    } else {
      url.searchParams.delete('search');
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Copy link tìm kiếm
  const copySearchLink = async () => {
    if (!searchTerm) {
      toast.warning('Vui lòng nhập từ khóa tìm kiếm trước');
      return;
    }
    const searchUrl = `${baseUrl}/${viewCode}?search=${encodeURIComponent(searchTerm)}`;
    try {
      await navigator.clipboard.writeText(searchUrl);
      toast.success('Đã sao chép link tìm kiếm!');
    } catch {
      toast.error('Không thể sao chép');
    }
  };

  // Fetch data
  useEffect(() => {
    const fetchFamilyTreeByViewCode = async (): Promise<void> => {
      if (!viewCode) {
        setError('Không tìm thấy mã xác thực!');
        setLoading(false);
        return;
      }

      try {
        const response = await API.get<Member[]>(`/members/view/${viewCode}`);
        const treeData = response.data;
        setFamilyTree(treeData);

        // Flatten tree để lấy tất cả members
        const flattenTree = (members: Member[]): Member[] => {
          let result: Member[] = [];
          for (const m of members) {
            result.push(m);
            const children = m.children as Member[];
            if (children && children.length > 0) {
              result = result.concat(flattenTree(children));
            }
          }
          return result;
        };

        setAllMembers(flattenTree(treeData));
        setError('');
      } catch {
        setError('Mã xác thực không hợp lệ');
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyTreeByViewCode();
  }, [viewCode]);

  const handleMemberClick = (member: Member): void => {
    setSelectedMember(member);
    setShowMemberCard(true);
  };

  const handleExpandAll = (): void => {
    setTreeKey((prev) => prev + 1);
  };

  const handleExportImage = async (): Promise<void> => {
    if (!treeRef.current) {
      toast.error('Không tìm thấy cây gia phả!');
      return;
    }

    setExporting(true);
    try {
      const element = treeRef.current;
      const originalStyle = {
        overflow: element.style.overflow,
        width: element.style.width,
        height: element.style.height,
      };

      element.style.overflow = 'visible';
      element.style.width = 'auto';
      element.style.height = 'auto';

      const treeCanvas = await html2canvas(element, {
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        width: element.scrollWidth,
        height: element.scrollHeight,
        backgroundColor: '#ffffff',
      } as any);

      element.style.overflow = originalStyle.overflow;
      element.style.width = originalStyle.width;
      element.style.height = originalStyle.height;

      const padding = 40;
      const borderWidth = 3;
      const watermarkHeight = 30;

      const finalWidth = treeCanvas.width + (padding * 2) + (borderWidth * 2);
      const finalHeight = treeCanvas.height + (padding * 2) + (borderWidth * 2) + watermarkHeight;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = finalWidth;
      finalCanvas.height = finalHeight;
      const ctx = finalCanvas.getContext('2d')!;

      // Background trắng
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalWidth, finalHeight);

      // Border ngoài
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(borderWidth / 2, borderWidth / 2, finalWidth - borderWidth, finalHeight - borderWidth);

      // Border trong
      ctx.strokeStyle = '#D2691E';
      ctx.lineWidth = 1;
      ctx.strokeRect(borderWidth + 5, borderWidth + 5, finalWidth - (borderWidth * 2) - 10, finalHeight - (borderWidth * 2) - 10);

      // Vẽ cây gia phả
      ctx.drawImage(treeCanvas, padding + borderWidth, padding + borderWidth);

      // Vẽ logo + text
      const logo = new Image();
      logo.src = '/logo.png';

      await new Promise<void>((resolve) => {
        logo.onload = () => {
          const logoHeight = 68;
          const logoWidth = (logo.width / logo.height) * logoHeight;

          ctx.drawImage(
            logo,
            padding + borderWidth,
            finalHeight - borderWidth - logoHeight - 8,
            logoWidth,
            logoHeight
          );

          ctx.fillStyle = '#8B4513';
          ctx.font = 'bold 32px Arial';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.fillText(
            'ToTienTa.com',
            padding + borderWidth + logoWidth + 8,
            finalHeight - borderWidth - (logoHeight / 2) - 8
          );
          resolve();
        };
        logo.onerror = () => {
          ctx.fillStyle = '#8B4513';
          ctx.font = 'bold 16px Arial';
          ctx.textBaseline = 'bottom';
          ctx.fillText('ToTienTa.com', padding + borderWidth, finalHeight - borderWidth - 10);
          resolve();
        };
      });

      // Ngày xuất góc dưới phải
      ctx.fillStyle = '#999999';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      const today = new Date().toLocaleDateString('vi-VN');
      ctx.fillText(`Ngày: ${today}`, finalWidth - padding - borderWidth, finalHeight - borderWidth - 10);

      // Download
      const link = document.createElement('a');
      link.download = `ToTienTa.com-Gia-pha-${new Date().toISOString().split('T')[0]}.png`;
      link.href = finalCanvas.toDataURL('image/png');
      link.click();

      toast.success('Đã xuất ảnh thành công!');
    } catch (error) {
      console.error('Lỗi xuất ảnh:', error);
      toast.error('Lỗi khi xuất ảnh!');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <Loading text="Đang tải cây gia phả..." />;
  }

  if (error) {
    return (
      <div className="container mt-5 pt-4 text-center">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0" onContextMenu={(e) => e.preventDefault()}>
      {/* ===== MOBILE LAYOUT ===== */}
      {isMobile && (
        <>
          {/* Hidden FamilyTree for export */}
          {familyTree && familyTree.length > 0 && (
            <div
              className="list-tree"
              style={{ position: 'absolute', left: '-9999px', top: 0 }}
            >
              <FamilyTree
                ref={treeRef}
                familyTree={familyTree}
                onMemberClick={() => { }}
                isEditable={false}
                searchTerm={searchTerm}
                hideFemale={hideFemale}
              />
            </div>
          )}

          {/* Mobile Toolbar */}
          <div className="mobile-toolbar">
            <Button
              variant="outline-success"
              size="sm"
              onClick={handleExportImage}
              disabled={exporting}
              title="Xuất ảnh"
            >
              <FontAwesomeIcon icon={faCamera} />
            </Button>

            <Button
              variant={hideFemale ? 'warning' : 'outline-warning'}
              size="sm"
              onClick={() => setHideFemale(!hideFemale)}
              title={hideFemale ? 'Hiện nữ' : 'Ẩn nữ'}
            >
              👩
            </Button>

            <Button
              variant="warning"
              size="sm"
              onClick={() => setShowSuggestionModal(true)}
              className="btn-suggest-pulse"
            >
              💡
            </Button>
          </div>

          {/* Mobile Stats */}
          {allMembers.length > 0 && (
            <div className="mobile-stats">
              <div className="stat-item">
                <span className="stat-value">{stats.totalGenerations}</span>
                <span className="stat-label">đời</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">người</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.male}</span>
                <span className="stat-label">nam</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.female}</span>
                <span className="stat-label">nữ</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.alive}</span>
                <span className="stat-label">sống</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.deceased}</span>
                <span className="stat-label">mất</span>
              </div>
            </div>
          )}

          {/* Mobile Search */}
          <div className="mobile-search">
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Tìm thành viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                  ✕
                </Button>
              )}
            </InputGroup>
          </div>

          {/* Mobile Content - ListView only */}
          <div className="mobile-content-area">
            {familyTree && familyTree.length > 0 ? (
              <FamilyListView
                familyTree={familyTree}
                onMemberClick={handleMemberClick}
                searchTerm={searchTerm}
                hideFemale={hideFemale}
              />
            ) : (
              <div className="text-center mt-3">
                <p className="text-muted">Chưa có thành viên nào.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== DESKTOP LAYOUT ===== */}
      {!isMobile && (
        <>
          {/* Desktop Toolbar */}
          <div className="tree-toolbar">
            <InputGroup className="search-box">
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Tìm thành viên..."
                value={searchTerm}
                onChange={(e) => updateSearchUrl(e.target.value)}
              />
              {searchTerm && (
                <>
                  <Button variant="outline-secondary" onClick={copySearchLink} title="Copy link">
                    <FontAwesomeIcon icon={faLink} />
                  </Button>
                  <Button variant="outline-secondary" onClick={() => updateSearchUrl('')}>
                    ✕
                  </Button>
                </>
              )}
            </InputGroup>

            <div className="toolbar-buttons">
              <Button variant="outline-primary" size="sm" onClick={handleExpandAll}>
                <FontAwesomeIcon icon={faExpand} /> Mở rộng
              </Button>

              <Button
                variant="outline-success"
                size="sm"
                onClick={handleExportImage}
                disabled={exporting}
              >
                <FontAwesomeIcon icon={faCamera} /> {exporting ? 'Đang xuất...' : 'Xuất ảnh'}
              </Button>

              <Button
                variant={hideFemale ? 'warning' : 'outline-warning'}
                size="sm"
                onClick={() => setHideFemale(!hideFemale)}
              >
                👩 {hideFemale ? 'Hiện nữ' : 'Ẩn nữ'}
              </Button>

              <Button
                variant="warning"
                size="sm"
                onClick={() => setShowSuggestionModal(true)}
                className="btn-suggest-pulse"
              >
                <FontAwesomeIcon icon={faLightbulb} /> Đề xuất
              </Button>
            </div>
          </div>

          {/* Desktop Stats */}
          {allMembers.length > 0 && (
            <div className="tree-stats">
              <span>📊 <strong>{stats.totalGenerations}</strong> đời</span>
              <span>👥 <strong>{stats.total}</strong> thành viên</span>
              <span>👨 <strong>{stats.male}</strong> nam</span>
              <span>👩 <strong>{stats.female}</strong> nữ</span>
              <span>💚 <strong>{stats.alive}</strong> còn sống</span>
              <span>🕯️ <strong>{stats.deceased}</strong> đã mất</span>
            </div>
          )}

          {/* Desktop Content - TreeView only */}
          <section className="list-tree">
            {familyTree && familyTree.length > 0 ? (
              <FamilyTree
                key={treeKey}
                ref={treeRef}
                familyTree={familyTree}
                onMemberClick={handleMemberClick}
                isEditable={false}
                searchTerm={searchTerm}
                hideFemale={hideFemale}
              />
            ) : (
              <div className="text-center mt-5 pt-4">
                <p className="text-muted">Chưa có thành viên nào trong cây gia phả.</p>
              </div>
            )}
          </section>
        </>
      )}

      <footer className="share-footer">
        <div className="share-section d-flex justify-content-between">
          {isMobile ?
            <>
              <div id="copyright">
                <small>© {new Date().getFullYear()} ToTienTa.com All rights reserved.</small>
              </div>
              <div id="support">
                <Link href="tel:+84327691726" className="text-decoration-none">
                  <FontAwesomeIcon icon={faPhoneAlt} />
                </Link>
              </div>
            </> :
            <>
              <div id="copyright">
                © {new Date().getFullYear()} <b>ToTienTa.com</b>. All rights reserved.
              </div>
              <div id="support">
                <Link href="tel:+84327691726" className="text-decoration-none">
                  <FontAwesomeIcon icon={faPhoneAlt} /> Hỗ trợ: 0327.691.726
                </Link>
              </div>
            </>}
        </div>
      </footer>

      {/* Modals */}
      <MemberCard
        show={showMemberCard}
        onHide={() => setShowMemberCard(false)}
        member={selectedMember}
        isEditable={false}
        baseUrl={baseUrl}
      />

      <SuggestionModal
        show={showSuggestionModal}
        onHide={() => setShowSuggestionModal(false)}
        viewCode={viewCode}
        allMembers={allMembers}
      />
    </div>
  );
}