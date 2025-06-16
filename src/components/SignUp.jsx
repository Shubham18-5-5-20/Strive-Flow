import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function SignUp() {
    const navigate = useNavigate();
    const { signIn, signUp } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [isSignUp, setIsSignUp] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleOpenModal = (signUpMode = true) => { setIsSignUp(signUpMode); setShowModal(true); };
    const handleCloseModal = () => { setShowModal(false); setError(''); setSuccessMessage(''); setEmail(''); setPassword(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(''); setSuccessMessage('');
        if (isSignUp) {
            const { error: signUpError } = await signUp({ email, password });
            if (signUpError) { setError(signUpError.message); }
            else { setSuccessMessage('Success! Please check your email to confirm your account.'); }
        } else {
            const { error: signInError } = await signIn({ email, password });
            if (signInError) { setError(signInError.message); }
            else { navigate('/calendar', { state: { fromLogin: true } }); }
        }
        setLoading(false);
    };

    return (
        <>
            <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center">
                <div className="text-center space-y-8 px-4">
                    <h1 className="text-white font-bold text-7xl">MANAGE ALL YOUR PROJECTS<br /> IN ONE PLACE</h1>
                    <div className="flex justify-center items-center gap-4"><button onClick={() => handleOpenModal(true)} className="text-2xl bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 scale-100 active:scale-95">GET STARTED</button></div>
                </div>
            </div>
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSubmit} className="relative bg-slate-800 border border-gray-700 shadow-xl w-full max-w-md rounded-lg p-8 space-y-6">
                        {successMessage ? (<div className="text-center"><h2 className="text-2xl font-bold text-green-400">Success!</h2><p className="text-slate-300 mt-2">{successMessage}</p></div>) : (
                            <>
                                <h2 className="text-white font-bold text-2xl text-center">{isSignUp ? 'Create Your Account' : 'Sign In to StriveFlow'}</h2>
                                {error && (<div className="text-red-400 text-center font-bold text-sm bg-red-900/50 p-3 rounded-md">{error}</div>)}
                                <div className="space-y-2"><label htmlFor="email" className="block text-slate-300 text-sm font-medium">Email</label><input type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full p-3 bg-slate-900 border border-gray-600 rounded-md text-white focus:border-green-500 focus:ring-green-500 outline-none" /></div>
                                <div className="space-y-2"><label htmlFor="password" className="block text-slate-300 text-sm font-medium">Password</label><input type="password" id="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full p-3 bg-slate-900 border border-gray-600 rounded-md text-white focus:border-green-500 focus:ring-green-500 outline-none" /></div>
                                <div className="pt-4"><button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed">{loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}</button></div>
                                <div className="text-center pt-2"><button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-blue-400 hover:underline">{isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}</button></div>
                            </>
                        )}
                    </form>
                    <button onClick={handleCloseModal} className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition-colors" aria-label="Close modal">✕</button>
                </div>
            )}
        </>
    );
}

export default SignUp;