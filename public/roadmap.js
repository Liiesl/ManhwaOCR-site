/**
 * roadmap.js
 * Fetches and parses a todo.md file from a GitHub repository to dynamically populate the Kanban board,
 * including support for nested sub-tasks.
 */

// The URL to the raw todo.md file in the GitHub repository.
const GITHUB_TODO_URL = 'https://raw.githubusercontent.com/Liiesl/EasyScanlate/main/todo.md';

// Maps markdown headers to CSS tag classes.
const tagMap = {
    'addition': 'new',
    'fixes': 'fixed',
    'modification': 'improved'
};

// Maps markdown sections to DOM element IDs.
const columnMap = {
    'done': 'col-done',
    'currently in progress': 'col-in-progress',
    'not yet started': 'col-not-started'
};

/**
 * Calculates the indentation level of a string.
 * @param {string} str The string to measure.
 * @returns {number} The number of leading spaces.
 */
const getIndentation = (str) => {
    const match = str.match(/^\s*/);
    return match ? match[0].length : 0;
};

/**
 * Parses markdown text with nested lists into a structured object.
 * @param {string} text The raw markdown content.
 * @returns {object} An object containing arrays of tasks for each column.
 */
function parseMarkdown(text) {
    const lines = text.split('\n');
    const board = {
        'col-done': [],
        'col-in-progress': [],
        'col-not-started': []
    };

    let currentColumn = null;
    let currentTag = null;
    let lastParentTask = null; // Keep track of the last top-level item

    lines.forEach(line => {
        if (!line.trim()) return; // Skip empty lines

        const indentation = getIndentation(line);
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('## ')) {
            const columnKey = trimmedLine.substring(3).split('(')[0].trim().toLowerCase();
            currentColumn = columnMap[columnKey] || null;
            lastParentTask = null; // Reset parent on new column
            return;
        }

        if (trimmedLine.startsWith('#### ')) {
            const tagKey = trimmedLine.substring(5).trim().toLowerCase();
            currentTag = tagMap[tagKey] || null;
            lastParentTask = null; // Reset parent on new tag section
            return;
        }

        if (trimmedLine.startsWith('- ') && currentColumn) {
            const taskText = trimmedLine.substring(2).trim();
            if (!taskText) return;

            // If indentation is 0 (or low), it's a new parent task.
            if (indentation < 4) { // Assuming base indentation is 2 spaces for a `-`
                const newTask = {
                    text: taskText,
                    tag: currentColumn === 'col-in-progress' ? null : currentTag,
                    children: []
                };
                board[currentColumn].push(newTask);
                lastParentTask = newTask; // This is the new parent
            }
            // If it's indented, it's a child of the last parent task.
            else if (lastParentTask) {
                lastParentTask.children.push({ text: taskText });
            }
        }
    });

    return board;
}


/**
 * Renders the parsed Kanban data, including sub-tasks, into the DOM.
 * @param {object} boardData The structured object from parseMarkdown.
 */
function renderBoard(boardData) {
    Object.keys(boardData).forEach(columnId => {
        const columnElement = document.getElementById(columnId);
        if (!columnElement) return;

        columnElement.innerHTML = ''; // Clear loading message

        const tasks = boardData[columnId];
        if (tasks.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'Nothing here yet!';
            emptyMessage.classList.add('empty-message');
            columnElement.appendChild(emptyMessage);
        } else {
            tasks.forEach(task => {
                const card = document.createElement('div');
                card.className = 'kanban-card';

                let cardHTML = '';
                if (task.tag) {
                    cardHTML += `<span class="tag ${task.tag}">${task.tag}</span>`;
                }
                cardHTML += `<p>${task.text}</p>`;

                // If there are children, render them as a sub-list
                if (task.children && task.children.length > 0) {
                    cardHTML += '<ul class="subtask-list">';
                    task.children.forEach(child => {
                        cardHTML += `<li>${child.text}</li>`;
                    });
                    cardHTML += '</ul>';
                }

                card.innerHTML = cardHTML;
                columnElement.appendChild(card);
            });
        }
    });
}


/**
 * Main function to fetch data and initialize the board.
 */
async function initializeRoadmap() {
    try {
        const response = await fetch(GITHUB_TODO_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const markdownText = await response.text();
        const boardData = parseMarkdown(markdownText);
        renderBoard(boardData);
    } catch (error) {
        console.error('Error fetching or rendering roadmap:', error);
        const kanbanContainer = document.querySelector('.kanban-board');
        if (kanbanContainer) {
            kanbanContainer.innerHTML = '<p class="error-message">Could not load the roadmap from GitHub. Please try again later.</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', initializeRoadmap);