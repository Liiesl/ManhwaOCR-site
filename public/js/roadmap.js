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

// Display labels match releases.html (New / Changed / Fixed).
const tagLabelMap = {
    'new': 'New',
    'improved': 'Changed',
    'fixed': 'Fixed'
};

const emptyCopy = {
    'col-not-started': '<strong>Nothing queued.</strong>New tasks will appear here.',
    'col-in-progress': '<strong>Nothing active.</strong>Check back soon.',
    'col-done': '<strong>Nothing shipped yet.</strong>Completed work lands in Release Notes.'
};

// Junk single-word bullets from todo.md (e.g. a stray "add") carry no meaning.
const JUNK_TASKS = new Set(['add', '-', '—', '–']);

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isMeaningfulTask(text) {
    const cleaned = text.trim().toLowerCase().replace(/[:.\s]+$/, '');
    if (!cleaned || cleaned.length < 3) return false;
    return !JUNK_TASKS.has(cleaned);
}

// Maps markdown sections to DOM element IDs.
const columnMap = {
    'done': 'col-done',
    'currently in progress': 'col-in-progress',
    'not yet started': 'col-not-started'
};

/**
 * Calculates the indentation level of a string in spaces (tabs = 2 spaces).
 * @param {string} str The string to measure.
 * @returns {number} The number of leading spaces.
 */
const getIndentation = (str) => {
    const match = str.match(/^[ \t]*/);
    if (!match) return 0;
    return match[0].replace(/\t/g, '  ').length;
};

/**
 * Parses markdown text with arbitrarily nested lists into a tree.
 * Level = floor(indent / 2): 0 = card, 1+ = nested subtasks.
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
    /** Stack of last node per nesting level within the current column+tag group. */
    let stack = [];

    const resetGroup = () => { stack = []; };

    lines.forEach(line => {
        if (!line.trim()) return; // Skip empty lines

        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('## ')) {
            const columnKey = trimmedLine.substring(3).split('(')[0].trim().toLowerCase();
            currentColumn = columnMap[columnKey] || null;
            resetGroup();
            return;
        }

        if (trimmedLine.startsWith('#### ')) {
            const tagKey = trimmedLine.substring(5).trim().toLowerCase();
            currentTag = tagMap[tagKey] || null;
            resetGroup();
            return;
        }

        if (!currentColumn) return;

        // Support "-", "*", "+" bullets.
        const bulletMatch = line.replace(/\t/g, '  ').match(/^(\s*)[-*+]\s+(.*)$/);
        if (!bulletMatch) return;
        const taskText = (bulletMatch[2] || '').trim();
        if (!taskText || !isMeaningfulTask(taskText)) return;

        const indent = bulletMatch[1].length;
        const level = Math.floor(indent / 2);

        const node = {
            text: taskText,
            tag: currentTag,
            children: []
        };

        if (level <= 0) {
            board[currentColumn].push(node);
            stack = [node];
            return;
        }

        const parent = stack[level - 1];
        if (parent) {
            parent.children.push(node);
            stack[level] = node;
            stack.length = level + 1;
        } else {
            // Orphaned indent (no parent at level-1): treat as top-level
            // so nothing from the real todo.md is silently dropped.
            board[currentColumn].push(node);
            stack = [node];
        }
    });

    return board;
}


/**
 * Recursively renders a nested task tree into <ul>/<li> HTML.
 * @param {Array} nodes Child nodes to render.
 * @returns {string} HTML string (empty when no meaningful nodes).
 */
function renderSubtasks(nodes) {
    const valid = (nodes || []).filter(child => child && isMeaningfulTask(child.text || ''));
    if (valid.length === 0) return '';
    let html = '<ul class="subtask-list">';
    valid.forEach(child => {
        html += `<li><span>${escapeHtml(child.text)}</span>${renderSubtasks(child.children)}</li>`;
    });
    html += '</ul>';
    return html;
}

/**
 * Returns the inner scroll container for a kanban column
 * (falls back to the column itself for forward-compat).
 */
function columnScroller(columnElement) {
    return columnElement.querySelector('.column-scrollarea') || columnElement;
}

function updateColumnScrollbar(columnElement) {
    const scroller = columnScroller(columnElement);
    const track = columnElement.querySelector(':scope > .column-scrolltrack');
    if (!track || !scroller) return;
    const thumb = track.firstElementChild;
    const scrollHeight = scroller.scrollHeight;
    const clientHeight = scroller.clientHeight;
    const canScroll = scrollHeight > clientHeight + 1;
    columnElement.classList.toggle('has-scroll', canScroll);
    if (!canScroll || !thumb) return;
    const trackH = track.clientHeight;
    const thumbH = Math.max(40, Math.min(trackH, (clientHeight / scrollHeight) * trackH));
    const maxTop = Math.max(0, trackH - thumbH);
    const range = scrollHeight - clientHeight;
    const ratio = range > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / range)) : 0;
    thumb.style.height = thumbH + 'px';
    thumb.style.transform = 'translateY(' + (ratio * maxTop).toFixed(1) + 'px)';
}

