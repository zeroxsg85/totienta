'use client';

import { useState, forwardRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Member } from '@/types';

const levelColors: string[] = ['blue', 'red', 'green', 'navy', 'darkred'];

interface FamilyTreeProps {
  familyTree: Member[];
  onMemberClick?: (member: Member) => void;
  onAddMember?: (parentId: string) => void;
  isEditable?: boolean;
  searchTerm?: string;
}

const FamilyTree = forwardRef<HTMLDivElement, FamilyTreeProps>(({
  familyTree,
  onMemberClick,
  onAddMember,
  isEditable = false,
  searchTerm = '',
}, ref): JSX.Element => {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (searchTerm) {
      setCollapsedNodes(new Set());
    }
  }, [searchTerm]);

  const toggleCollapse = (nodeId: string): void => {
    setCollapsedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const isMatchSearch = (node: Member): boolean => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (node.name?.toLowerCase().includes(term)) return true;

    const children = node.children as Member[];
    return children?.some((child) => isMatchSearch(child)) || false;
  };

  const isExactMatch = (node: Member): boolean => {
    if (!searchTerm) return false;
    return node.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
  };

  // Nhóm con theo spouseIndex
  const groupChildrenBySpouse = (children: Member[], spouses: Member['spouse']) => {
    if (!spouses || spouses.length <= 1) {
      return null; // Không cần nhóm nếu chỉ có 1 vợ/chồng
    }

    const groups: { [key: number]: Member[] } = {};
    children.forEach((child) => {
      const idx = child.spouseIndex || 0;
      if (!groups[idx]) groups[idx] = [];
      groups[idx].push(child);
    });

    return groups;
  };

  const renderTree = (
    node: Member,
    parentGender: 'male' | 'female' | null = null,
    depth: number = 0,
    parentMatched: boolean = false
  ): JSX.Element | null => {
    const nodeMatches = isExactMatch(node);
    const shouldShow = !searchTerm || isMatchSearch(node) || parentMatched;

    if (!shouldShow) return null;

    const tenTrongGiaPha = node.name?.includes('-')
      ? node.name.split('-')
      : [node.name, '', ''];

    const children = node.children as Member[];
    const sortedChildren = [...(children || [])].sort((a, b) => {
      // Sắp xếp theo spouseIndex trước, rồi theo birthday
      const spouseCompare = (a.spouseIndex || 0) - (b.spouseIndex || 0);
      if (spouseCompare !== 0) return spouseCompare;
      if (!a.birthday || !b.birthday) return 0;
      return new Date(a.birthday).getTime() - new Date(b.birthday).getTime();
    });

    const showAllChildren = nodeMatches || parentMatched;
    const filteredChildren = showAllChildren
      ? sortedChildren
      : sortedChildren.filter((child) => isMatchSearch(child));

    const hasRealChildren = sortedChildren.length > 0;
    const hasVisibleChildren = filteredChildren.length > 0;

    const isCollapsed = collapsedNodes.has(node._id);
    const showAddButton =
      isEditable &&
      !(parentGender === 'female' || (node.maritalStatus === 'single' && !node.isAlive));

    const childCount = node.children?.length || 0;
    const isHighlighted = nodeMatches;

    // Nhóm con theo vợ/chồng
    const spouseGroups = groupChildrenBySpouse(filteredChildren, node.spouse);
    const hasMultipleSpouses = node.spouse && node.spouse.length > 1;

    return (
      <li key={node._id}>
        {/* Collapse/Expand button */}
        {hasRealChildren && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(node._id);
            }}
            className="collapse-btn"
            title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronDown} />
          </span>
        )}

        <span
          onClick={() => onMemberClick?.(node)}
          className={`member-name ${node.isAlive ? 'alive' : 'deceased'} ${isHighlighted ? 'highlighted' : ''}`}
          style={{
            color: node.isAlive ? levelColors[depth % levelColors.length] : 'black',
          }}
        >
          {tenTrongGiaPha[0]}
          {tenTrongGiaPha[2] ? `-${tenTrongGiaPha[2]}` : ''}
        </span>

        {showAddButton && (
          <>
            {(node.maritalStatus === 'single' && !node.isAlive) || childCount === 0
              ? ''
              : ` (${childCount})`}
            <FontAwesomeIcon
              icon={faPlusCircle}
              className="add-member-icon text-secondary mb-1 ms-2"
              onClick={(e) => {
                e.stopPropagation();
                onAddMember?.(node._id);
              }}
            />
          </>
        )}

        {!isEditable && parentGender !== 'female' && (
          <>
            {(node.maritalStatus === 'single' && !node.isAlive) || childCount === 0
              ? ''
              : ` (${childCount})`}
          </>
        )}

        {/* Children */}
        {hasVisibleChildren && !isCollapsed && (
          <ul>
            {hasMultipleSpouses && spouseGroups ? (
              // Hiển thị theo nhóm vợ/chồng
              Object.keys(spouseGroups).map((idx) => {
                const spouseIdx = parseInt(idx);
                const spouse = node.spouse?.[spouseIdx];
                const spouseChildren = spouseGroups[spouseIdx];
                const spouseLabel = node.gender === 'male'
                  ? `Vợ ${spouseIdx + 1}`
                  : `Chồng ${spouseIdx + 1}`;

                return (
                  <li key={`spouse-${spouseIdx}`} className="spouse-group">
                    <span className="spouse-label">
                      {spouse?.name ? `${spouseLabel}: ${spouse.name}` : spouseLabel}
                      <span className="spouse-children-count"> ({spouseChildren.length} con)</span>
                    </span>
                    <ul>
                      {spouseChildren.map((child) =>
                        renderTree(child, node.gender, depth + 1, nodeMatches || parentMatched)
                      )}
                    </ul>
                  </li>
                );
              })
            ) : (
              // Hiển thị bình thường
              filteredChildren.map((child) =>
                renderTree(child, node.gender, depth + 1, nodeMatches || parentMatched)
              )
            )}
          </ul>
        )}
      </li>
    );
  };

  if (!familyTree || familyTree.length === 0) {
    return (
      <div className="text-center mt-3">
        <p className="text-muted">Chưa có thành viên nào trong cây gia phả.</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="family-tree-wrapper">
      <ul className="family-tree-root">
        {familyTree.map((rootMember) => renderTree(rootMember))}
      </ul>
    </div>
  );
});

FamilyTree.displayName = 'FamilyTree';

export default FamilyTree;