'use client';

import { useState, useRef, useEffect } from 'react';
import { Form, InputGroup, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    allowEmpty?: boolean;
    emptyLabel?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Tìm kiếm...',
    disabled = false,
    allowEmpty = true,
    emptyLabel = 'Không chọn',
}: SearchableSelectProps): JSX.Element {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (optValue: string) => {
        onChange(optValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div ref={wrapperRef} className="searchable-select">
            <Form.Control
                type="text"
                placeholder={selectedOption ? selectedOption.label : placeholder}
                value={isOpen ? searchTerm : (selectedOption?.label || '')}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsOpen(true)}
                disabled={disabled}
                className={disabled ? 'bg-light' : ''}
            />

            {isOpen && !disabled && (
                <ListGroup className="searchable-select-dropdown">
                    {allowEmpty && (
                        <ListGroup.Item
                            action
                            onClick={() => handleSelect('')}
                            active={value === ''}
                        >
                            {emptyLabel}
                        </ListGroup.Item>
                    )}
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <ListGroup.Item
                                key={opt.value}
                                action
                                onClick={() => handleSelect(opt.value)}
                                active={value === opt.value}
                            >
                                {opt.label}
                            </ListGroup.Item>
                        ))
                    ) : (
                        <ListGroup.Item disabled>Không tìm thấy</ListGroup.Item>
                    )}
                </ListGroup>
            )}
        </div>
    );
}