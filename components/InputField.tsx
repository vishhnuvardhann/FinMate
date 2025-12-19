import React from 'react';

interface InputFieldProps {
    label: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, type, placeholder, value, onChange }) => {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition focus:ring-1 focus:ring-indigo-500"
            />
        </div>
    );
};

export default InputField;
