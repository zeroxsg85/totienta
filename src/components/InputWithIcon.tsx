'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type Props = {
    type?: string;
    icon: IconDefinition;
    placeholder?: string;
    name: string;
    value: string;
    disabled?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function InputWithIcon({
    type = 'text',
    icon,
    placeholder,
    name,
    value,
    onChange,
    disabled = false,
}: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className="input-group mb-3">
            <span className="input-group-text">
                <FontAwesomeIcon icon={icon} />
            </span>

            <input
                type={isPassword ? (showPassword ? 'text' : 'password') : type}
                className="form-control"
                placeholder={placeholder}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
            />

            {isPassword && (
                <span
                    className="input-group-text"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowPassword(!showPassword)}
                >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </span>
            )}
        </div>
    );
}
