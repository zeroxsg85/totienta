// ── Ngày tháng ──────────────────────────────────────────────────────────────
export interface LunarDate {
  day?: number;
  month?: number;
  year?: number;
  isLeap?: boolean;
}

/** Ngày dương + âm lịch song song */
export interface DualDate {
  solar?: string; // ISO string / YYYY-MM-DD
  lunar?: LunarDate;
}

/** Ngày giỗ – chỉ cần ngày/tháng âm, lặp hàng năm */
export interface AnniversaryDate {
  lunar?: { day?: number; month?: number };
  note?: string;
}

// ── Thành viên – sub-types mới ───────────────────────────────────────────────
export interface Memorial {
  biography?: string;
  epitaph?: string;
  photos?: string[];
  videos?: string[];
  audioUrl?: string;
  achievements?: string[];
  story?: string;
}

export interface Burial {
  location?: string;
  coordinates?: { lat?: number; lng?: number };
  photo?: string;
  lastVisited?: string;
}

export interface ShrineOfferingStat {
  label: string;
  count?: number;
  lastOffered?: string;
}

export interface Shrine {
  isEnabled?: boolean;
  backgroundTheme?: string;
  incenseCount?: number;
  lastIncense?: string;
  offerings?: string[];          // danh sách nổi bật do chủ cây chọn
  offeringStats?: ShrineOfferingStat[]; // thống kê dâng lễ vật
}

export interface IdCard {
  number?: string;
  type?: 'cccd' | 'cmnd' | 'passport' | 'other';
}

export type VisibilityLevel = 'public' | 'login' | 'member';

export interface VisibilitySettings {
  phoneNumber?: VisibilityLevel;
  birthday?: VisibilityLevel;
  address?: VisibilityLevel;
  occupation?: VisibilityLevel;
  hometown?: VisibilityLevel;
  religion?: VisibilityLevel;
  spouse?: VisibilityLevel;
  memorial?: VisibilityLevel;
  burial?: VisibilityLevel;
  legacy?: VisibilityLevel;
  shrine?: VisibilityLevel;
  idCard?: VisibilityLevel;
}

export interface LegacyMessage {
  _id?: string;
  content?: string;
  scheduledAt?: string;
  toWhom?: string;
}

export interface Legacy {
  messages?: LegacyMessage[];
  voiceCloneUrl?: string;
  lastWords?: string;
}

// ── Vợ / Chồng ───────────────────────────────────────────────────────────────
export interface Spouse {
  name: string;
  phoneNumber?: string;
  birthday?: string;
  hometown?: string;
}

// ── Custom fields ─────────────────────────────────────────────────────────────
export interface CustomField {
  label: string;
  type: 'text' | 'number' | 'date' | 'image' | 'boolean';
  value: string | number | boolean;
}

// ── Member ────────────────────────────────────────────────────────────────────
export interface Member {
  _id: string;
  name: string;
  gender: 'male' | 'female';
  birthday?: DualDate;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  isAlive: boolean;
  avatar?: string;
  phoneNumber?: string;
  address?: string;
  occupation?: string;
  hometown?: string;
  religion?: string;
  spouse?: Spouse[];
  deathDate?: DualDate;
  anniversaryDate?: AnniversaryDate;
  memorial?: Memorial;
  burial?: Burial;
  shrine?: Shrine;
  idCard?: IdCard;
  legacy?: Legacy;
  parent?: string | Member | null;
  children: (string | Member)[];
  spouseIndex?: number;
  order?: number;
  createdBy: string;
  viewCode?: string;
  customFields?: CustomField[];
  createdAt?: string;
  updatedAt?: string;
}

// ── Clan / Tree level ─────────────────────────────────────────────────────────
export interface ClanEvent {
  _id?: string;
  title: string;
  date?: string;
  lunarDate?: LunarDate;
  type?: 'giỗ tổ' | 'họp họ' | 'tảo mộ' | 'khác';
  location?: string;
  livestreamUrl?: string;
}

export interface ClanInfo {
  origin?: string;
  ancestralHome?: string;
  motto?: string;
  crest?: string;
}

export interface Fund {
  isEnabled?: boolean;
  balance?: number;
  currency?: string;
  purpose?: string;
}

// ── Profile ───────────────────────────────────────────────────────────────────
export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  birthday?: string;
  avatar?: string;
  plan?: 'free' | 'basic' | 'premium';
  planExpiry?: string;
  createdAt?: string;
  treeName?: string;
  fund?: Fund;
  events?: ClanEvent[];
  clanInfo?: ClanInfo;
  visibilitySettings?: VisibilitySettings;
  viewCode?: string;
  isVerified?: boolean;
}

// ── Form data ─────────────────────────────────────────────────────────────────
export interface MemberFormData {
  name: string;
  gender: 'male' | 'female';
  birthday?: DualDate;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  isAlive: boolean;
  phoneNumber?: string;
  address?: string;
  occupation?: string;
  hometown?: string;
  religion?: string;
  spouse?: Spouse | Spouse[];
  deathDate?: DualDate;
  anniversaryDate?: AnniversaryDate;
  parent?: string | null;
  children?: string[];
  spouseIndex?: number;
}

// ── User / Auth ───────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

// ── Cross-tree matching ───────────────────────────────────────────────────────
export interface CrossTreeMatch {
  _id: string;
  treeOwnerA: string;
  memberA: Pick<Member, '_id' | 'name' | 'birthday' | 'gender' | 'avatar'> | null;
  viewCodeA?: string;
  memberAName: string;
  treeOwnerB: string;
  memberB: Pick<Member, '_id' | 'name' | 'birthday' | 'gender' | 'avatar'> | null;
  viewCodeB?: string;
  memberBName: string;
  matchFields: string[];
  matchScore: number;
  confirmedByA: boolean;
  confirmedByB: boolean;
  deniedByA: boolean;
  deniedByB: boolean;
  status: 'pending' | 'confirmed' | 'denied';
  autoSuggestedFrom?: string;
  crossTreeLinkId?: string;
  createdAt: string;
  // Enriched fields (thêm bởi backend)
  myRole?: 'A' | 'B';
  myMember?: Pick<Member, '_id' | 'name' | 'birthday' | 'gender' | 'avatar'> | null;
  theirMember?: Pick<Member, '_id' | 'name' | 'birthday' | 'gender' | 'avatar'> | null;
  theirViewCode?: string;
  myConfirmed?: boolean;
  myDenied?: boolean;
  theirConfirmed?: boolean;
}

export interface CrossTreeLink {
  _id: string;
  treeOwnerA: { _id: string; name: string; treeName?: string };
  treeOwnerB: { _id: string; name: string; treeName?: string };
  viewCodeA?: string;
  viewCodeB?: string;
  linkedPairs: Array<{
    memberA?: Pick<Member, '_id' | 'name' | 'birthday' | 'gender' | 'avatar'>;
    memberB?: Pick<Member, '_id' | 'name' | 'birthday' | 'gender' | 'avatar'>;
  }>;
  status: 'active' | 'dissolved';
  createdAt: string;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  user?: User;
}

export interface ViewCodeResponse {
  viewCode: string;
}

export interface ApiError {
  message: string;
  status?: number;
}
