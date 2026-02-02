'use client';

import { useState, useEffect, useRef } from 'react';
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

  const [familyTree, setFamilyTree] = useState<Member[] | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showMemberCard, setShowMemberCard] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [treeKey, setTreeKey] = useState<number>(0);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState<boolean>(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);

  const baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:4867'
      : 'https://totienta.com';

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
        setFamilyTree(response.data);

        // Flatten tree để lấy tất cả members
        const flattenTree = (members: Member[]): Member[] => {
          let result: Member[] = [];
          members.forEach((m) => {
            result.push(m);
            if (m.children && m.children.length > 0) {
              result = result.concat(flattenTree(m.children as Member[]));
            }
          });
          return result;
        };
        setAllMembers(flattenTree(response.data));

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
          variant="outline-primary"
          size="sm"
          onClick={() => setShowSuggestionModal(true)}
          title="Đề xuất thay đổi"
          className="ms-2"
        >
          <FontAwesomeIcon icon={faLightbulb} /> Đề xuất
        </Button>
      </div>

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
      <SuggestionModal
        show={showSuggestionModal}
        onHide={() => setShowSuggestionModal(false)}
        viewCode={viewCode}
        allMembers={allMembers}
      />
    </div>
  );
}