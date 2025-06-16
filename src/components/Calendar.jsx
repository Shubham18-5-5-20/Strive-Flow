// This file is now complete and works with the new multi-user database schema
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { createNewBoardData } from '../utils/boardUtils';

const ReflectionModal = ({ forDate, onSave }) => { const [reflection, setReflection] = useState(''); const [error, setError] = useState(''); const handleSave = () => { if (reflection.trim() === '') { setError('Please provide a reason.'); return; } onSave(forDate, reflection); }; return (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4 ring-2 ring-red-500"><h2 className="text-xl font-bold text-white">End of Day Reflection for {new Date(forDate + 'T00:00:00').toLocaleDateString()}</h2><p className="text-slate-400">Your progress for this day was less than 70%. Please take a moment to reflect on why the goal wasn't met. This is a mandatory step for accountability.</p>{error && <p className="text-red-400 text-sm">{error}</p>}<textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="e.g., Unplanned meetings, scope was larger than expected..." className="w-full h-32 bg-slate-900 text-white p-3 rounded-md outline-none focus:ring-2 focus:ring-red-500 resize-none" /><div className="flex justify-end"><button onClick={handleSave} className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500">Save Reflection</button></div></div></div>); };
const EmojiSelector = ({ selectedEmoji, onSelect }) => { const EMOJI_OPTIONS = ['😊', '🎉', '💡', '🚀', '🤔', '💪', '🔥', '✅']; return (<div className="flex justify-center items-center gap-2 flex-wrap">{EMOJI_OPTIONS.map(emoji => (<button key={emoji} type="button" onClick={() => onSelect(emoji)} className={`text-2xl p-2 rounded-full transition-all duration-200 ${selectedEmoji === emoji ? 'ring-2 ring-yellow-400 bg-slate-600' : 'hover:bg-slate-700'}`}>{emoji}</button>))}<button type="button" onClick={() => onSelect(null)} title="Remove Emoji" className={`text-lg font-bold w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 ${!selectedEmoji ? 'ring-2 ring-red-500 bg-slate-600' : 'hover:bg-slate-700'}`}>✕</button></div>); };
const NotesModal = ({ noteData, onSave, onCancel }) => { const [noteContent, setNoteContent] = useState(noteData.content || ''); const [selectedEmoji, setSelectedEmoji] = useState(noteData.emoji || null); const handleSave = () => { onSave(noteData.date, noteContent, selectedEmoji); }; return (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4 ring-2 ring-yellow-400/50"><h2 className="text-xl font-bold text-white">Notes & Mood for {new Date(noteData.date + 'T00:00:00').toLocaleDateString()}</h2>{noteData.reflection && (<div className="bg-slate-900/50 p-3 rounded-md border-l-4 border-red-500"><p className="text-sm font-bold text-slate-300">End of Day Reflection:</p><p className="text-slate-400 italic">"{noteData.reflection}"</p></div>)}<EmojiSelector selectedEmoji={selectedEmoji} onSelect={setSelectedEmoji} /><textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write your notes for the day..." className="w-full h-40 bg-slate-900 text-white p-3 rounded-md outline-none focus:ring-2 focus:ring-yellow-400 resize-none" /><div className="flex justify-end gap-4"><button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500">Cancel</button><button onClick={handleSave} className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500">Save</button></div></div></div>); };
const TaskIndicatorDots = ({ indicators }) => { if (!indicators) return null; return (<div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">{indicators.high && <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="High Priority"></div>}{indicators.medium && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="Medium Priority"></div>}{indicators.low && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Low Priority"></div>}</div>); };

