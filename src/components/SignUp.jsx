import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignUp() {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    
    // --- FIX: Initialize state with empty strings for a clean form ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        // For the MVP, we are still checking against specific credentials.
        // In a real app, this would be an API call to a user authentication service.
        if (email !== '123@gmail.com' || password !== '123') {
            setError('INVALID CREDENTIALS. (Hint: Use 123@gmail.com and 123 for the demo)');
            return;
        }
        setError('');
        setShowSuccess(true);

        setTimeout(() => {
            navigate('/calendar', { state: { fromLogin: true } });
        }, 1500);
    };

    const handleBack = () => {
        setShowModal(false);
        setError('');
        setShowSuccess(false);
        // --- FIX: Reset state to empty strings ---
        setEmail('');
        setPassword('');
    };

    return (
        <>
            <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center">
                <div className="text-center space-y-8 px-4">
                    <h1 className="text-white font-bold text-7xl">
                        MANAGE ALL YOUR PROJECTS<br /> IN ONE PLACE
                    </h1>
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-2xl bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 scale-100 active:scale-95"
                        aria-label="Sign up"
                    >
                        SIGN UP
                    </button>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSubmit} className="relative bg-slate-800 border border-gray-700 shadow-xl w-full max-w-md rounded-lg p-8 space-y-6">
                        {showSuccess ? (
                            <div className="text-green-400 text-center font-bold text-xl animate-pulse">
                                Congratulations! Redirecting...
                            </div>
                        ) : (
                            <>
                                <h2 className="text-white font-bold text-2xl text-center">Create Your Account</h2>
                                {error && (
                                    <div className="text-red-500 text-center font-bold text-sm bg-red-900/50 p-2 rounded-md">
                                        {error}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label htmlFor="email" className="block text-slate-300 text-sm font-medium">Email</label>
                                    <input 
                                        type="email" 
                                        id="email" 
                                        required 
                                        value={email} // This will now correctly be an empty string initially
                                        onChange={(e) => setEmail(e.target.value)} 
                                        className="block w-full p-3 bg-slate-900 border border-gray-600 rounded-md text-white focus:border-green-500 focus:ring-green-500 outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="password" className="block text-slate-300 text-sm font-medium">Password</label>
                                    <input 
                                        type="password" 
                                        id="password" 
                                        required 
                                        value={password} // This will now correctly be an empty string initially
                                        onChange={(e) => setPassword(e.target.value)} 
                                        className="block w-full p-3 bg-slate-900 border border-gray-600 rounded-md text-white focus:border-green-500 focus:ring-green-500 outline-none" 
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-4">
                                    <a href="#" className="text-sm text-blue-400 hover:underline">Forgot Password?</a>
                                    <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 scale-100 active:scale-95">Sign Up</button>
                                </div>
                            </>
                        )}
                    </form>
                    <button onClick={handleBack} className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition-colors" aria-label="Close modal">✕</button>
                </div>
            )}
        </>
    );
}

export default SignUp;