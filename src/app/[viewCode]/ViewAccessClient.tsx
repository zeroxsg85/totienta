'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faExpand, faCamera } from '@fortawesome/free-solid-svg-icons';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import API from '@/lib/api';
import FamilyTree from '@/components/FamilyTree';
import MemberCard from '@/components/MemberCard';
import { Member } from '@/types';
import Loading from '@/components/Loading';

interface ViewAccessClientProps {
  viewCode: string;
}

export default function ViewAccessClient({ viewCode }: ViewAccessClientProps): JSX.Element {
  const treeRef = useRef<HTMLDivElement>(null);
  const [familyTree, setFamilyTree] = useState<Member[] | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setLoading] = useState<boolean>(true);
  const [showMemberCard, setShowMemberCard] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [treeKey, setTreeKey] = useState<number>(0);
  const [exporting, setExporting] = useState<boolean>(false);

  const baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://totienta.com';

  // Lấy tất cả members từ cây (flatten)
  const getAllMembers = (tree: Member[]): Member[] => {
    const result: Member[] = [];
    const traverse = (node: Member) => {
      result.push(node);
      const children = node.children as Member[];
      children?.forEach(child => traverse(child));
    };
    tree?.forEach(root => traverse(root));
    return result;
  };

  // Tính toán thống kê
  const calculateStats = () => {
    if (!familyTree || familyTree.length === 0) {
      return { totalGenerations: 0, total: 0, male: 0, female: 0, alive: 0, deceased: 0 };
    }

    const allMembers = getAllMembers(familyTree);
    const total = allMembers.length;
    const male = allMembers.filter(m => m.gender === 'male').length;
    const female = allMembers.filter(m => m.gender === 'female').length;
    const alive = allMembers.filter(m => m.isAlive).length;
    const deceased = allMembers.filter(m => !m.isAlive).length;

    const getDepth = (node: Member, depth: number = 1): number => {
      const children = node.children as Member[];
      if (!children || children.length === 0) return depth;
      return Math.max(...children.map(child => getDepth(child, depth + 1)));
    };

    const totalGenerations = Math.max(...familyTree.map(root => getDepth(root)));

    return { totalGenerations, total, male, female, alive, deceased };
  };

  const stats = calculateStats();

  useEffect(() => {
    const fetchFamilyTreeByViewCode = async (): Promise<void> => {
      if (!viewCode) {
        setError('Không tìm thấy mã xác thực!');
        setLoading(false);
        return;
      }

      try {
        const response = await API.get<Member[]>(`/members/view/${viewCode}`);
        setFamilyTree(response.data);
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

      const canvas = await html2canvas(element, {
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        width: element.scrollWidth,
        height: element.scrollHeight,
      } as any);

      element.style.overflow = originalStyle.overflow;
      element.style.width = originalStyle.width;
      element.style.height = originalStyle.height;

      const link = document.createElement('a');
      link.download = `gia-pha-${viewCode}-${new Date().toISOString().split('T')[0]}.png`;
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

  if (isLoading) {
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
      {familyTree && familyTree.length > 0 && (
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
        {familyTree && familyTree.length > 0 ? (
          <FamilyTree
            key={treeKey}
            ref={treeRef}
            familyTree={familyTree}
            onMemberClick={handleMemberClick}
            isEditable={false}
            searchTerm={searchTerm}
          />
        ) : (
          <div className="text-center mt-5 pt-4">
            <p className="text-muted">Chưa có thành viên nào trong cây gia phả.</p>
          </div>
        )}
      </section>

      <MemberCard
        show={showMemberCard}
        onHide={() => setShowMemberCard(false)}
        member={selectedMember}
        isEditable={false}
        baseUrl={baseUrl}
      />
    </div>
  );
}