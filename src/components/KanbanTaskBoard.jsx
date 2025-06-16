import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DndContext, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { createNewBoardData } from '../utils/boardUtils';

// --- Presentational Component: Progress Meter ---
const ProgressMeter = ({ percentage }) => {
    const roundedPercentage = Math.round(percentage);
    let meterColorClass = roundedPercentage < 33 ? 'bg-red-500' : roundedPercentage < 70 ? 'bg-yellow-400' : 'bg-green-500';
    return (
        <div className="relative group">
            <div className="w-full bg-slate-700 rounded-full h-4 my-4 ring-2 ring-slate-600">
                <div className={`${meterColorClass} h-full rounded-full text-xs text-black/80 text-center p-0.5 leading-none transition-all duration-500 font-bold`} style={{ width: `${roundedPercentage}%` }}>
                    {roundedPercentage > 10 ? `${roundedPercentage}%` : ''}
                </div>
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1 bg-slate-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                {roundedPercentage}% Complete
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900"></div>
            </div>
        </div>
    );
};

// --- Presentational Component: Task Card ---
function TaskCard({ task, onCardClick }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onCardClick} className="bg-slate-700 p-3 rounded-md shadow-md mb-3 cursor-grab active:cursor-grabbing">
            <span className="text-xs font-semibold text-cyan-400 pointer-events-none">{task.projectName || 'General'}</span>
            <p className="font-semibold text-white pointer-events-none my-1">{task.title}</p>
            <div className="flex justify-between items-center mt-2 pointer-events-none">
                <span className="text-sm text-slate-400">{task.assigneeName}</span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${task.priority === 'High' ? 'bg-red-500 text-white' : ''} ${task.priority === 'Medium' ? 'bg-yellow-500 text-black' : ''} ${task.priority === 'Low' ? 'bg-green-500 text-black' : ''}`}>{task.priority}</span>
            </div>
        </div>
    );
}

// --- Presentational Component: Column ---
function Column({ column, openEditModal }) {
    const { setNodeRef } = useDroppable({ id: column.id });
    return (
        <div ref={setNodeRef} className="bg-slate-800 rounded-lg p-4 flex flex-col">
            <h2 className="text-white font-bold text-lg mb-4 flex justify-between"><span>{column.title}</span><span className="text-slate-400">{column.tasks.length}</span></h2>
            <div className="flex-1 space-y-1 overflow-y-auto pr-2">
                {column.tasks.map(task => (<TaskCard key={task.id} task={task} onCardClick={() => openEditModal(task, column.id)} />))}
            </div>
        </div>
    );
}

// --- Main Board Component with all logic and modals ---
function KanbanTaskBoard() {
    const { date } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [columns, setColumns] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [progress, setProgress] = useState(0);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }));

    const calculateProgress = useCallback((currentColumns) => {
        const doneTasks = currentColumns.done?.tasks.length || 0;
        const totalTasks = Object.values(currentColumns).reduce((acc, col) => acc + col.tasks.length, 0);
        if (totalTasks === 0) return 100;
        return (doneTasks / totalTasks) * 100;
    }, []);
    
    const saveBoard = useCallback(async (boardData) => {
        if (!user) return false;
        const { error: saveError } = await supabase.from('boards').upsert(boardData, { onConflict: 'id, user_id' });
        if (saveError) { setError(saveError.message); return false; }
        setError(null);
        return true;
    }, [user]);

    useEffect(() => {
        const fetchBoardForDate = async () => {
            if (!date || !user) return;
            setIsLoading(true); setError(null);
            const { data, error: fetchError } = await supabase.from('boards').select('*').eq('id', date).eq('user_id', user.id).single();
            if (fetchError && fetchError.code !== 'PGRST116') { setError(fetchError.message); }
            else if (data) {
                const columnsObject = data.columns.reduce((acc, col) => { acc[col.id] = col; return acc; }, {});
                setColumns(columnsObject);
                setProgress(calculateProgress(columnsObject));
            } else {
                const newBoard = createNewBoardData(date, user.id);
                const success = await saveBoard(newBoard);
                if (success) {
                    const columnsObject = newBoard.columns.reduce((acc, col) => { acc[col.id] = col; return acc; }, {});
                    setColumns(columnsObject);
                    setProgress(calculateProgress(columnsObject));
                }
            }
            setIsLoading(false);
        };
        fetchBoardForDate();
    }, [date, user, saveBoard, calculateProgress]);

    useEffect(() => { if (!user) { navigate('/'); } }, [user, navigate]);

    const createSaveObject = (updatedColumns) => ({ id: date, user_id: user.id, columns: Object.values(updatedColumns) });

    const handleDragEnd = async (event) => {
        const { over, active } = event;
        if (!over) return;
        let sourceColumnId = null;
        for (const colId in columns) { if (columns[colId].tasks.some(t => t.id === active.id)) { sourceColumnId = colId; break; } }
        const destColumnId = over.id;
        if (!sourceColumnId || sourceColumnId === destColumnId) return;
        const updatedColumns = { ...columns };
        const sourceTasks = updatedColumns[sourceColumnId].tasks;
        const taskIndex = sourceTasks.findIndex(t => t.id === active.id);
        const [movedTask] = sourceTasks.splice(taskIndex, 1);
        updatedColumns[destColumnId].tasks.push(movedTask);
        setColumns(updatedColumns);
        setProgress(calculateProgress(updatedColumns));
        await saveBoard(createSaveObject(updatedColumns));
    };

    const handleAddTask = async (event) => {
        event.preventDefault();
        const { title, priority, assigneeName, column, projectName } = event.target.elements;
        const newTask = { id: `task-${Date.now()}`, title: title.value, priority: priority.value, assigneeName: assigneeName.value, projectName: projectName.value };
        const targetColumnId = column.value;
        const updatedColumns = { ...columns, [targetColumnId]: { ...columns[targetColumnId], tasks: [...columns[targetColumnId].tasks, newTask] } };
        const success = await saveBoard(createSaveObject(updatedColumns));
        if (success) {
            setColumns(updatedColumns);
            setProgress(calculateProgress(updatedColumns));
            setIsAddModalOpen(false);
        }
    };

    const handleDeleteTask = async () => {
        if (!taskToEdit) return;
        const { task, columnId } = taskToEdit;
        const updatedColumns = { ...columns };
        updatedColumns[columnId].tasks = updatedColumns[columnId].tasks.filter(t => t.id !== task.id);
        const success = await saveBoard(createSaveObject(updatedColumns));
        if (success) {
            setColumns(updatedColumns);
            setProgress(calculateProgress(updatedColumns));
            setTaskToEdit(null);
            setTaskToDelete(null);
        }
    };

    const handleEditTask = async (event) => {
        event.preventDefault();
        if (!taskToEdit) return;
        const { title, priority, assigneeName, projectName } = event.target.elements;
        const { task, columnId } = taskToEdit;
        const updatedTask = { ...task, title: title.value, priority: priority.value, assigneeName: assigneeName.value, projectName: projectName.value };
        const updatedColumns = { ...columns };
        const taskIndex = updatedColumns[columnId].tasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) { updatedColumns[columnId].tasks[taskIndex] = updatedTask; }
        const success = await saveBoard(createSaveObject(updatedColumns));
        if (success) {
            setColumns(updatedColumns);
            setTaskToEdit(null);
        }
    };

    if (isLoading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-2xl">Loading Board for {date}...</div>;
    if (error) return <div className="min-h-screen bg-slate-900 text-red-500 flex items-center justify-center text-2xl text-center p-4">Error: {error}<br /><button onClick={() => window.location.reload()} className="text-sm mt-4 p-2 bg-slate-700 rounded-md">Try Reloading</button></div>;

    let formattedDate = 'Invalid Date';
    if (date) { const dateObj = new Date(`${date}T00:00:00`); formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="min-h-screen w-full bg-slate-900 flex flex-col p-4 md:p-8">
                <div className="mb-6">
                    <Link to="/calendar" className="text-blue-400 hover:text-blue-300 transition-colors mb-2 block">← Back to Calendar</Link>
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-white">Your tasks for {formattedDate}</h1>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-green-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">+ Add Task</button>
                    </div>
                    <ProgressMeter percentage={progress} />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.values(columns).length > 0 ? (Object.values(columns).map(column => (<Column key={column.id} column={column} openEditModal={(task, colId) => setTaskToEdit({ task, columnId: colId })} />))) : (<p className="text-slate-400 col-span-4">No columns found for this board.</p>)}
                </div>
            </div>
            {isAddModalOpen && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><form onSubmit={handleAddTask} className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md space-y-4"><h2 className="text-2xl font-bold text-white">Add New Task</h2><div><label className="block text-slate-400 mb-1">Project Name</label><input name="projectName" required className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-slate-400 mb-1">Task Title</label><input name="title" required className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-slate-400 mb-1">Assignee Name</label><input name="assigneeName" required className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-slate-400 mb-1">Priority</label><select name="priority" defaultValue="Medium" className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500"><option>Low</option><option>Medium</option><option>High</option></select></div><div><label className="block text-slate-400 mb-1">Column</label><select name="column" defaultValue="todo" className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500">{Object.values(columns).map(col => <option key={col.id} value={col.id}>{col.title}</option>)}</select></div><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600">Add Task</button></div></form></div>)}
            {taskToEdit && !taskToDelete && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><form onSubmit={handleEditTask} className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md space-y-4"><div className="flex justify-between items-start"><h2 className="text-2xl font-bold text-white">Edit Task</h2><button type="button" onClick={() => setTaskToDelete(taskToEdit)} className="bg-red-600/50 text-white hover:bg-red-600 font-bold px-3 py-1 rounded-lg transition-colors">Delete</button></div><div><label className="block text-slate-400 mb-1">Project Name</label><input name="projectName" required defaultValue={taskToEdit.task.projectName || ''} className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-slate-400 mb-1">Task Title</label><input name="title" required defaultValue={taskToEdit.task.title} className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-slate-400 mb-1">Assignee Name</label><input name="assigneeName" required defaultValue={taskToEdit.task.assigneeName} className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-slate-400 mb-1">Priority</label><select name="priority" defaultValue={taskToEdit.task.priority} className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500"><option>Low</option><option>Medium</option><option>High</option></select></div><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={() => setTaskToEdit(null)} className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500">Save Changes</button></div></form></div>)}
            {taskToDelete && (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md text-center ring-2 ring-red-500"><h2 className="text-2xl font-bold text-white">Delete Task?</h2><p className="text-slate-400 my-4">Are you sure you want to delete "{taskToDelete.task.title}"? This action cannot be undone.</p><div className="flex justify-center gap-4 pt-4"><button onClick={() => setTaskToDelete(null)} className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500">Cancel</button><button onClick={handleDeleteTask} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500">Delete</button></div></div></div>)}
        </DndContext>
    );
}

export default KanbanTaskBoard;