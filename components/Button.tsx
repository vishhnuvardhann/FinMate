import React from 'react';

interface ButtonProps {
    text: string;
    loading?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
}

const Button: React.FC<ButtonProps> = ({ text, loading, onClick, type = 'submit', className = '' }) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={loading}
            className={`w-full py-3 px-6 rounded-xl font-semibold text-white shadow-lg transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 ${className}`}
        >
            {loading ? (
                <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                </div>
            ) : (
                text
            )}
        </button>
    );
};

export default Button;
