import React from 'react';

interface SignInWithGoogleButtonProps {
    onClick: () => void;
}

const SignInWithGoogleButton: React.FC<SignInWithGoogleButtonProps> = ({ onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 px-6 rounded-xl shadow hover:bg-gray-50 transition transform active:scale-95"
        >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span>Sign in with Google</span>
        </button>
    );
};

export default SignInWithGoogleButton;
