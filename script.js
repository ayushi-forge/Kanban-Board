// ===== KANBAN BOARD APPLICATION =====
// Advanced implementation with drag & drop, local storage, and analytics

// App State
const state = {
    tasks: JSON.parse(localStorage.getItem('kanbanTasks')) || [],
    currentTaskId: null,
    isEditing: false,
    theme: localStorage.getItem('theme') || 'light',
    lastSaved: new Date()
};

// DOM Elements
const elements = {
    kanbanBoard: document.getElementById('kanbanBoard'),
    taskModal: document.getElementById('taskModal'),
    statsModal: document.getElementById('statsModal'),
    taskForm: document.getElementById('taskForm'),
    searchInput: document.getElementById('searchTasks'),
    filterStatus: document.getElementById('filterStatus'),
    filterPriority: document.getElementById('filterPriority'),
    statsBtn: document.getElementById('statsBtn'),
    closeStats: document.getElementById('closeStats'),
    toggleTheme: document.getElementById('toggleTheme')
};

// Initialize Charts
let statusChart, priorityChart;

// Column Configuration
const columns = [
    { id: 'todo', title: 'To Do', icon: 'fa-circle', color: 'todo' },
    { id: 'progress', title: 'In Progress', icon: 'fa-spinner', color: 'progress' },
    { id: 'review', title: 'In Review', icon: 'fa-eye', color: 'review' },
    { id: 'done', title: 'Done', icon: 'fa-check-circle', color: 'done' }
];

// Priority Configuration
const priorities = {
    low: { label: 'Low', color: 'low' },
    medium: { label: 'Medium', color: 'medium' },
    high: { label: 'High', color: 'high' },
    critical: { label: 'Critical', color: 'critical' }
};

// ===== INITIALIZATION =====
function init() {
    applyTheme();
    renderColumns();
    renderTasks();
    updateStats();
    setupEventListeners();
    loadSampleDataIfEmpty();
    startAutoSave();
}

// ===== THEME MANAGEMENT =====
function applyTheme() {
    if (state.theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('#toggleTheme i').className = 'fas fa-sun';
    } else {
        document.body.classList.remove('dark-theme');
        document.querySelector('#toggleTheme i').className = 'fas fa-moon';
    }
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    applyTheme();
    saveState();
}

// ===== COLUMN RENDERING =====
function renderColumns() {
    elements.kanbanBoard.innerHTML = '';
    
    columns.forEach(column => {
        const columnEl = document.createElement('div');
        columnEl.className = `kanban-column ${column.color}`;
        columnEl.dataset.status = column.id;
        
        columnEl.innerHTML = `
            <div class="column-header">
                <div class="column-title">
                    <i class="fas ${column.icon}"></i>
                    <h2>${column.title}</h2>
                    <span class="column-count" id="count-${column.id}">0</span>
                </div>
            </div>
            <div class="task-list" id="task-list-${column.id}" data-status="${column.id}">
                <!-- Tasks will be rendered here -->
            </div>
            <button class="add-task-btn" data-status="${column.id}">
                <i class="fas fa-plus"></i> Add Task
            </button>
        `;
        
        elements.kanbanBoard.appendChild(columnEl);
        
        // Add drag & drop events
        columnEl.addEventListener('dragover', handleDragOver);
        columnEl.addEventListener('drop', handleDrop);
        columnEl.addEventListener('dragenter', handleDragEnter);
        columnEl.addEventListener('dragleave', handleDragLeave);
    });
    
    // Add task button listeners
    document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.addEventListener('click', () => openTaskModal(btn.dataset.status));
    });
}

// ===== TASK MANAGEMENT =====
function renderTasks(filteredTasks = null) {
    const tasksToRender = filteredTasks || state.tasks;
    
    // Clear all task lists
    document.querySelectorAll('.task-list').forEach(list => {
        list.innerHTML = '';
    });
    
    // Update column counts
    updateColumnCounts();
    
    // Render each task
    tasksToRender.forEach(task => {
        renderTask(task);
    });
    
    // Update drag & drop
    updateTaskDragEvents();
}

