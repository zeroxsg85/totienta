export interface Submitter {
    name: string;
    phone?: string;
    email?: string;
    relationship?: string;
}

export interface NewMemberData {
    name?: string;
    gender?: 'male' | 'female';
    birthday?: string;
    phoneNumber?: string;
    address?: string;
    parentId?: string;
    parentName?: string;
    spouseIndex?: number;
    isAlive?: boolean;
    deathDate?: string;
    note?: string;
}

export interface EditMemberData {
    memberId?: string;
    memberName?: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    note?: string;
}

export interface ReportData {
    memberId?: string;
    memberName?: string;
    description?: string;
}

export interface Suggestion {
    _id: string;
    type: 'add' | 'edit' | 'report';
    status: 'pending' | 'approved' | 'rejected';
    treeOwner: string;
    viewCode: string;
    newMemberData?: NewMemberData;
    editMemberData?: EditMemberData;
    reportData?: ReportData;
    submitter: Submitter;
    createdAt: string;
    updatedAt: string;
}