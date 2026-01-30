'use client';

import { useState, useEffect } from 'react';

interface DeviceType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    const updateDeviceType = (): void => {
      const width = window.innerWidth;
      setDeviceType({
        isMobile: width <= 768,
        isTablet: width > 768 && width <= 1024,
        isDesktop: width > 1024,
      });
    };

    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    return () => window.removeEventListener('resize', updateDeviceType);
  }, []);

  return deviceType;
}

export default useDeviceType;