function renderTask(task) {
    const taskList = document.getElementById(`task-list-${task.status}`);
    if (!taskList) return;
    
    const taskEl = document.createElement('div');
    taskEl.className = 'task-item';
    taskEl.dataset.id = task.id;
    taskEl.dataset.priority = task.priority;
    taskEl.draggable = true;
    
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    const priorityClass = `priority-${task.priority}`;
    const priorityLabel = priorities[task.priority]?.label || 'Medium';
    
    taskEl.innerHTML = `
        <div class="task-header">
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            <span class="task-priority ${priorityClass}">${priorityLabel}</span>
        </div>
        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
        
        ${task.labels && task.labels.length > 0 ? `
            <div class="task-labels">
                ${task.labels.map(label => `<span class="task-label">${escapeHtml(label)}</span>`).join('')}
            </div>
        ` : ''}
        
        <div class="task-footer">
            ${task.dueDate ? `
                <div class="task-due-date ${isOverdue ? 'overdue' : ''}">
                    <i class="far fa-calendar"></i>
                    ${formatDate(task.dueDate)}
                </div>
            ` : ''}
            
            ${task.assignee ? `
                <div class="task-assignee">
                    <i class="fas fa-user"></i>
                    ${escapeHtml(task.assignee)}
                </div>
            ` : ''}
        </div>
        
        <div class="task-actions">
            <button class="task-action-btn edit-task" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="task-action-btn delete-task" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    taskList.appendChild(taskEl);
}

function createTask(taskData) {
    const task = {
        id: Date.now().toString(),
        title: taskData.title.trim(),
        description: taskData.description?.trim() || '',
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        dueDate: taskData.dueDate || null,
        assignee: taskData.assignee?.trim() || '',
        labels: taskData.labels ? taskData.labels.split(',').map(l => l.trim()).filter(l => l) : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    state.tasks.push(task);
    saveState();
    renderTasks();
    updateStats();
    showNotification('Task created successfully!');
    return task;
}

function updateTask(taskId, updates) {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    state.tasks[taskIndex] = {
        ...state.tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    saveState();
    renderTasks();
    updateStats();
    showNotification('Task updated successfully!');
    return state.tasks[taskIndex];
}

function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    state.tasks = state.tasks.filter(task => task.id !== taskId);
    saveState();
    renderTasks();
    updateStats();
    showNotification('Task deleted successfully!');
}

// ===== MODAL MANAGEMENT =====
function openTaskModal(status = 'todo', taskId = null) {
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('taskForm');
    
    state.currentTaskId = taskId;
    state.isEditing = !!taskId;
    
    if (taskId) {
        // Edit mode
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            title.textContent = 'Edit Task';
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskDueDate').value = task.dueDate || '';
            document.getElementById('taskAssignee').value = task.assignee || '';
            document.getElementById('taskLabels').value = task.labels?.join(', ') || '';
        }
    } else {
        // Create mode
        title.textContent = 'Add New Task';
        form.reset();
        document.getElementById('taskStatus').value = status;
    }
    
    modal.classList.add('active');
    document.getElementById('taskTitle').focus();
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
    state.currentTaskId = null;
    state.isEditing = false;
}

// ===== FORM HANDLING =====
function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        dueDate: document.getElementById('taskDueDate').value || null,
        assignee: document.getElementById('taskAssignee').value,
        labels: document.getElementById('taskLabels').value
    };
    
    // Validation
    if (!formData.title.trim()) {
        alert('Task title is required!');
        return;
    }
    
    if (state.isEditing && state.currentTaskId) {
        updateTask(state.currentTaskId, formData);
    } else {
        createTask(formData);
    }
    
    closeTaskModal();
}

// ===== DRAG & DROP =====
let draggedTask = null;

function handleDragStart(e) {
    if (!e.target.classList.contains('task-item')) return;
    
    draggedTask = e.target;
    e.target.classList.add('dragging');
    
    // Set drag image
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    if (e.target.classList.contains('task-list') || e.target.classList.contains('kanban-column')) {
        e.target.classList.add('drop-zone');
    }
}

function handleDragLeave(e) {
    if (e.target.classList.contains('task-list') || e.target.classList.contains('kanban-column')) {
        e.target.classList.remove('drop-zone');
    }
}

function handleDrop(e) {
    e.preventDefault();
    
    const taskId = e.dataTransfer.getData('text/plain');
    let targetColumn = e.target;
    
    // Find the task list or column
    while (targetColumn && !targetColumn.dataset.status) {
        targetColumn = targetColumn.parentElement;
    }
    
    if (targetColumn && targetColumn.dataset.status) {
        const newStatus = targetColumn.dataset.status;
        updateTask(taskId, { status: newStatus });
    }
    
    // Clean up
    document.querySelectorAll('.drop-zone').forEach(el => {
        el.classList.remove('drop-zone');
    });
    
    if (draggedTask) {
        draggedTask.classList.remove('dragging');
        draggedTask = null;
    }
}

function updateTaskDragEvents() {
    document.querySelectorAll('.task-item').forEach(taskEl => {
        taskEl.addEventListener('dragstart', handleDragStart);
        taskEl.addEventListener('dragend', () => {
            taskEl.classList.remove('dragging');
        });
    });
}

// ===== FILTERING & SEARCH =====
function setupFilters() {
    let filteredTasks = [...state.tasks];
    
    // Status filter
    const statusFilter = elements.filterStatus.value;
    if (statusFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }
    
    // Priority filter
    const priorityFilter = elements.filterPriority.value;
    if (priorityFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }
    
    // Search filter
    const searchTerm = elements.searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredTasks = filteredTasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm) ||
            task.description.toLowerCase().includes(searchTerm) ||
            task.labels.some(label => label.toLowerCase().includes(searchTerm)) ||
            task.assignee.toLowerCase().includes(searchTerm)
        );
    }
    
    renderTasks(filteredTasks);
}

// ===== STATISTICS =====
function updateStats() {
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = state.tasks.filter(t => t.status === 'progress').length;
    
    const today = new Date().toISOString().split('T')[0];
    const tasksToday = state.tasks.filter(t => 
        t.createdAt.split('T')[0] === today
    ).length;
    
    const overdueTasks = state.tasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status !== 'done';
    }).length;
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Update UI
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('inProgressTasks').textContent = inProgressTasks;
    document.getElementById('overdueTasks').textContent = overdueTasks;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
    document.getElementById('tasksToday').textContent = tasksToday;
    
    // Update column counts
    updateColumnCounts();
    
    // Update last saved
    const lastSavedEl = document.getElementById('lastSaved');
    const now = new Date();
    const diffMs = now - state.lastSaved;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
        lastSavedEl.textContent = 'Last saved: Just now';
    } else if (diffMins < 60) {
        lastSavedEl.textContent = `Last saved: ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else {
        const diffHours = Math.floor(diffMins / 60);
        lastSavedEl.textContent = `Last saved: ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
}

function updateColumnCounts() {
    columns.forEach(column => {
        const count = state.tasks.filter(task => task.status === column.id).length;
        const countEl = document.getElementById(`count-${column.id}`);
        if (countEl) {
            countEl.textContent = count;
        }
    });
}

function openStatsModal() {
    const modal = document.getElementById('statsModal');
    modal.classList.add('active');
    renderCharts();
}

function closeStatsModal() {
    document.getElementById('statsModal').classList.remove('active');
}

function renderCharts() {
    const ctx1 = document.getElementById('statusChart')?.getContext('2d');
    const ctx2 = document.getElementById('priorityChart')?.getContext('2d');
    
    if (!ctx1 || !ctx2) return;
    
    // Destroy existing charts
    if (statusChart) statusChart.destroy();
    if (priorityChart) priorityChart.destroy();
    
    // Status chart data
    const statusData = columns.map(col => ({
        label: col.title,
        count: state.tasks.filter(t => t.status === col.id).length,
        color: getComputedStyle(document.documentElement)
            .getPropertyValue(`--${col.color}-color`).trim()
    }));
    
    // Priority chart data
    const priorityData = Object.entries(priorities).map(([key, value]) => ({
        label: value.label,
        count: state.tasks.filter(t => t.priority === key).length,
        color: getComputedStyle(document.documentElement)
            .getPropertyValue(`--${value.color}-priority`).trim()
    }));
    
    // Create charts
    statusChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: statusData.map(d => d.label),
            datasets: [{
                data: statusData.map(d => d.count),
                backgroundColor: statusData.map(d => d.color),
                borderWidth: 2,
                borderColor: 'var(--card-bg)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'var(--text-color)',
                        padding: 20
                    }
                }
            }
        }
    });
    
    priorityChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: priorityData.map(d => d.label),
            datasets: [{
                data: priorityData.map(d => d.count),
                backgroundColor: priorityData.map(d => d.color),
                borderColor: priorityData.map(d => d.color),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'var(--text-secondary)',
                        stepSize: 1
                    },
                    grid: {
                        color: 'var(--border-color)'
                    }
                },
                x: {
                    ticks: {
                        color: 'var(--text-color)'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

//UTILITY FUNCTIONS 
function saveState() {
    localStorage.setItem('kanbanTasks', JSON.stringify(state.tasks));
    state.lastSaved = new Date();
}

function loadSampleDataIfEmpty() {
    if (state.tasks.length > 0) return;
    
    const sampleTasks = [
        {
            id: '1',
            title: 'Design Homepage Layout',
            description: 'Create responsive design for homepage with modern UI components',
            status: 'todo',
            priority: 'high',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assignee: 'Akshu',
            labels: ['design', 'ui', 'responsive'],
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '2',
            title: 'Implement User Authentication',
            description: 'Setup JWT-based authentication with refresh tokens',
            status: 'progress',
            priority: 'critical',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assignee: 'Isha',
            labels: ['backend', 'security', 'api'],
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '3',
            title: 'Write Unit Tests',
            description: 'Cover core functionality with Jest unit tests',
            status: 'review',
            priority: 'medium',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assignee: 'Nupur',
            labels: ['testing', 'quality'],
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '4',
            title: 'Deploy to Production',
            description: 'Setup CI/CD pipeline and deploy to AWS',
            status: 'done',
            priority: 'high',
            dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assignee: 'Reva',
            labels: ['devops', 'deployment', 'aws'],
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '5',
            title: 'Fix Mobile Navigation Bug',
            description: 'Hamburger menu not opening on iOS devices',
            status: 'todo',
            priority: 'medium',
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assignee: 'Rudra',
            labels: ['bug', 'mobile', 'ios'],
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
    
    state.tasks = sampleTasks;
    saveState();
    renderTasks();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
}

function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles for notification
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--card-bg);
            color: var(--text-color);
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius-sm);
            box-shadow: var(--shadow);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            border-left: 4px solid var(--primary-color);
        }
        
        .notification.success {
            border-left-color: var(--success-color);
        }
        
        .notification.error {
            border-left-color: var(--danger-color);
        }
        
        .notification-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 1.25rem;
            padding: 0;
            margin-left: 0.5rem;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Add close functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

function startAutoSave() {
    // Auto-save every 30 seconds
    setInterval(() => {
        saveState();
    }, 30000);
}

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
    // Task form
    elements.taskForm.addEventListener('submit', handleTaskFormSubmit);
    
    // Modal close buttons
    document.getElementById('closeModal').addEventListener('click', closeTaskModal);
    document.getElementById('cancelTask').addEventListener('click', closeTaskModal);
    
    // Stats modal
    elements.statsBtn.addEventListener('click', openStatsModal);
    elements.closeStats.addEventListener('click', closeStatsModal);
    
    // Theme toggle
    elements.toggleTheme.addEventListener('click', toggleTheme);
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportData);
    
    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // New board button
    document.getElementById('newBoardBtn').addEventListener('click', createNewBoard);
    
    // Filter and search inputs
    elements.searchInput.addEventListener('input', setupFilters);
    elements.filterStatus.addEventListener('change', setupFilters);
    elements.filterPriority.addEventListener('change', setupFilters);
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === elements.taskModal) {
            closeTaskModal();
        }
        if (e.target === elements.statsModal) {
            closeStatsModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N: New task
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openTaskModal();
        }
        
        // Escape: Close modals
        if (e.key === 'Escape') {
            closeTaskModal();
            closeStatsModal();
        }
    });
    
    // Event delegation for task actions
    document.addEventListener('click', (e) => {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = taskItem.dataset.id;
        
        if (e.target.closest('.edit-task')) {
            openTaskModal(null, taskId);
        }
        
        if (e.target.closest('.delete-task')) {
            deleteTask(taskId);
        }
    });
}

// ===== ADDITIONAL FEATURES =====
function exportData() {
    const dataStr = JSON.stringify(state.tasks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `kanban-tasks-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Data exported successfully!');
}

function clearFilters() {
    elements.searchInput.value = '';
    elements.filterStatus.value = 'all';
    elements.filterPriority.value = 'all';
    renderTasks();
}

function createNewBoard() {
    if (confirm('This will clear all tasks and create a new board. Are you sure?')) {
        state.tasks = [];
        saveState();
        renderTasks();
        updateStats();
        showNotification('New board created!');
    }
}

// ===== INITIALIZE APP =====
// Wait for DOM to load
document.addEventListener('DOMContentLoaded', init);

// Add global error handling
window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    showNotification('An error occurred. Please refresh the page.', 'error');
});

// Service Worker registration (optional - for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}