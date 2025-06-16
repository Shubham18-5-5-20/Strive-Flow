import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const getSession = async () => { const { data: { session } } = await supabase.auth.getSession(); setUser(session?.user ?? null); setLoading(false); };
        getSession();
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setLoading(false); });
        return () => { listener?.subscription.unsubscribe(); };
    }, []);
    const value = { signUp: (data) => supabase.auth.signUp(data), signIn: (data) => supabase.auth.signInWithPassword(data), signOut: () => supabase.auth.signOut(), user, };
    return (<AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>);
};
export const useAuth = () => { return useContext(AuthContext); };