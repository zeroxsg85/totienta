'use client';

import { useState, forwardRef } from 'react';
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

const FamilyTree = forwardRef<HTMLUListElement, FamilyTreeProps>(({
  familyTree,
  onMemberClick,
  onAddMember,
  isEditable = false,
  searchTerm = '',
}, ref): JSX.Element => {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

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

  const renderTree = (
    node: Member,
    parentGender: 'male' | 'female' | null = null,
    depth: number = 0
  ): JSX.Element | null => {
    if (searchTerm && !isMatchSearch(node)) return null;

    const tenTrongGiaPha = node.name?.includes('-')
      ? node.name.split('-')
      : [node.name, '', ''];

    const children = node.children as Member[];
    const sortedChildren = [...(children || [])].sort((a, b) => {
      if (!a.birthday || !b.birthday) return 0;
      return new Date(a.birthday).getTime() - new Date(b.birthday).getTime();
    });

    const hasChildren = sortedChildren.length > 0;
    const isCollapsed = collapsedNodes.has(node._id);
    const showAddButton =
      isEditable &&
      !(parentGender === 'female' || (node.maritalStatus === 'single' && !node.isAlive));

    const childCount = node.children?.length || 0;
    const isHighlighted = isExactMatch(node);

    return (
      <li key={node._id}>
        {hasChildren && (
          <span
            onClick={() => toggleCollapse(node._id)}
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

        {hasChildren && !isCollapsed && (
          <ul>
            {sortedChildren.map((child) => renderTree(child, node.gender, depth + 1))}
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

  return <ul ref={ref} className="family-tree-root">{familyTree.map((rootMember) => renderTree(rootMember))}</ul>;
});

FamilyTree.displayName = 'FamilyTree';

export default FamilyTree;