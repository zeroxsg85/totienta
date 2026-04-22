'use client';

/**
 * MemberBasicFields – các trường thông tin cơ bản dùng chung
 * cho cả AddMemberModal và EditMemberModal.
 *
 * Thêm field mới vào đây → cả 2 modal tự có ngay.
 */

import { Accordion, Col, Form, InputGroup, Row } from 'react-bootstrap';
import { AnniversaryDate, DualDate, IdCard, Member } from '@/types';

// ── Kiểu dữ liệu đầu vào ─────────────────────────────────────────────────────
export interface BasicMemberData {
  name: string;
  gender: 'male' | 'female';
  birthday?: DualDate;
  phoneNumber?: string;
  address?: string;
  occupation?: string;
  hometown?: string;
  religion?: string;
  idCard?: IdCard;
  maritalStatus: Member['maritalStatus'];
  isAlive: boolean;
  deathDate?: DualDate;
  anniversaryDate?: AnniversaryDate;
}

interface Props {
  data: BasicMemberData;
  onChange: (patch: Partial<BasicMemberData>) => void;
}

// ── Helpers nội bộ ────────────────────────────────────────────────────────────
function mergeBirthday(data: BasicMemberData, patch: Partial<DualDate>): Partial<BasicMemberData> {
  return { birthday: { ...data.birthday, ...patch } };
}
function mergeDeathDate(data: BasicMemberData, patch: Partial<DualDate>): Partial<BasicMemberData> {
  return { deathDate: { ...data.deathDate, ...patch } };
}
function mergeAnniversary(data: BasicMemberData, patch: Partial<AnniversaryDate>): Partial<BasicMemberData> {
  return { anniversaryDate: { ...data.anniversaryDate, ...patch } };
}
function mergeLunarBirthday(data: BasicMemberData, patch: Partial<DualDate['lunar']>): Partial<BasicMemberData> {
  return mergeBirthday(data, { lunar: { ...data.birthday?.lunar, ...patch } });
}
function mergeLunarDeath(data: BasicMemberData, patch: Partial<DualDate['lunar']>): Partial<BasicMemberData> {
  return mergeDeathDate(data, { lunar: { ...data.deathDate?.lunar, ...patch } });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MemberBasicFields({ data, onChange }: Props) {
  return (
    <>
      {/* ── Tên ── */}
      <InputGroup className="mb-3">
        <InputGroup.Text>Tên</InputGroup.Text>
        <Form.Control
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
        />
      </InputGroup>

      {/* ── Sinh nhật dương lịch ── */}
      <InputGroup className="mb-2">
        <InputGroup.Text>Sinh nhật (dương)</InputGroup.Text>
        <Form.Control
          type="date"
          value={data.birthday?.solar?.split('T')[0] || ''}
          onChange={(e) => onChange(mergeBirthday(data, { solar: e.target.value }))}
        />
      </InputGroup>

      {/* ── Sinh nhật âm lịch ── */}
      <Accordion className="mb-3">
        <Accordion.Item eventKey="0">
          <Accordion.Header>Ngày sinh âm lịch (tuỳ chọn)</Accordion.Header>
          <Accordion.Body>
            <Row className="g-2">
              <Col xs={3}>
                <InputGroup>
                  <InputGroup.Text>Ngày</InputGroup.Text>
                  <Form.Control type="number" min={1} max={30}
                    value={data.birthday?.lunar?.day || ''}
                    onChange={(e) => onChange(mergeLunarBirthday(data, { day: Number(e.target.value) }))}
                  />
                </InputGroup>
              </Col>
              <Col xs={3}>
                <InputGroup>
                  <InputGroup.Text>Tháng</InputGroup.Text>
                  <Form.Control type="number" min={1} max={12}
                    value={data.birthday?.lunar?.month || ''}
                    onChange={(e) => onChange(mergeLunarBirthday(data, { month: Number(e.target.value) }))}
                  />
                </InputGroup>
              </Col>
              <Col xs={3}>
                <InputGroup>
                  <InputGroup.Text>Năm</InputGroup.Text>
                  <Form.Control type="number"
                    value={data.birthday?.lunar?.year || ''}
                    onChange={(e) => onChange(mergeLunarBirthday(data, { year: Number(e.target.value) }))}
                  />
                </InputGroup>
              </Col>
              <Col xs={3} className="d-flex align-items-center">
                <Form.Check label="Nhuận"
                  checked={data.birthday?.lunar?.isLeap || false}
                  onChange={(e) => onChange(mergeLunarBirthday(data, { isLeap: e.target.checked }))}
                />
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      {/* ── Giới tính ── */}
      <InputGroup className="mb-3">
        <InputGroup.Text>Giới tính</InputGroup.Text>
        <Form.Select
          value={data.gender}
          onChange={(e) => onChange({ gender: e.target.value as 'male' | 'female' })}
          required
        >
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
        </Form.Select>
      </InputGroup>

      {/* ── Hôn nhân ── */}
      <InputGroup className="mb-3">
        <InputGroup.Text>Hôn nhân</InputGroup.Text>
        <Form.Select
          value={data.maritalStatus}
          onChange={(e) => onChange({ maritalStatus: e.target.value as Member['maritalStatus'] })}
          required
        >
          <option value="single">Độc thân</option>
          <option value="married">Đã kết hôn</option>
          <option value="divorced">Ly hôn</option>
          <option value="widowed">Góa</option>
        </Form.Select>
      </InputGroup>

      {/* ── Số điện thoại ── */}
      <InputGroup className="mb-3">
        <InputGroup.Text>Số điện thoại</InputGroup.Text>
        <Form.Control type="text"
          value={data.phoneNumber || ''}
          onChange={(e) => onChange({ phoneNumber: e.target.value })}
        />
      </InputGroup>

      {/* ── Nơi ở ── */}
      <InputGroup className="mb-3">
        <InputGroup.Text>Nơi ở</InputGroup.Text>
        <Form.Control type="text"
          value={data.address || ''}
          onChange={(e) => onChange({ address: e.target.value })}
        />
      </InputGroup>

      {/* ── Nghề nghiệp ── */}
      <InputGroup className="mb-3">
        <InputGroup.Text>Nghề nghiệp</InputGroup.Text>
        <Form.Control type="text"
          value={data.occupation || ''}
          onChange={(e) => onChange({ occupation: e.target.value })}
        />
      </InputGroup>

      {/* ── Quê quán ── */}
      <InputGroup className="mb-3">
        <InputGroup.Text>Quê quán</InputGroup.Text>
        <Form.Control type="text"
          value={data.hometown || ''}
          onChange={(e) => onChange({ hometown: e.target.value })}
        />
      </InputGroup>

      {/* ── Tín ngưỡng ── */}
      <InputGroup className="mb-3">
        <InputGroup.Text>Tín ngưỡng</InputGroup.Text>
        <Form.Control type="text" placeholder="VD: Phật giáo, Công giáo..."
          value={data.religion || ''}
          onChange={(e) => onChange({ religion: e.target.value })}
        />
      </InputGroup>

      {/* ── Giấy tờ tùy thân (CCCD / CMND / Hộ chiếu) ── */}
      <Form.Label><strong>Giấy tờ tùy thân</strong></Form.Label>
      <Row className="mb-3">
        <Col xs={5}>
          <Form.Select
            value={data.idCard?.type || 'cccd'}
            onChange={(e) => onChange({ idCard: { ...data.idCard, type: e.target.value as IdCard['type'] } })}
          >
            <option value="cccd">CCCD</option>
            <option value="cmnd">CMND</option>
            <option value="passport">Hộ chiếu</option>
            <option value="other">Khác</option>
          </Form.Select>
        </Col>
        <Col xs={7}>
          <Form.Control type="text" placeholder="Số giấy tờ..."
            value={data.idCard?.number || ''}
            onChange={(e) => onChange({ idCard: { ...data.idCard, type: data.idCard?.type || 'cccd', number: e.target.value } })}
          />
        </Col>
      </Row>

      {/* ── Còn sống / Đã mất ── */}
      <Form.Group className="mb-3">
        <Form.Check type="checkbox" label="Còn sống"
          checked={data.isAlive}
          onChange={(e) => onChange({ isAlive: e.target.checked })}
        />
      </Form.Group>

      {/* ── Thông tin khi đã mất ── */}
      {!data.isAlive && (
        <>
          {/* Ngày mất dương lịch */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Ngày mất (dương)</InputGroup.Text>
            <Form.Control type="date"
              value={data.deathDate?.solar?.split('T')[0] || ''}
              onChange={(e) => onChange(mergeDeathDate(data, { solar: e.target.value }))}
            />
          </InputGroup>

          {/* Ngày mất âm lịch */}
          <Accordion className="mb-3">
            <Accordion.Item eventKey="0">
              <Accordion.Header>Ngày mất âm lịch (tuỳ chọn)</Accordion.Header>
              <Accordion.Body>
                <Row className="g-2">
                  <Col xs={3}>
                    <InputGroup>
                      <InputGroup.Text>Ngày</InputGroup.Text>
                      <Form.Control type="number" min={1} max={30}
                        value={data.deathDate?.lunar?.day || ''}
                        onChange={(e) => onChange(mergeLunarDeath(data, { day: Number(e.target.value) }))}
                      />
                    </InputGroup>
                  </Col>
                  <Col xs={3}>
                    <InputGroup>
                      <InputGroup.Text>Tháng</InputGroup.Text>
                      <Form.Control type="number" min={1} max={12}
                        value={data.deathDate?.lunar?.month || ''}
                        onChange={(e) => onChange(mergeLunarDeath(data, { month: Number(e.target.value) }))}
                      />
                    </InputGroup>
                  </Col>
                  <Col xs={3}>
                    <InputGroup>
                      <InputGroup.Text>Năm</InputGroup.Text>
                      <Form.Control type="number"
                        value={data.deathDate?.lunar?.year || ''}
                        onChange={(e) => onChange(mergeLunarDeath(data, { year: Number(e.target.value) }))}
                      />
                    </InputGroup>
                  </Col>
                  <Col xs={3} className="d-flex align-items-center">
                    <Form.Check label="Nhuận"
                      checked={data.deathDate?.lunar?.isLeap || false}
                      onChange={(e) => onChange(mergeLunarDeath(data, { isLeap: e.target.checked }))}
                    />
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          {/* Ngày giỗ */}
          <Accordion className="mb-3">
            <Accordion.Item eventKey="0">
              <Accordion.Header>Ngày giỗ (tuỳ chọn – nếu khác ngày mất)</Accordion.Header>
              <Accordion.Body>
                <Row className="g-2 mb-2">
                  <Col xs={4}>
                    <InputGroup>
                      <InputGroup.Text>Ngày</InputGroup.Text>
                      <Form.Control type="number" min={1} max={30}
                        value={data.anniversaryDate?.lunar?.day || ''}
                        onChange={(e) => onChange(mergeAnniversary(data, { lunar: { ...data.anniversaryDate?.lunar, day: Number(e.target.value) } }))}
                      />
                    </InputGroup>
                  </Col>
                  <Col xs={4}>
                    <InputGroup>
                      <InputGroup.Text>Tháng</InputGroup.Text>
                      <Form.Control type="number" min={1} max={12}
                        value={data.anniversaryDate?.lunar?.month || ''}
                        onChange={(e) => onChange(mergeAnniversary(data, { lunar: { ...data.anniversaryDate?.lunar, month: Number(e.target.value) } }))}
                      />
                    </InputGroup>
                  </Col>
                </Row>
                <InputGroup>
                  <InputGroup.Text>Ghi chú</InputGroup.Text>
                  <Form.Control type="text" placeholder="VD: Rút lên 1 ngày"
                    value={data.anniversaryDate?.note || ''}
                    onChange={(e) => onChange(mergeAnniversary(data, { note: e.target.value }))}
                  />
                </InputGroup>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </>
      )}
    </>
  );
}
