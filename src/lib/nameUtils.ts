/**
 * Tên thành viên lưu dạng: "Tên Trong Gia Phả-Tên Trong Khai Sinh-Tên Thường Gọi"
 * Separator là dấu "-" (không có khoảng trắng xung quanh).
 */
export function getCivilName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.split('-').map(p => p.trim());
  return parts.length >= 2 ? parts[1] : fullName;
}

export function getFamilyTreeName(fullName: string): string {
  if (!fullName) return '';
  return fullName.split('-')[0].trim();
}

export function getNickname(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.split('-').map(p => p.trim());
  return parts.length >= 3 ? parts[2] : '';
}
