'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FamilyListView from '@/components/FamilyListView';
import useDeviceType from '@/hooks/useDeviceType';
import {
  faCloudUploadAlt,
  faSyncAlt,
  faCopy,
  faSearch,
  faExpand,
  faCamera,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/lib/api';
import FamilyTree from '@/components/FamilyTree';
import MemberCard from '@/components/MemberCard';
import AddMemberModal from '@/components/AddMemberModal';
import EditMemberModal from '@/components/EditMemberModal';
import { Member, MemberFormData, ViewCodeResponse } from '@/types';
import Loading from '@/components/Loading';

export default function MembersPage(): JSX.Element | null {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const treeRef = useRef<HTMLDivElement>(null);

  const [familyTree, setFamilyTree] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [viewCode, setViewCode] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [treeKey, setTreeKey] = useState<number>(0);
  const [exporting, setExporting] = useState<boolean>(false);
  const [hideFemale, setHideFemale] = useState<boolean>(false);
  const { isMobile } = useDeviceType();

  const [showMemberCard, setShowMemberCard] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [defaultChildId, setDefaultChildId] = useState<string | null>(null);



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
    const male = allMembers.filter(m => m.gender === 'male').length;
    const female = allMembers.filter(m => m.gender === 'female').length;
    const alive = allMembers.filter(m => m.isAlive === true).length;
    const deceased = allMembers.filter(m => m.isAlive === false).length;

    const getDepth = (node: Member, depth: number = 1): number => {
      if (!node.children || node.children.length === 0) return depth;

      return Math.max(
        ...node.children
          .filter((c): c is Member => typeof c === 'object')
          .map(c => getDepth(c, depth + 1))
      );
    };

    const totalGenerations =
      familyTree.length > 0
        ? Math.max(...familyTree.map(root => getDepth(root)))
        : 0;

    return { totalGenerations, total, male, female, alive, deceased };
  }, [allMembers, familyTree]);

  const fullUrl = `${baseUrl}/${viewCode}`;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchMembers = async (): Promise<void> => {
    try {
      const [treeResponse, allResponse] = await Promise.all([
        API.get<Member[]>('/members/family-tree'),
        API.get<Member[]>('/members/'),
      ]);
      setFamilyTree(treeResponse.data);
      setAllMembers(allResponse.data);
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchViewCode = async (): Promise<void> => {
    try {
      const response = await API.get<ViewCodeResponse>('/members/view-code');
      setViewCode(response.data.viewCode);
    } catch {
      // No view code yet
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMembers();
      fetchViewCode();
    }
  }, [isAuthenticated]);

  const generateViewCode = async (): Promise<void> => {
    try {
      const response = await API.post<ViewCodeResponse>('/members/generate-view-code');
      setViewCode(response.data.viewCode);
      toast.success('Đã tạo mã xác thực!');
    } catch {
      toast.error('Lỗi khi tạo mã xác thực');
    }
  };

  const updateViewCode = async (): Promise<void> => {
    try {
      const response = await API.post<ViewCodeResponse>('/members/update-view-code');
      setViewCode(response.data.viewCode);
      toast.success('Đã cập nhật mã!');
      fetchMembers();
    } catch {
      toast.error('Lỗi khi cập nhật mã');
    }
  };

  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Đã sao chép link!');
    } catch {
      toast.error('Không thể sao chép');
    }
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
          ctx.font = 'bold 16px Arial';
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
          ctx.font = 'bold 32px Arial';
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

  const handleAddMember = async (memberData: MemberFormData): Promise<void> => {
    try {
      await API.post('/members', memberData);
      toast.success('Đã thêm thành viên!');
      fetchMembers();
    } catch {
      toast.error('Lỗi khi thêm thành viên');
    }
  };

  const handleUpdateMember = async (memberData: Member): Promise<void> => {
    try {
      await API.put(`/members/${memberData._id}`, memberData);
      toast.success('Đã cập nhật thành viên!');
      fetchMembers();
    } catch {
      toast.error('Lỗi khi cập nhật thành viên');
    }
  };

  const handleDeleteMember = async (id: string): Promise<void> => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này?')) return;

    try {
      await API.delete(`/members/${id}`);
      toast.success('Đã xóa thành viên!');
      setShowMemberCard(false);
      fetchMembers();
    } catch {
      toast.error('Lỗi khi xóa thành viên');
    }
  };

  const handleMemberClick = (member: Member): void => {
    setSelectedMember(member);
    setShowMemberCard(true);
  };

  const handleAddClick = (parentId: string): void => {
    setSelectedParentId(parentId);
    setShowAddModal(true);
  };

  const handleAddParent = (childId: string): void => {
    setSelectedParentId(null);      // 👈 người mới là root tạm
    setDefaultChildId(childId);     // 👈 CON MẶC ĐỊNH
    setShowAddModal(true);
  };


  const handleAddChild = (parentId: string): void => {
    setSelectedParentId(parentId);
    setDefaultChildId(null); // 👈 KHÔNG phải thêm cha/mẹ
    setShowAddModal(true);
  };

  const isEmptyTree = allMembers.length === 0;

  const handleEditClick = (member: Member): void => {
    setShowMemberCard(false);
    setEditMember(member);
    setShowEditModal(true);
  };

  if (isLoading || loading) {
    return <Loading text="Đang tải cây gia phả..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className="container-fluid p-0"
      onContextMenu={(e) => e.preventDefault()}
    >
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
                onAddMember={handleAddClick}
                isEditable={true}
                searchTerm={searchTerm}
                hideFemale={hideFemale}
              />
            ) : (
              <div className="text-center mt-3">
                <p className="text-muted">Chưa có thành viên nào.</p>
                <Button
                  onClick={() => {
                    if (isEmptyTree) {
                      setSelectedParentId(null);
                      setSelectedChildren([]);
                      setShowAddModal(true);
                    }
                  }}
                >
                  Thêm thành viên
                </Button>

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
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                  ✕
                </Button>
              )}
            </InputGroup>

            <div className="toolbar-buttons">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleExpandAll}
                title="Mở rộng tất cả"
              >
                <FontAwesomeIcon icon={faExpand} /> Mở rộng
              </Button>

              <Button
                variant="outline-success"
                size="sm"
                onClick={handleExportImage}
                disabled={exporting}
                title="Xuất ảnh"
              >
                <FontAwesomeIcon icon={faCamera} /> {exporting ? 'Đang xuất...' : 'Xuất ảnh'}
              </Button>

              <Button
                variant={hideFemale ? 'warning' : 'outline-warning'}
                size="sm"
                onClick={() => setHideFemale(!hideFemale)}
                title={hideFemale ? 'Hiện nữ' : 'Ẩn nữ'}
              >
                👩 {hideFemale ? 'Hiện nữ' : 'Ẩn nữ'}
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
                onAddChild={handleAddChild}
                onAddParent={handleAddParent}
                isEditable={true}
                searchTerm={searchTerm}
                hideFemale={hideFemale}
              />
            ) : (
              <div className="text-center mt-5 pt-4">
                <p className="text-muted">Chưa có thành viên nào trong cây gia phả.</p>
                <Button
                  onClick={() => {
                    if (isEmptyTree) {
                      setSelectedParentId(null);
                      setSelectedChildren([]);
                      setShowAddModal(true);
                    }
                  }}
                >
                  Thêm thành viên
                </Button>

              </div>
            )}
          </section>
        </>
      )}

      {/* Footer - Share Section (chỉ hiện khi đăng nhập) */}
      {isAuthenticated && (
        <footer className="share-footer">
          <div className="share-section d-flex justify-content-between">
            {viewCode ?
              <Button variant='outline-secondary' disabled>
                <strong>{viewCode}</strong>
              </Button>
              : ""}
            {!viewCode ? (
              <Button variant="primary" size="sm" onClick={generateViewCode}>
                <FontAwesomeIcon icon={faCloudUploadAlt} /> Tạo URL chia sẻ
              </Button>
            ) : (
              <>
                <Button variant="outline-dark" size="sm" onClick={copyToClipboard} title="Sao chép">
                  <FontAwesomeIcon icon={faCopy} /> CopyURL
                </Button>
                <Button variant="outline-primary" size="sm" onClick={updateViewCode} title="Cập nhật mã">
                  <FontAwesomeIcon icon={faSyncAlt} /> Cập nhật mã
                </Button>
              </>
            )}
          </div>
        </footer>
      )}

      {/* Modals - giữ nguyên */}
      <MemberCard
        show={showMemberCard}
        onHide={() => setShowMemberCard(false)}
        member={selectedMember}
        onDelete={handleDeleteMember}
        onEdit={handleEditClick}
        isEditable={true}
        baseUrl={baseUrl}
      />

      <AddMemberModal
        show={showAddModal}
        onHide={() => {
          setShowAddModal(false);
          setSelectedParentId(null);
          setDefaultChildId(null); // 👈 THÊM
        }}
        onSubmit={handleAddMember}
        allMembers={allMembers}
        parentId={selectedParentId}
        defaultChildId={defaultChildId} // 👈 THÊM
      />


      <EditMemberModal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setEditMember(null);
        }}
        member={editMember}
        onSubmit={handleUpdateMember}
        allMembers={allMembers}
      />
    </div>
  );
}