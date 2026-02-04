'use client';

import { useEffect, useState } from 'react';
import './Loading.css';

interface LoadingProps {
    text?: string;
    fullScreen?: boolean;
}

export default function Loading({
    text = 'Đang tải dữ liệu...',
    fullScreen = true
}: LoadingProps): JSX.Element {
    const [opacity, setOpacity] = useState<number>(0.3);
    const [increasing, setIncreasing] = useState<boolean>(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setOpacity((prev) => {
                if (increasing) {
                    if (prev >= 1) {
                        setIncreasing(false);
                        return prev - 0.05;
                    }
                    return prev + 0.05;
                } else {
                    if (prev <= 0.3) {
                        setIncreasing(true);
                        return prev + 0.05;
                    }
                    return prev - 0.05;
                }
            });
        }, 50);

        return () => clearInterval(interval);
    }, [increasing]);

    return (
        <div className={`loading-container ${fullScreen ? 'fullscreen' : ''}`}>
            <div className="loading-content">
                <img
                    src="/totienta.logo.png"
                    alt="Đang tải dữ liệu..."
                    className="loading-logo"
                    style={{ opacity }}
                />
                <p className="loading-text">{text}</p>
            </div>
        </div>
    );
}