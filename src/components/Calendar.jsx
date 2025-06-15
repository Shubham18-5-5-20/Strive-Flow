import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// --- Helper component to display the colored dots (Unchanged) ---
const TaskIndicatorDots = ({ indicators }) => {
    if (!indicators) return null;
    return (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
            {indicators.high && <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="High Priority"></div>}
            {indicators.medium && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="Medium Priority"></div>}
            {indicators.low && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Low Priority"></div>}
        </div>
    );
};

function Calendar() {
    const navigate = useNavigate();
    const location = useLocation();

    // State management for UI and navigation (Unchanged)
    const [showWelcome, setShowWelcome] = useState(location.state?.fromLogin || false);
    const [showCalendar, setShowCalendar] = useState(!showWelcome);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [taskIndicators, setTaskIndicators] = useState({});

    // All useEffect hooks for welcome message, selected day, and data fetching (Unchanged)
    useEffect(() => {
        if (showWelcome) {
            const timer = setTimeout(() => { setShowWelcome(false); setShowCalendar(true); }, 1200);
            return () => clearTimeout(timer);
        }
    }, [showWelcome]);

    useEffect(() => {
        const today = new Date();
        if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
            setSelectedDay(today.getDate());
        } else {
            setSelectedDay(null);
        }
    }, [currentDate]);

    useEffect(() => {
        const fetchAllBoardsData = async () => {
            const { data: boardsArray, error } = await supabase.from('boards').select('id, columns');
            if (error) { console.error("Failed to fetch task indicators from Supabase:", error); return; }
            if (boardsArray) {
                const indicators = {};
                for (const board of boardsArray) {
                    const date = board.id; const columns = board.columns; const priorities = new Set();
                    if (columns && Array.isArray(columns)) {
                        columns.forEach(column => {
                            if (column.tasks && Array.isArray(column.tasks)) {
                                column.tasks.forEach(task => { priorities.add(task.priority); });
                            }
                        });
                    }
                    if (priorities.size > 0) {
                        indicators[date] = { high: priorities.has('High'), medium: priorities.has('Medium'), low: priorities.has('Low') };
                    }
                }
                setTaskIndicators(indicators);
            }
        };
        fetchAllBoardsData();
        window.addEventListener('focus', fetchAllBoardsData);
        return () => { window.removeEventListener('focus', fetchAllBoardsData); };
    }, []);

    // --- All Helper Functions (Unchanged) ---
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const today = new Date();
    const isToday = (day) => (day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear());
    const goToPrevMonth = () => { const newDate = new Date(currentDate); newDate.setMonth(newDate.getMonth() - 1); setCurrentDate(newDate); };
    const goToNextMonth = () => { const newDate = new Date(currentDate); newDate.setMonth(newDate.getMonth() + 1); setCurrentDate(newDate); };
    const goToToday = () => { setCurrentDate(new Date()); };
    const handleDateClick = (day) => {
        if (!day) return;
        setSelectedDay(day);
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayString = String(day).padStart(2, '0');
        const dateString = `${year}-${month}-${dayString}`;
        navigate(`/board/${dateString}`);
    };

    // --- NEW: Sign Out Handler ---
    const handleSignOut = () => {
        // In a real app with full authentication, you would also call supabase.auth.signOut() here.
        // For our MVP, simply navigating to the root page is perfect.
        navigate('/');
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const calendarDays = [
        ...Array(getFirstDayOfMonth(year, month)).fill(null),
        ...Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)
    ];

    return (
        // --- FIX: Add 'relative' to the main container to position the sign-out button correctly ---
        <div className="relative min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4">
            
            {/* --- NEW: Sign Out Button --- */}
            <button
                onClick={handleSignOut}
                className="absolute top-6 right-6 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors z-10"
                aria-label="Sign Out"
            >
                Sign Out
            </button>

            {showWelcome && <div className="text-center animate-fade-out"><h1 className="text-white font-bold text-8xl">Welcome!</h1></div>}
            
            {showCalendar && (
                <div className="relative bg-slate-800 border border-slate-700/50 rounded-lg p-6 w-full max-w-3xl animate-fade-in shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={goToPrevMonth} className="p-2 rounded-full text-white text-2xl font-bold hover:bg-slate-700 transition-colors" aria-label="Previous month">←</button>
                        <h2 className="text-white text-2xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <button onClick={goToNextMonth} className="p-2 rounded-full text-white text-2xl font-bold hover:bg-slate-700 transition-colors" aria-label="Next month">→</button>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-slate-400 font-semibold text-sm py-2">{day}</div>)}
                        {calendarDays.map((day, index) => {
                            const isCurrentMonthDay = day !== null;
                            const isSelected = isCurrentMonthDay && day === selectedDay;
                            const todayHighlight = isToday(day);
                            let dateStringForIndicators = '';
                            if (isCurrentMonthDay) {
                                const monthString = String(month + 1).padStart(2, '0');
                                const dayString = String(day).padStart(2, '0');
                                dateStringForIndicators = `${year}-${monthString}-${dayString}`;
                            }
                            const indicators = taskIndicators[dateStringForIndicators];
                            return (
                                <button key={index} onClick={() => handleDateClick(day)} disabled={!isCurrentMonthDay} className={`relative h-16 flex items-center justify-center rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-800 ${isCurrentMonthDay ? 'cursor-pointer hover:bg-slate-700' : 'text-slate-600 cursor-default'} ${isSelected ? 'bg-blue-600 font-bold' : ''} ${todayHighlight && !isSelected ? 'ring-2 ring-blue-500' : ''} ${!isSelected ? 'text-white' : ''}`}>
                                    {day}
                                    <TaskIndicatorDots indicators={indicators} />
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={goToToday} className="absolute bottom-6 right-6 px-4 py-2 rounded-lg bg-blue-500 text-white font-bold transition-colors hover:bg-blue-600 shadow-lg" aria-label="Go to today">Today</button>
                </div>
            )}
        </div>
    );
}

export default Calendar;