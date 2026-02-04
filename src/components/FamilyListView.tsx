'use client';

import { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faHome, faMale, faFemale, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { Member } from '@/types';

interface FamilyListViewProps {
    familyTree: Member[];
    onMemberClick?: (member: Member) => void;
    onAddMember?: (parentId: string) => void;
    searchTerm?: string;
    hideFemale?: boolean;
    isEditable?: boolean;
}

export default function FamilyListView({
    familyTree,
    onMemberClick,
    onAddMember,
    isEditable = false,
    searchTerm = '',
    hideFemale = false,
}: FamilyListViewProps): JSX.Element {
    const [path, setPath] = useState<{ id: string; name: string; gender?: 'male' | 'female' }[]>([]);
    const [searchResults, setSearchResults] = useState<Member[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);

    // Helper: Lấy tên hiển thị (tên gia phả + tên ở nhà)
    const getDisplayName = (name: string): string => {
        if (!name?.includes('-')) return name;
        const parts = name.split('-');
        return parts[2] ? `${parts[0]}-${parts[2]}` : parts[0];
    };

    // Thêm interface
    interface MemberWithParent extends Member {
        parentGender?: 'male' | 'female';
    }
    // Flatten toàn bộ cây
    const flattenTree = (members: Member[], parentGender?: 'male' | 'female'): MemberWithParent[] => {
        let result: MemberWithParent[] = [];
        for (const m of members) {
            result.push({ ...m, parentGender });
            const children = m.children as Member[];
            if (children && children.length > 0) {
                result = result.concat(flattenTree(children, m.gender));
            }
        }
        return result;
    };

    // Search toàn bộ cây - CHỈ TÌM THEO NAME
    useEffect(() => {
        if (!searchTerm) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const term = searchTerm.toLowerCase();
        const allMembers = flattenTree(familyTree);
        let results = allMembers.filter((m) =>
            m.name?.toLowerCase().includes(term)
        );

        if (hideFemale) {
            results = results.filter((m) => m.gender !== 'female');
        }

        setSearchResults(results);
    }, [searchTerm, familyTree, hideFemale]);


    // Lấy danh sách members hiện tại dựa vào path
    const getCurrentMembers = (): Member[] => {
        if (path.length === 0) {
            return familyTree;
        }

        const findMember = (members: Member[], id: string): Member | null => {
            for (const m of members) {
                if (m._id === id) return m;
                if (m.children && m.children.length > 0) {
                    const found = findMember(m.children as Member[], id);
                    if (found) return found;
                }
            }
            return null;
        };

        const lastId = path[path.length - 1].id;
        const member = findMember(familyTree, lastId);
        return (member?.children as Member[]) || [];
    };

    // Lọc theo hideFemale và sắp xếp
    const filterMembers = (members: Member[]): Member[] => {
        let filtered = members;

        if (hideFemale) {
            filtered = filtered.filter((m) => m.gender !== 'female');
        }

        return filtered.sort((a, b) => {
            if (!a.birthday || !b.birthday) return 0;
            return new Date(a.birthday).getTime() - new Date(b.birthday).getTime();
        });
    };

    const currentMembers = filterMembers(getCurrentMembers());

    // Navigate vào con của member
    const navigateToChildren = (member: Member, e: React.MouseEvent) => {
        e.stopPropagation();
        setPath([...path, { id: member._id, name: member.name, gender: member.gender }]);
        // Tự động tắt search mode khi navigate
        if (isSearching) {
            setIsSearching(false);
            setSearchResults([]);
        }
    };

    // Khi render, check parent gender từ path
    const getParentGender = (): 'male' | 'female' | undefined => {
        if (path.length === 0) return undefined; // root level
        return path[path.length - 1].gender;
    };

    // Navigate về level nào đó trong breadcrumb
    const navigateTo = (index: number) => {
        if (index < 0) {
            setPath([]);
        } else {
            setPath(path.slice(0, index + 1));
        }
    };

    // Đếm số con (có lọc nữ nếu cần)
    const countChildren = (member: Member): number => {
        const children = member.children as Member[];
        if (!children || children.length === 0) return 0;
        if (hideFemale) {
            return children.filter((c) => c.gender !== 'female').length;
        }
        return children.length;
    };

    // Kiểm tra có thể thêm con cho member này không
    const canAddChild = (member: MemberWithParent): boolean => {
        // Nếu parent là nữ → không được thêm con (đã khác họ)
        if (member.parentGender === 'female') return false;
        // Người độc thân đã mất → không thêm con
        if (member.maritalStatus === 'single' && !member.isAlive) return false;
        return true;
    };

    // Render một member card
    const renderMemberCard = (member: MemberWithParent) => {
        const childCount = countChildren(member);
        const hasChildren = childCount > 0;
        const parentGender = member.parentGender ?? getParentGender();
        const showAddButton = isEditable && canAddChild({ ...member, parentGender });

        return (
            <Card key={member._id} className="member-card-list">
                <Card.Body className="d-flex align-items-center">
                    {/* Icon giới tính */}
                    <div className={`member-icon ${member.gender} ${!member.isAlive ? "text-muted" : ""}`}>
                        <FontAwesomeIcon icon={member.gender === 'male' ? faMale : faFemale} />
                    </div>

                    {/* Thông tin member */}
                    <div
                        className="member-info flex-grow-1"
                        onClick={() => onMemberClick?.(member)}
                    >
                        <div className="member-name-list">
                            {/* Nút thêm con */}
                            {showAddButton && (
                                <div
                                    className="member-add-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddMember?.(member._id);
                                    }}
                                    title="Thêm con"
                                >
                                    <FontAwesomeIcon icon={faPlusCircle} />
                                </div>
                            )}
                            {getDisplayName(member.name)}
                        </div>
                        <div className="member-meta">
                            {member.birthday && (
                                <small>📅 {new Date(member.birthday).getFullYear()}</small>
                            )}
                            {member.phoneNumber && (
                                <small className="ms-2">📞 {member.phoneNumber}</small>
                            )}
                        </div>
                    </div>

                    {/* Nút xem con - LUÔN HIỂN THỊ nếu có con */}
                    {hasChildren && (
                        <div
                            className="member-children-btn"
                            onClick={(e) => navigateToChildren(member, e)}
                            title={`Xem ${childCount} con`}
                        >
                            <span className="children-count">{childCount}</span>
                            <FontAwesomeIcon icon={faChevronRight} />
                        </div>
                    )}
                </Card.Body>
            </Card>
        );
    };

    return (
        <div className="family-list-view">
            {/* Breadcrumb */}
            {!isSearching && (
                <div className="list-breadcrumb">
                    <span
                        className={`breadcrumb-item ${path.length === 0 ? 'active' : ''}`}
                        onClick={() => navigateTo(-1)}
                    >
                        <FontAwesomeIcon icon={faHome} /> Gốc
                    </span>
                    {path.map((item, index) => (
                        <span key={item.id}>
                            <FontAwesomeIcon icon={faChevronRight} className="breadcrumb-separator" />
                            <span
                                className={`breadcrumb-item ${index === path.length - 1 ? 'active' : ''}`}
                                onClick={() => navigateTo(index)}
                            >
                                {getDisplayName(item.name)}
                            </span>
                        </span>
                    ))}
                </div>
            )}

            {/* Thông báo tìm kiếm */}
            {isSearching && (
                <div className="search-info">
                    <span>🔍 Kết quả: <strong>{searchResults.length}</strong> người</span>
                    <small className="text-muted ms-2">
                        (Bấm số con để xem chi tiết dòng họ)
                    </small>
                </div>
            )}

            {/* Danh sách */}
            <div className="list-members">
                {isSearching ? (
                    searchResults.length > 0 ? (
                        searchResults.map((member) => renderMemberCard(member))
                    ) : (
                        <div className="text-center text-muted py-4">
                            Không tìm thấy "{searchTerm}"
                        </div>
                    )
                ) : (
                    currentMembers.length > 0 ? (
                        currentMembers.map((member) => renderMemberCard(member))
                    ) : (
                        <div className="text-center text-muted py-4">
                            Không có thành viên
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
