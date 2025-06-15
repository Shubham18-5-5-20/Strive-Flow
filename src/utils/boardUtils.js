// src/utils/boardUtils.js
export const createNewBoardData = (date) => ({
    id: date,
    columns: [
        { id: 'backlog', title: 'Backlog', tasks: [] },
        { id: 'todo', title: 'To-Do', tasks: [] },
        { id: 'in-progress', title: 'In Progress', tasks: [] },
        { id: 'done', title: 'Done', tasks: [] }
    ],
    notes: null,
    emoji: null,
    end_of_day_reflection: null
});