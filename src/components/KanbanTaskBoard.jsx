import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '../supabaseClient';

const createNewBoardData = (date) => ({
    id: date,
    columns: [
        { id: 'backlog', title: 'Backlog', tasks: [] },
        { id: 'todo', title: 'To-Do', tasks: [] },
        { id: 'in-progress', title: 'In Progress', tasks: [] },
        { id: 'done', title: 'Done', tasks: [] }
    ]
});

function TaskCard({ task, onCardClick }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onCardClick} className="bg-slate-700 p-3 rounded-md shadow-md mb-3 cursor-grab active:cursor-grabbing group relative">
            <p className="font-semibold text-white pointer-events-none">{task.title}</p>
            <div className="flex justify-between items-center mt-3 pointer-events-none">
                <span className="text-sm text-slate-400">{task.assigneeName}</span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${task.priority === 'High' ? 'bg-red-500 text-white' : ''} ${task.priority === 'Medium' ? 'bg-yellow-500 text-black' : ''} ${task.priority === 'Low' ? 'bg-green-500 text-black' : ''}`}>{task.priority}</span>
            </div>
        </div>
    );
}

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

function KanbanTaskBoard() {
    const { date } = useParams();
    const [columns, setColumns] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [taskToEdit, setTaskToEdit] = useState(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }));

    const saveBoard = useCallback(async (boardData) => {
        const { error } = await supabase.from('boards').upsert(boardData, { onConflict: 'id' });
        if (error) { setError(error.message); }
    }, []);

    useEffect(() => {
        const fetchBoardForDate = async () => {
            if (!date) return;
            setIsLoading(true); setError(null);
            const { data, error } = await supabase.from('boards').select('*').eq('id', date).single();
            if (error && error.code !== 'PGRST116') { setError(error.message); }
            else if (data) { const columnsObject = data.columns.reduce((acc, col) => { acc[col.id] = col; return acc; }, {}); setColumns(columnsObject); }
            else { const newBoard = createNewBoardData(date); await saveBoard(newBoard); const columnsObject = newBoard.columns.reduce((acc, col) => { acc[col.id] = col; return acc; }, {}); setColumns(columnsObject); }
            setIsLoading(false);
        };
        fetchBoardForDate();
    }, [date, saveBoard]);

    const createSaveObject = (updatedColumns) => ({ id: date, columns: Object.values(updatedColumns) });

    const handleDragEnd = (event) => {
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
        saveBoard(createSaveObject(updatedColumns));
    };

    const handleAddTask = (event) => {
        event.preventDefault();
        const { title, priority, assigneeName, column } = event.target.elements;
        const newTask = { id: `task-${Date.now()}`, title: title.value, priority: priority.value, assigneeName: assigneeName.value };
        const targetColumnId = column.value;
        const updatedColumns = { ...columns, [targetColumnId]: { ...columns[targetColumnId], tasks: [...columns[targetColumnId].tasks, newTask] } };
        setColumns(updatedColumns);
        saveBoard(createSaveObject(updatedColumns));
        setIsAddModalOpen(false);
    };

    // --- DEFINITIVE FIX: This function now correctly uses taskToDelete ---
    const handleDeleteTask = () => {
        if (!taskToDelete) return; // Guard clause uses the correct state
        const { task, columnId } = taskToDelete; // Destructure from the correct state
        const updatedColumns = { ...columns };
        updatedColumns[columnId].tasks = updatedColumns[columnId].tasks.filter(t => t.id !== task.id);
        setColumns(updatedColumns);
        saveBoard(createSaveObject(updatedColumns));
        setTaskToDelete(null); // Close the confirmation modal
        setTaskToEdit(null);   // Also close the edit modal behind it
    };

    const handleEditTask = (event) => {
        event.preventDefault();
        if (!taskToEdit) return;
        const { title, priority, assigneeName } = event.target.elements;
        const { task, columnId } = taskToEdit;
        const updatedTask = { ...task, title: title.value, priority: priority.value, assigneeName: assigneeName.value };
        const updatedColumns = { ...columns };
        const taskIndex = updatedColumns[columnId].tasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) { updatedColumns[columnId].tasks[taskIndex] = updatedTask; }
        setColumns(updatedColumns);
        saveBoard(createSaveObject(updatedColumns));
        setTaskToEdit(null);
    };

    if (isLoading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-2xl">Loading Board for {date}...</div>;
    if (error) return <div className="min-h-screen bg-slate-900 text-red-500 flex items-center justify-center text-2xl text-center p-4">Error: {error}</div>;

    let formattedDate = 'Invalid Date';
    if (date) { const dateObj = new Date(`${date}T00:00:00`); formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="min-h-screen w-full bg-slate-900 flex flex-col p-4 md:p-8">
                <div className="mb-8">
                    <Link to="/calendar" className="text-blue-400 hover:text-blue-300 transition-colors mb-2 block">← Back to Calendar</Link>
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-white">Your tasks for {formattedDate}</h1>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-green-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">+ Add Task</button>
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.values(columns).length > 0 ? (Object.values(columns).map(column => (<Column key={column.id} column={column} openEditModal={(task, colId) => setTaskToEdit({ task, columnId: colId })} />))) : (<p className="text-slate-400 col-span-4">No columns found for this board.</p>)}
                </div>
            </div>

            {isAddModalOpen && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><form onSubmit={handleAddTask} className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md space-y-4"><h2 className="text-2xl font-bold text-white">Add New Task</h2><div><label className="block text-slate-400 mb-1">Title</label><input name="title" required className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-slate-400 mb-1">Assignee Name</label><input name="assigneeName" required className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-slate-400 mb-1">Priority</label><select name="priority" defaultValue="Medium" className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500"><option>Low</option><option>Medium</option><option>High</option></select></div><div><label className="block text-slate-400 mb-1">Column</label><select name="column" defaultValue="todo" className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500">{Object.values(columns).map(col => <option key={col.id} value={col.id}>{col.title}</option>)}</select></div><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600">Add Task</button></div></form></div>)}
            
            {taskToDelete && (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md text-center ring-2 ring-red-500"><h2 className="text-2xl font-bold text-white">Delete Task?</h2><p className="text-slate-400 my-4">Are you sure you want to delete "{taskToDelete.task.title}"? This action cannot be undone.</p><div className="flex justify-center gap-4 pt-4"><button onClick={() => setTaskToDelete(null)} className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500">Cancel</button><button onClick={handleDeleteTask} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500">Delete</button></div></div></div>)}

            {taskToEdit && !taskToDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleEditTask} className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md space-y-4">
                        <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-bold text-white">Edit Task</h2>
                            <button type="button" onClick={() => setTaskToDelete(taskToEdit)} className="bg-red-600/50 text-white hover:bg-red-600 font-bold px-3 py-1 rounded-lg transition-colors">Delete</button>
                        </div>
                        <div><label className="block text-slate-400 mb-1">Title</label><input name="title" required defaultValue={taskToEdit.task.title} className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="block text-slate-400 mb-1">Assignee Name</label><input name="assigneeName" required defaultValue={taskToEdit.task.assigneeName} className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="block text-slate-400 mb-1">Priority</label><select name="priority" defaultValue={taskToEdit.task.priority} className="w-full bg-slate-700 text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500"><option>Low</option><option>Medium</option><option>High</option></select></div>
                        <div className="flex justify-end gap-4 pt-4"><button type="button" onClick={() => setTaskToEdit(null)} className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500">Save Changes</button></div>
                    </form>
                </div>
            )}
        </DndContext>
    );
}

export default KanbanTaskBoard;