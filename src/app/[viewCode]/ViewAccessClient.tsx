'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faExpand, faCamera, faLink, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import SuggestionModal from '@/components/SuggestionModal';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import API from '@/lib/api';
import FamilyTree from '@/components/FamilyTree';
import MemberCard from '@/components/MemberCard';
import Loading from '@/components/Loading';
import { Member } from '@/types';

interface ViewAccessClientProps {
  viewCode: string;
}

export default function ViewAccessClient({ viewCode }: ViewAccessClientProps): JSX.Element {
  const searchParams = useSearchParams();
  const treeRef = useRef<HTMLDivElement>(null);

  const [familyTree, setFamilyTree] = useState<Member[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showMemberCard, setShowMemberCard] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [treeKey, setTreeKey] = useState<number>(0);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState<boolean>(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [hideFemale, setHideFemale] = useState<boolean>(false);

  const baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:4867'
      : 'https://totienta.com';

  // Tính toán thống kê (thêm phần này)
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

    // Cập nhật URL không reload trang
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

        const flattened = flattenTree(treeData);
        console.log('Tree data:', treeData);
        console.log('Flattened members count:', flattened.length);
        setAllMembers(flattened);

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
            onChange={(e) => updateSearchUrl(e.target.value)}
          />
          {searchTerm && (
            <>
              <Button
                variant="outline-secondary"
                onClick={copySearchLink}
                title="Sao chép link tìm kiếm"
              >
                <FontAwesomeIcon icon={faLink} />
              </Button>
              <Button variant="outline-secondary" onClick={() => updateSearchUrl('')}>
                ✕
              </Button>
            </>
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
        <Button
          variant={hideFemale ? "warning" : "outline-warning"}
          size="sm"
          onClick={() => setHideFemale(!hideFemale)}
          title={hideFemale ? "Hiện nữ" : "Ẩn nữ"}
          className="ms-2"
        >
          👩 {hideFemale ? 'Hiện nữ' : 'Ẩn nữ'}
        </Button>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => setShowSuggestionModal(true)}
          title="Đề xuất thay đổi"
          className="ms-2 btn-suggest-pulse"
        >
          <FontAwesomeIcon icon={faLightbulb} /> Đề xuất
        </Button>
      </div>

      {/* Thống kê - Đã sửa CSS để không bị Toolbar che */}
      {allMembers.length > 0 && (
        <div
          className="tree-stats"
        >
          <span className="me-3">📊 <strong>{stats.totalGenerations}</strong> đời</span>
          <span className="me-3">👥 <strong>{stats.total}</strong> thành viên</span>
          <span className="me-3">👨 <strong>{stats.male}</strong> nam</span>
          <span className="me-3">👩 <strong>{stats.female}</strong> nữ</span>
          <span className="me-3">💚 <strong>{stats.alive}</strong> còn sống</span>
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
            hideFemale={hideFemale}
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
      <SuggestionModal
        show={showSuggestionModal}
        onHide={() => setShowSuggestionModal(false)}
        viewCode={viewCode}
        allMembers={allMembers}
      />
    </div>
  );
}