function Calendar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signOut } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWelcome, setShowWelcome] = useState(location.state?.fromLogin || false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [taskIndicators, setTaskIndicators] = useState({});
    const [noteToEdit, setNoteToEdit] = useState(null);
    const [dailyEmojis, setDailyEmojis] = useState({});
    const [reflectionForDate, setReflectionForDate] = useState(null);

    const calculateProgress = useCallback((boardColumns) => { if (!boardColumns || !Array.isArray(boardColumns)) return 0; const doneTasks = boardColumns.find(c => c.id === 'done')?.tasks.length || 0; const totalTasks = boardColumns.reduce((acc, col) => acc + (col.tasks?.length || 0), 0); if (totalTasks === 0) return 100; return (doneTasks / totalTasks) * 100; }, []);
    const fetchAllBoardsData = useCallback(async () => { if (!user) return; const { data: boardsArray, error: fetchError } = await supabase.from('boards').select('id, columns, emoji').eq('user_id', user.id); if (fetchError) { console.error("Failed to fetch data:", fetchError); setError(fetchError.message); return; } if (boardsArray) { const indicators = {}; const emojis = {}; for (const board of boardsArray) { const date = board.id; if (board.emoji) { emojis[date] = board.emoji; } const columns = board.columns; const priorities = new Set(); if (columns && Array.isArray(columns)) { columns.forEach(column => { if (column.tasks && Array.isArray(column.tasks)) { column.tasks.forEach(task => { priorities.add(task.priority); }); } }); } if (priorities.size > 0) { indicators[date] = { high: priorities.has('High'), medium: priorities.has('Medium'), low: priorities.has('Low') }; } } setTaskIndicators(indicators); setDailyEmojis(emojis); } }, [user]);

    useEffect(() => { const gatekeeperCheck = async () => { if (!user) { navigate('/'); return; } setIsLoading(true); if (location.state?.fromLogin) { const today = new Date(); today.setHours(0, 0, 0, 0); const { data, error: gatekeeperError } = await supabase.from('boards').select('*').eq('user_id', user.id).lt('id', today.toISOString().split('T')[0]).is('end_of_day_reflection', null).order('id', { ascending: false }); if (gatekeeperError) { setError(gatekeeperError.message); } else if (data) { for (const board of data) { const progress = calculateProgress(board.columns); if (progress < 70) { setReflectionForDate(board.id); setIsLoading(false); return; } } } } setShowCalendar(true); await fetchAllBoardsData(); setIsLoading(false); }; gatekeeperCheck(); window.addEventListener('focus', fetchAllBoardsData); return () => window.removeEventListener('focus', fetchAllBoardsData); }, [user, navigate, calculateProgress, location.state?.fromLogin, fetchAllBoardsData]);
    useEffect(() => { if (showWelcome) { const timer = setTimeout(() => { setShowWelcome(false); }, 1200); return () => clearTimeout(timer); } }, [showWelcome]);
    useEffect(() => { const today = new Date(); if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) { setSelectedDay(today.getDate()); } else { setSelectedDay(null); } }, [currentDate]);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const today = new Date();
    const isToday = (day) => (day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear());
    const goToPrevMonth = () => { const newDate = new Date(currentDate); newDate.setMonth(newDate.getMonth() - 1); setCurrentDate(newDate); };
    const goToNextMonth = () => { const newDate = new Date(currentDate); newDate.setMonth(newDate.getMonth() + 1); setCurrentDate(newDate); };
    const goToToday = () => { setCurrentDate(new Date()); };
    const handleDateClick = (day) => { if (!day) return; setSelectedDay(day); const year = currentDate.getFullYear(); const month = String(currentDate.getMonth() + 1).padStart(2, '0'); const dayString = String(day).padStart(2, '0'); const dateString = `${year}-${month}-${dayString}`; navigate(`/board/${dateString}`); };
    const handleSignOut = async () => { await signOut(); navigate('/'); };
    const handleOpenNoteModal = async (e, day) => { e.stopPropagation(); if (!day || !user) return; const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const { data } = await supabase.from('boards').select('notes, emoji, end_of_day_reflection').eq('id', dateString).eq('user_id', user.id).single(); setNoteToEdit({ date: dateString, content: data?.notes || '', emoji: data?.emoji || null, reflection: data?.end_of_day_reflection || '' }); };
    const handleSaveNote = async (date, content, emoji) => { if (!user) return; const { data } = await supabase.from('boards').select('columns, end_of_day_reflection').eq('id', date).eq('user_id', user.id).single(); const { error: saveError } = await supabase.from('boards').upsert({ id: date, user_id: user.id, notes: content, emoji: emoji, columns: data?.columns || createNewBoardData(date, user.id).columns, end_of_day_reflection: data?.end_of_day_reflection || null }, { onConflict: 'id, user_id' }); if (saveError) { setError(saveError.message); } else { setDailyEmojis(prev => ({ ...prev, [date]: emoji })); } setNoteToEdit(null); };
    const handleSaveReflection = async (date, reflectionText) => { if (!user) return; const { data } = await supabase.from('boards').select('columns, notes, emoji').eq('id', date).eq('user_id', user.id).single(); const { error: saveError } = await supabase.from('boards').upsert({ id: date, user_id: user.id, end_of_day_reflection: reflectionText, columns: data?.columns, notes: data?.notes, emoji: data?.emoji }, { onConflict: 'id, user_id' }); if (saveError) { setError(saveError.message); } setReflectionForDate(null); };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const calendarDays = [...Array(getFirstDayOfMonth(year, month)).fill(null), ...Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)];

    if (isLoading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-2xl">Initializing StriveFlow...</div>;
    if (error) return <div className="min-h-screen bg-slate-900 text-red-500 flex items-center justify-center text-2xl text-center p-4">Error: {error}<br /><button onClick={() => window.location.reload()} className="text-sm mt-4 p-2 bg-slate-700 rounded-md">Try Reloading</button></div>;
    if (reflectionForDate) { return <ReflectionModal forDate={reflectionForDate} onSave={handleSaveReflection} />; }
    
    return (
        <div className="relative min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4">
            <button onClick={handleSignOut} className="absolute top-6 right-6 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors z-20">Sign Out</button>
            {showWelcome && <div className="text-center animate-fade-out"><h1 className="text-white font-bold text-8xl">Welcome!</h1></div>}
            {showCalendar && (
                <div className="w-full max-w-3xl">
                    <h1 className="text-center text-4xl font-bold text-white mb-8">Want to take control of your life?<br /> Then take it!</h1>
                    <div className="relative bg-slate-800 border border-slate-700/50 rounded-lg p-6 animate-fade-in shadow-2xl">
                        <div className="flex justify-between items-center mb-4"><button onClick={goToPrevMonth} className="p-2 rounded-full text-white text-2xl font-bold hover:bg-slate-700 transition-colors">←</button><h2 className="text-white text-2xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2><button onClick={goToNextMonth} className="p-2 rounded-full text-white text-2xl font-bold hover:bg-slate-700 transition-colors">→</button></div>
                        <p className="text-center text-slate-400 text-sm mb-6">Click on any date to view or add tasks.</p>
                        <div className="grid grid-cols-7 gap-2 text-center">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-slate-400 font-semibold text-sm py-2">{day}</div>)}
                            {calendarDays.map((day, index) => {
                                const isCurrentMonthDay = day !== null; const isSelected = isCurrentMonthDay && day === selectedDay; const todayHighlight = isToday(day);
                                let dateString = ''; if (isCurrentMonthDay) { dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
                                const indicators = taskIndicators[dateString]; const dayEmoji = dailyEmojis[dateString];
                                return (
                                    <button key={index} onClick={() => handleDateClick(day)} disabled={!isCurrentMonthDay} className={`group relative h-16 flex items-center justify-center rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-800 ${isCurrentMonthDay ? 'cursor-pointer hover:bg-slate-700' : 'text-slate-600 cursor-default'} ${isSelected ? 'bg-blue-600 font-bold' : ''} ${todayHighlight && !isSelected ? 'ring-2 ring-blue-500' : ''} ${!isSelected ? 'text-white' : ''}`}>
                                        {dayEmoji && <span className="absolute top-1 left-1 text-lg">{dayEmoji}</span>}<span>{day}</span><TaskIndicatorDots indicators={indicators} />
                                        {isCurrentMonthDay && (<button onClick={(e) => handleOpenNoteModal(e, day)} className="absolute top-1 right-1 bg-yellow-400 text-black w-5 h-5 text-xs font-bold rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">N</button>)}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={goToToday} className="absolute bottom-6 right-6 px-4 py-2 rounded-lg bg-blue-500 text-white font-bold transition-colors hover:bg-blue-600 shadow-lg">Today</button>
                    </div>
                </div>
            )}
            {noteToEdit && (<NotesModal noteData={noteToEdit} onSave={handleSaveNote} onCancel={() => setNoteToEdit(null)} />)}
        </div>
    );
}

export default Calendar;