'use client';

import { useState } from 'react';
import { Carousel, Button, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTree,
    faUsers,
    faShareAlt,
    faSearch,
    faShieldAlt,
    faCamera,
    faLightbulb,
    faMobileAlt,
    faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeClient(): JSX.Element {
    const { isAuthenticated } = useAuth();
    const [index, setIndex] = useState(0);

    const slides = [
        {
            icon: faTree,
            color: '#28a745',
            title: 'Lưu giữ cội nguồn',
            subtitle: 'Xây dựng cây gia phả trực tuyến',
            description: 'Ghi lại lịch sử gia đình qua nhiều thế hệ, từ ông bà tổ tiên đến con cháu mai sau.',
        },
        {
            icon: faUsers,
            color: '#007bff',
            title: 'Kết nối dòng họ',
            subtitle: 'Thông tin đầy đủ từng thành viên',
            description: 'Lưu trữ ngày sinh, địa chỉ, số điện thoại, hình ảnh và nhiều thông tin khác.',
        },
        {
            icon: faShareAlt,
            color: '#17a2b8',
            title: 'Chia sẻ dễ dàng',
            subtitle: 'Một link - mọi người cùng xem',
            description: 'Tạo link chia sẻ để người thân xem cây gia phả mọi lúc, mọi nơi.',
        },
        {
            icon: faLightbulb,
            color: '#ffc107',
            title: 'Cộng tác xây dựng',
            subtitle: 'Mọi người cùng đóng góp',
            description: 'Người thân có thể đề xuất bổ sung thông tin, giúp cây gia phả ngày càng hoàn thiện.',
        },
        {
            icon: faShieldAlt,
            color: '#6f42c1',
            title: 'Bảo mật an toàn',
            subtitle: 'Dữ liệu gia đình được bảo vệ',
            description: 'Chỉ người có link mới xem được. Bạn toàn quyền kiểm soát thông tin gia đình.',
        },
    ];

    const features = [
        {
            icon: faTree,
            color: '#28a745',
            title: 'Cây gia phả trực quan',
            description: 'Hiển thị rõ ràng các mối quan hệ cha-con, vợ-chồng qua nhiều đời.',
        },
        {
            icon: faSearch,
            color: '#007bff',
            title: 'Tìm kiếm nhanh',
            description: 'Tìm thành viên trong tích tắc dù gia phả có hàng trăm người.',
        },
        {
            icon: faCamera,
            color: '#17a2b8',
            title: 'Xuất ảnh gia phả',
            description: 'Tải về hình ảnh cây gia phả để in ấn hoặc chia sẻ.',
        },
        {
            icon: faMobileAlt,
            color: '#fd7e14',
            title: 'Xem trên mọi thiết bị',
            description: 'Giao diện tương thích điện thoại, máy tính bảng và PC.',
        },
        {
            icon: faLightbulb,
            color: '#ffc107',
            title: 'Đề xuất thông tin',
            description: 'Người thân có thể gửi đề xuất bổ sung, bạn duyệt và cập nhật.',
        },
        {
            icon: faShieldAlt,
            color: '#6f42c1',
            title: 'Riêng tư & Bảo mật',
            description: 'Dữ liệu được mã hóa, chỉ chia sẻ khi bạn cho phép.',
        },
    ];

    return (
        <div className="homepage">
            {/* Hero Carousel */}
            <section className="hero-section">
                <Carousel
                    activeIndex={index}
                    onSelect={(selectedIndex) => setIndex(selectedIndex)}
                    indicators={true}
                    controls={true}
                    interval={5000}
                    className="hero-carousel"
                >
                    {slides.map((slide, idx) => (
                        <Carousel.Item key={idx}>
                            <div className="hero-slide" style={{ background: `linear-gradient(135deg, ${slide.color}22 0%, ${slide.color}44 100%)` }}>
                                <div className="hero-content">
                                    <div className="hero-icon" style={{ color: slide.color }}>
                                        <FontAwesomeIcon icon={slide.icon} />
                                    </div>
                                    <h1 className="hero-title">{slide.title}</h1>
                                    <p className="hero-subtitle">{slide.subtitle}</p>
                                    <p className="hero-description">{slide.description}</p>
                                </div>
                            </div>
                        </Carousel.Item>
                    ))}
                </Carousel>

                {/* CTA Buttons */}
                <div className="hero-cta">
                    {isAuthenticated ? (
                        <Link href="/members">
                            <Button variant="primary" size="lg" className="cta-button">
                                <FontAwesomeIcon icon={faTree} className="me-2" />
                                Cây gia phả của bạn
                                <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                            </Button>
                        </Link>
                    ) : (
                        <>
                            <Link href="/register">
                                <Button variant="primary" size="lg" className="cta-button me-3">
                                    Tạo cây gia phả miễn phí
                                    <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                                </Button>
                            </Link>
                            <Link href="/04BAAF10" target='_blank'>
                                <Button variant="outline-primary" size="lg" className="cta-button-outline">
                                    Xem Họ Hoàng-LẠNG SƠN
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <h2 className="section-title">Tính năng nổi bật</h2>
                    <p className="section-subtitle">Mọi thứ bạn cần để xây dựng và quản lý cây gia phả</p>

                    <Row className="g-4 mt-4">
                        {features.map((feature, idx) => (
                            <Col key={idx} xs={12} sm={6} lg={4}>
                                <Card className="feature-card h-100">
                                    <Card.Body className="text-center">
                                        <div className="feature-icon" style={{ color: feature.color }}>
                                            <FontAwesomeIcon icon={feature.icon} />
                                        </div>
                                        <h5 className="feature-title">{feature.title}</h5>
                                        <p className="feature-description">{feature.description}</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            </section>

            {/* How it works */}
            <section className="howto-section">
                <div className="container">
                    <h2 className="section-title">Bắt đầu chỉ với 3 bước</h2>

                    <Row className="g-4 mt-4 justify-content-center">
                        <Col xs={12} md={4}>
                            <div className="step-card">
                                <div className="step-number">1</div>
                                <h5>Đăng ký tài khoản</h5>
                                <p>Miễn phí, chỉ cần email</p>
                            </div>
                        </Col>
                        <Col xs={12} md={4}>
                            <div className="step-card">
                                <div className="step-number">2</div>
                                <h5>Thêm thành viên</h5>
                                <p>Nhập thông tin từng người</p>
                            </div>
                        </Col>
                        <Col xs={12} md={4}>
                            <div className="step-card">
                                <div className="step-number">3</div>
                                <h5>Chia sẻ với gia đình</h5>
                                <p>Gửi link để mọi người cùng xem</p>
                            </div>
                        </Col>
                    </Row>

                    {!isAuthenticated && (
                        <div className="text-center mt-5">
                            <Link href="/register">
                                <Button variant="success" size="lg" className="cta-button">
                                    <FontAwesomeIcon icon={faTree} className="me-2" />
                                    Tạo cây gia phả ngay
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* Footer Quote */}
            <section className="quote-section">
                <div className="container">
                    <blockquote className="quote-text">
                        "Cây có cội, nước có nguồn. <br />
                        Kính nhớ tổ tiên, giữ gìn gia phong."
                    </blockquote>
                    <p className="quote-brand">— ToTienTa.com —</p>
                </div>
            </section>
        </div>
    );
}