function updateAllColumnScrollbars() {
    Object.values(columnMap).forEach(colId => {
        const col = document.getElementById(colId);
        if (col) updateColumnScrollbar(col);
    });
}

function setupColumnScrollbars() {
    Object.values(columnMap).forEach(colId => {
        const col = document.getElementById(colId);
        if (!col || col.querySelector(':scope > .column-scrolltrack')) return;
        const track = document.createElement('div');
        track.className = 'column-scrolltrack';
        track.setAttribute('aria-hidden', 'true');
        track.innerHTML = '<div class="column-scrollthumb"></div>';
        col.appendChild(track);
    });

    Object.values(columnMap).forEach(colId => {
        const col = document.getElementById(colId);
        if (!col || col.dataset.scrollInit) return;
        col.dataset.scrollInit = '1';
        const scroller = columnScroller(col);
        const track = col.querySelector(':scope > .column-scrolltrack');
        const thumb = track && track.firstElementChild;
        scroller.addEventListener('scroll', () => updateColumnScrollbar(col), { passive: true });
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => updateColumnScrollbar(col)).observe(scroller);
        }
        if (thumb) {
            // Drag thumb to scroll.
            thumb.addEventListener('pointerdown', e => {
                e.preventDefault();
                try { thumb.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                const startY = e.clientY;
                const startTop = scroller.scrollTop;
                const pxToScroll = (scroller.scrollHeight - scroller.clientHeight) /
                    Math.max(1, track.clientHeight - thumb.offsetHeight);
                const move = ev => { scroller.scrollTop = startTop + (ev.clientY - startY) * pxToScroll; };
                const up = () => {
                    thumb.removeEventListener('pointermove', move);
                    thumb.removeEventListener('pointerup', up);
                    thumb.removeEventListener('pointercancel', up);
                };
                thumb.addEventListener('pointermove', move);
                thumb.addEventListener('pointerup', up);
                thumb.addEventListener('pointercancel', up);
            });
            // Click track to jump.
            track.addEventListener('pointerdown', e => {
                if (e.target !== track) return;
                const rect = track.getBoundingClientRect();
                if (rect.height <= 0) return;
                const ratio = (e.clientY - rect.top) / rect.height;
                scroller.scrollTop = ratio * (scroller.scrollHeight - scroller.clientHeight);
            });
        }
    });
    updateAllColumnScrollbars();
}

/**
 * Renders the parsed Kanban data, including nested sub-tasks, into the DOM.
 * @param {object} boardData The structured object from parseMarkdown.
 */
function renderBoard(boardData) {
    Object.keys(boardData).forEach(columnId => {
        const columnElement = document.getElementById(columnId);
        if (!columnElement) return;
        const scroller = columnScroller(columnElement);

        scroller.innerHTML = ''; // Clear loading message

        const tasks = boardData[columnId];
        if (tasks.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.innerHTML = emptyCopy[columnId] || 'Nothing here yet!';
            emptyMessage.classList.add('empty-message');
            scroller.appendChild(emptyMessage);
        } else {
            tasks.forEach(task => {
                const card = document.createElement('div');
                card.className = 'kanban-card';

                const safeText = escapeHtml(task.text);
                let cardHTML = '';
                if (task.tag) {
                    const label = tagLabelMap[task.tag] || task.tag;
                    cardHTML += `<div class="kanban-card-top"><span class="tag ${escapeHtml(task.tag)}">${escapeHtml(label)}</span></div>`;
                }
                cardHTML += `<p class="kanban-card-title">${safeText}</p>`;
                cardHTML += renderSubtasks(task.children);

                card.innerHTML = cardHTML;
                scroller.appendChild(card);
            });
        }
    });
    updateAllColumnScrollbars();
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
            // Keep column structure, show a helpful error with a fallback link.
            Object.values(columnMap).forEach(colId => {
                const col = document.getElementById(colId);
                if (col) columnScroller(col).innerHTML = '<p class="error-message">Couldn\'t load todo.md. <a href="https://github.com/Liiesl/EasyScanlate/blob/main/todo.md" target="_blank" rel="noopener noreferrer">View on GitHub</a></p>';
            });
            updateAllColumnScrollbars();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupColumnScrollbars();
    initializeRoadmap();
    window.addEventListener('resize', updateAllColumnScrollbars);
});
