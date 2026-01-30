'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlusCircle,
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

export default function MembersPage(): JSX.Element | null {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const treeRef = useRef<HTMLUListElement>(null);

  const [familyTree, setFamilyTree] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [viewCode, setViewCode] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [treeKey, setTreeKey] = useState<number>(0);
  const [exporting, setExporting] = useState<boolean>(false);

  const [showMemberCard, setShowMemberCard] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editMember, setEditMember] = useState<Member | null>(null);

  const baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://totienta.com';

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

  // Xuất ảnh cây gia phả
  const handleExportImage = async (): Promise<void> => {
    if (!treeRef.current) {
      toast.error('Không tìm thấy cây gia phả!');
      return;
    }

    setExporting(true);
    try {
      const canvas = await html2canvas(treeRef.current);
      const link = document.createElement('a');
      link.download = `gia-pha-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
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

  const handleEditClick = (member: Member): void => {
    setShowMemberCard(false);
    setEditMember(member);
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="container mt-5 pt-4 text-center">
        <p>Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className="container fluid m-1 mt-5"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Toolbar */}
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

        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleExpandAll}
          title="Mở rộng tất cả"
          className="ms-2"
        >
          <FontAwesomeIcon icon={faExpand} /> Mở rộng
        </Button>

        <Button
          variant="outline-success"
          size="sm"
          onClick={handleExportImage}
          disabled={exporting}
          title="Xuất ảnh"
          className="ms-2"
        >
          <FontAwesomeIcon icon={faCamera} /> {exporting ? 'Đang xuất...' : 'Xuất ảnh'}
        </Button>
      </div>

      {/* Thống kê */}
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

      <section className="list-tree">
        {familyTree.length > 0 ? (
          <FamilyTree
            key={treeKey}
            ref={treeRef}
            familyTree={familyTree}
            onMemberClick={handleMemberClick}
            onAddMember={handleAddClick}
            isEditable={true}
            searchTerm={searchTerm}
          />
        ) : (
          <div className="text-center mt-5 pt-4">
            <p className="text-muted">Chưa có thành viên nào trong cây gia phả.</p>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <FontAwesomeIcon icon={faPlusCircle} /> Thêm Thành Viên
            </Button>
          </div>
        )}

        {/* View Code Section */}
        <div className="viewCode">
          {viewCode ? (
            <>
              <span onClick={updateViewCode} style={{ cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faCloudUploadAlt} className="text-primary" /> Cập
                nhật mã.
              </span>{' '}
              <span onClick={generateViewCode} style={{ cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faSyncAlt} className="me-1 text-success" />
                Đổi mã:
              </span>{' '}
              <strong>{viewCode}</strong>
              <small
                style={{ cursor: 'pointer' }}
                onClick={copyToClipboard}>
                <FontAwesomeIcon
                  icon={faCopy}
                  className="ms-2 text-secondary"
                  title="Sao chép URL"
                /> Copy URL
              </small>
            </>
          ) : (
            <span>
              <FontAwesomeIcon
                icon={faPlusCircle}
                onClick={generateViewCode}
                className="me-1 text-success"
                style={{ cursor: 'pointer' }}
              />
              Tạo mã
            </span>
          )}
        </div>
      </section>

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
        }}
        onSubmit={handleAddMember}
        allMembers={allMembers}
        parentId={selectedParentId}
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