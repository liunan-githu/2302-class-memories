let currentAdminUser = null;
let currentRejectVideoId = null;
let currentBanUserId = null;
let currentDisableUploadUserId = null;
let currentEditClassmateId = null;
let currentDeleteClassmateId = null;

// 权限管理相关变量
let userPermissions = []; // 当前用户的权限列表

// Note: initAdmin and switchTab functions are defined at the end of this file

// ==================== Security & Anti-Debugging ====================

/**
 * 检测开发者工具是否打开
 * 如果检测到，可以采取措施保护敏感信息
 */
(function() {
    'use strict';
    
    // 禁用右键菜单中的"检查"选项
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.admin-menu') || e.target.closest('.admin-content')) {
            // 允许正常右键，但记录尝试
            console.log('Right click detected in admin area');
        }
    });
    
    // 检测开发者工具快捷键
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.key === 'F12') {
            console.warn('Developer tools shortcut detected');
        }
        // Ctrl+Shift+I / Cmd+Option+I
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
            console.warn('Developer tools shortcut detected');
        }
        // Ctrl+Shift+J / Cmd+Option+J
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
            console.warn('Developer tools shortcut detected');
        }
        // Ctrl+Shift+C / Cmd+Option+C
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
            console.warn('Developer tools shortcut detected');
        }
        // Ctrl+U (查看源代码) — 注：保留仅为日志，不阻止用户操作
        if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
            console.warn('View source shortcut pressed');
            // 允许用户查看源代码
        }
    });
    
    // 开发者工具检测 — 仅记录日志，不干预用户操作
    let devToolsOpen = false;
    const threshold = 160;
    
    // 禁用console.log在生产环境中（可选）
    // if (window.location.hostname !== 'localhost') {
    //     console.log = function() {};
    //     console.warn = function() {};
    //     console.error = function() {};
    // }
})();

/**
 * 权限数据加密/混淆
 * 防止直接通过localStorage查看权限数据
 */
const PermissionSecurity = {
    // 简单的XOR加密（实际应用中应使用更强的加密）
    encode: function(data) {
        const key = 'class-memories-2024';
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result);
    },
    
    decode: function(encoded) {
        try {
            const key = 'class-memories-2024';
            const data = atob(encoded);
            let result = '';
            for (let i = 0; i < data.length; i++) {
                result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (e) {
            return null;
        }
    },
    
    // 安全存储权限数据
    storePermissions: function(permissions) {
        const encoded = this.encode(JSON.stringify(permissions));
        sessionStorage.setItem('_p', encoded);
    },
    
    // 安全读取权限数据
    retrievePermissions: function() {
        const encoded = sessionStorage.getItem('_p');
        if (!encoded) return null;
        try {
            return JSON.parse(this.decode(encoded));
        } catch (e) {
            return null;
        }
    },
    
    // 清除权限数据
    clearPermissions: function() {
        sessionStorage.removeItem('_p');
    }
};

/**
 * 检查当前用户是否拥有指定权限
 * @param {string} permission - 权限标识
 * @returns {boolean}
 */
function hasUserPermission(permission) {
    if (!currentAdminUser) return false;
    
    // 超级管理员拥有所有权限
    if (currentAdminUser.role === 'superadmin' || currentAdminUser.isSuperAdmin) {
        return true;
    }
    
    // 获取用户的所有权限（自定义权限 + 角色默认权限）
    const allUserPermissions = getAllUserPermissions();
    
    return allUserPermissions.includes(permission);
}

/**
 * 获取用户的所有权限
 * 优先级：显式权限 > 角色默认权限
 * @returns {string[]}
 */
function getAllUserPermissions() {
    if (!currentAdminUser) return [];
    
    // 超级管理员返回所有权限
    if (currentAdminUser.role === 'superadmin' || currentAdminUser.isSuperAdmin) {
        return getAllAvailablePermissions();
    }
    
    // 获取用户显式权限（从localStorage或服务器获取）
    const explicitPermissions = userPermissions || [];
    
    // 如果用户有显式定义的权限，只使用显式权限（不合并角色默认权限）
    // 这样可以实现精细化权限控制
    if (explicitPermissions.length > 0) {
        return explicitPermissions;
    }
    
    // 如果没有显式权限，使用角色默认权限
    return getDefaultRolePermissions(currentAdminUser.role);
}

/**
 * 获取系统中所有可用的权限
 * @returns {string[]}
 */
function getAllAvailablePermissions() {
    return [
        'user_view', 'user_management', 'user_promote', 'user_demote', 
        'user_ban', 'user_unban', 'user_disable_upload', 'user_enable_upload',
        'video_audit', 'video_manage', 'video_delete',
        'photo_manage', 'photo_delete',
        'comment_manage', 'comment_delete',
        'classmates_manage', 'about_manage', 'statistics_view',
        'audit_log_view', 'permission_manage', 'role_manage', 'system_settings'
    ];
}

/**
 * 获取角色默认权限
 * @param {string} role - 角色标识
 * @returns {string[]}
 */
function getDefaultRolePermissions(role) {
    const defaultPermissions = {
        'admin': [
            'user_management', 'user_ban', 'user_unban', 'user_disable_upload', 'user_enable_upload',
            'video_audit', 'video_manage', 'video_delete',
            'photo_manage', 'photo_delete',
            'comment_manage', 'comment_delete',
            'classmates_manage', 'about_manage', 'statistics_view'
        ],
        'moderator': [
            'video_audit', 'video_manage',
            'comment_manage', 'comment_delete'
        ],
        'user': []
    };
    return defaultPermissions[role] || [];
}

/**
 * 根据权限动态显示/隐藏菜单项
 * 完全从DOM中移除无权限的元素，而不是仅仅隐藏
 * @param {boolean} showNotification - 是否显示权限更新提示
 */
function updateMenuVisibility(showNotification = false) {
    console.log('Updating menu visibility, user permissions:', userPermissions);
    
    const menuItems = document.querySelectorAll('.admin-menu-item[data-permission]');
    let visibleCount = 0;
    let firstVisibleItem = null;
    let removedItems = [];
    
    menuItems.forEach(item => {
        const requiredPermission = item.dataset.permission;
        const hasAccess = hasUserPermission(requiredPermission);
        
        console.log(`Menu item: ${item.textContent.trim()}, permission: ${requiredPermission}, hasAccess: ${hasAccess}`);
        
        if (hasAccess) {
            item.style.display = 'flex';
            visibleCount++;
            if (!firstVisibleItem) {
                firstVisibleItem = item;
            }
        } else {
            // 完全从DOM中移除元素，而不是仅仅隐藏
            // 这样可以防止通过开发者工具查看源代码
            removedItems.push({
                element: item,
                parent: item.parentNode,
                nextSibling: item.nextSibling
            });
            item.remove();
        }
    });
    
    // 同样处理内容区域
    updateContentVisibility();
    
    console.log(`Visible menu items: ${visibleCount}, Removed: ${removedItems.length}`);
    
    // 如果没有可见的菜单项，显示提示
    if (visibleCount === 0) {
        console.warn('No menu items visible for current user');
        showToast('您没有任何权限访问后台功能', 'warning');
    }
    
    // 检查当前激活的菜单项是否已被移除
    const activeItem = document.querySelector('.admin-menu-item.active');
    if (!activeItem && firstVisibleItem) {
        // 当前页面无权限访问，切换到第一个可见项
        console.log('Current tab no longer accessible, switching to:', firstVisibleItem.textContent.trim());
        firstVisibleItem.click();
        if (showNotification) {
            showToast('您的权限已变更，已自动切换到可访问页面', 'info');
        }
    } else if (!activeItem && !firstVisibleItem) {
        // 没有任何可访问的页面
        document.getElementById('pageTitle').textContent = '无访问权限';
        document.querySelectorAll('.admin-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        // 显示无权限提示
        showNoPermissionMessage();
    }
    
    // 显示权限更新提示
    if (showNotification && removedItems.length > 0) {
        showToast('您的权限已更新，部分功能已移除', 'info');
    }
    
    return { visibleCount, firstVisibleItem, removedItems };
}

/**
 * 更新内容区域的可见性
 * 完全从DOM中移除无权限的内容区域
 */
function updateContentVisibility() {
    const tabContentMap = {
        'videos': { id: 'videosTab', permission: 'video_audit' },
        'manage': { id: 'manageTab', permission: 'video_manage' },
        'users': { id: 'usersTab', permission: 'user_management' },
        'classmates': { id: 'classmatesTab', permission: 'classmates_manage' },
        'about': { id: 'aboutTab', permission: 'about_manage' },
        'comments': { id: 'commentsTab', permission: 'comment_manage' },
        'statistics': { id: 'statisticsTab', permission: 'statistics_view' },
        'permissions': { id: 'permissionsTab', permission: 'permission_manage' },
        'audit': { id: 'auditTab', permission: 'audit_log_view' }
    };
    
    Object.entries(tabContentMap).forEach(([tab, config]) => {
        const element = document.getElementById(config.id);
        if (element) {
            if (!hasUserPermission(config.permission)) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        }
    });
}

/**
 * 显示无权限访问提示
 */
function showNoPermissionMessage() {
    document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.remove('active'));
    const existing = document.getElementById('noPermissionMsg');
    if (existing) {
        existing.style.display = 'block';
        return;
    }
    const mainContent = document.querySelector('.admin-content');
    if (mainContent) {
        const msg = document.createElement('div');
        msg.id = 'noPermissionMsg';
        msg.style.cssText = 'padding:60px 20px;text-align:center;';
        msg.innerHTML = `
            <iconify-icon icon="lucide:lock" width="64" height="64" style="color:var(--color-text-muted);"></iconify-icon>
            <h3 style="margin:20px 0 10px;color:var(--admin-text);">无访问权限</h3>
            <p style="color:var(--admin-text-secondary);">您当前没有任何后台管理权限</p>
            <p style="color:var(--admin-text-muted);font-size:14px;margin-top:10px;">请联系管理员分配权限</p>
        `;
        mainContent.appendChild(msg);
    }
}

/**
 * 检查当前页面访问权限
 * @param {string} tab - 当前标签页
 * @returns {boolean}
 */
function checkTabPermission(tab) {
    const tabPermissions = {
        'videos': 'video_audit',
        'manage': 'video_manage',
        'photos': 'photo_manage',
        'users': 'user_management',
        'classmates': 'classmates_manage',
        'about': 'about_manage',
        'comments': 'comment_manage',
        'statistics': 'statistics_view',
        'permissions': 'permission_manage',
        'audit': 'audit_log_view'
    };
    
    const requiredPermission = tabPermissions[tab];
    if (!requiredPermission) return true; // 未知页面默认允许
    
    return hasUserPermission(requiredPermission);
}

/**
 * 查找第一个可访问的标签页
 * @returns {string|null}
 */
function findFirstAccessibleTab() {
    const tabOrder = ['videos', 'manage', 'photos', 'users', 'classmates', 'about', 'comments', 'statistics', 'permissions', 'audit'];
    
    for (const tab of tabOrder) {
        if (checkTabPermission(tab)) {
            return tab;
        }
    }
    
    return null;
}

/**
 * 从服务器获取当前用户的最新权限
 * @param {boolean} showNotification - 是否显示权限变更提示
 */
async function fetchUserPermissions(showNotification = true) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/user/permissions', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const newPermissions = data.permissions || [];
            
            // 检测权限是否发生变更
            const oldPermissionsStr = JSON.stringify(userPermissions.sort());
            const newPermissionsStr = JSON.stringify(newPermissions.sort());
            const hasChanged = oldPermissionsStr !== newPermissionsStr;
            
            if (hasChanged) {
                console.log('Permissions changed:', {
                    old: userPermissions,
                    new: newPermissions
                });
                
                // 更新权限
                userPermissions = newPermissions;
                
                // 安全存储新权限（加密）
                PermissionSecurity.storePermissions(newPermissions);
                
                // 更新localStorage中的用户信息
                const savedUser = localStorage.getItem('user');
                if (savedUser) {
                    const user = JSON.parse(savedUser);
                    user.permissions = newPermissions;
                    user.role = data.role;
                    user.isSuperAdmin = data.isSuperAdmin;
                    localStorage.setItem('user', JSON.stringify(user));
                    currentAdminUser = user;
                }
                
                // 更新菜单显示（显示变更提示）
                updateMenuVisibility(showNotification);
                
                // 更新超级管理员UI
                updateSuperAdminUI();
            } else {
                console.log('Permissions unchanged');
            }
        } else {
            console.error('Failed to fetch user permissions:', response.status);
        }
    } catch (error) {
        console.error('Error fetching user permissions:', error);
    }
}

/**
 * 启动权限实时监控
 * 定期检查权限变更
 */
function startPermissionMonitoring() {
    // 页面可见性变化时检查权限
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('Page became visible, checking permissions...');
            fetchUserPermissions(true);
        }
    });
    
    // 每30秒检查一次权限
    setInterval(() => {
        console.log('Periodic permission check...');
        fetchUserPermissions(true);
    }, 30000);
    
    console.log('Permission monitoring started');
}

function bindMenuEvents() {
    const menuItems = document.querySelectorAll('.admin-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });

    // 绑定照片上传事件
    const photoPreview = document.getElementById('classmatePhotoPreview');
    const photoFile = document.getElementById('classmatePhotoFile');
    
    if (photoPreview && photoFile) {
        photoPreview.addEventListener('click', () => photoFile.click());
        photoFile.addEventListener('change', handlePhotoSelect);
    }
}

function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('classmatePhotoPreview');
    const reader = new FileReader();
    
    reader.onload = (event) => {
        preview.innerHTML = `<img src="${event.target.result}" alt="预览">`;
    };
    reader.readAsDataURL(file);
}

function resetPhotoPreview() {
    const preview = document.getElementById('classmatePhotoPreview');
    if (preview) {
        preview.innerHTML = `
            <iconify-icon icon="lucide:user" width="48" height="48"></iconify-icon>
            <p>点击上传照片</p>
        `;
    }
    const fileInput = document.getElementById('classmatePhotoFile');
    if (fileInput) fileInput.value = '';
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    };
}

async function loadAdminData() {
    try {
        const [allVideosRes, pendingRes, usersRes] = await Promise.all([
            fetch('/api/admin/videos', { headers: getAuthHeaders() }),
            fetch('/api/videos/pending', { headers: getAuthHeaders() }),
            fetch('/api/debug/db')
        ]);
        
        const allVideosData = allVideosRes.ok ? await allVideosRes.json() : [];
        const pendingData = pendingRes.ok ? await pendingRes.json() : [];
        const dbData = await usersRes.json();
        
        const pendingCount = pendingData.length;
        const approvedCount = allVideosData.filter(v => v.status === 'approved').length;
        const rejectedCount = allVideosData.filter(v => v.status === 'rejected').length;
        const usersCount = dbData.users ? dbData.users.length : 0;
        
        document.getElementById('pendingCount').textContent = pendingCount;
        
        // 使用动画更新统计数字
        animateStatNumber('statPending', pendingCount);
        animateStatNumber('statApproved', approvedCount);
        animateStatNumber('statRejected', rejectedCount);
        animateStatNumber('statUsers', usersCount);
        
        loadVideosForTab('pending');
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

// 根据当前页面更新统计卡片显示
function updateStatsForTab(tab) {
    const statsContainer = document.querySelector('.admin-stats-cards');
    if (!statsContainer) return;
    
    // 定义各页面的统计配置
    const statsConfig = {
        'manage': [
            { id: 'statPending', label: '待审核', icon: 'lucide:hourglass', color: 'pending' },
            { id: 'statApproved', label: '已通过', icon: 'tabler:circle-check', color: 'approved' },
            { id: 'statRejected', label: '已拒绝', icon: 'tabler:circle-x', color: 'rejected' }
        ],
        'photos': [
            { id: 'statPending', label: '待审核', icon: 'lucide:hourglass', color: 'pending' },
            { id: 'statApproved', label: '已通过', icon: 'tabler:circle-check', color: 'approved' },
            { id: 'statRejected', label: '已拒绝', icon: 'tabler:circle-x', color: 'rejected' }
        ],
        'users': [
            { id: 'statUsers', label: '总用户', icon: 'tabler:users-group', color: 'users' },
            { id: 'statApproved', label: '正常用户', icon: 'tabler:user-check', color: 'approved' },
            { id: 'statRejected', label: '封禁用户', icon: 'tabler:user-x', color: 'rejected' }
        ],
        'classmates': [
            { id: 'statUsers', label: '同学总数', icon: 'tabler:user-star', color: 'users' }
        ],
        'comments': [
            { id: 'statPending', label: '待审核', icon: 'tabler:message-exclamation', color: 'pending' },
            { id: 'statApproved', label: '已通过', icon: 'tabler:message-check', color: 'approved' },
            { id: 'statRejected', label: '已拒绝', icon: 'tabler:message-x', color: 'rejected' }
        ]
    };
    
    const config = statsConfig[tab];
    if (!config) {
        // 默认显示空或隐藏
        statsContainer.innerHTML = '';
        return;
    }
    
    // 重新生成统计卡片HTML
    statsContainer.innerHTML = config.map((stat, index) => `
        <div class="admin-stat-card" style="animation: statCardFadeIn 0.5s ease ${index * 0.1}s backwards;">
            <div class="stat-icon ${stat.color}">
                <iconify-icon icon="${stat.icon}" width="24" height="24"></iconify-icon>
            </div>
            <div class="stat-info">
                <p class="stat-number" id="${stat.id}">0</p>
                <p class="stat-label">${stat.label}</p>
            </div>
        </div>
    `).join('');
    
    // 加载对应数据
    loadStatsData(tab);
}

// 加载统计数据
async function loadStatsData(tab) {
    try {
        if (tab === 'manage') {
            const response = await fetch('/api/videos');
            const videos = await response.json();
            const pendingCount = videos.filter(v => v.status === 'pending').length;
            const approvedCount = videos.filter(v => v.status === 'approved').length;
            const rejectedCount = videos.filter(v => v.status === 'rejected').length;
            const totalCount = videos.length;
            
            animateStatNumber('statPending', pendingCount);
            animateStatNumber('statApproved', approvedCount);
            animateStatNumber('statRejected', rejectedCount);
            animateStatNumber('statTotal', totalCount);
        }
        else if (tab === 'photos') {
            const response = await fetch('/api/admin/photos', {
                headers: getAuthHeaders()
            });
            const photos = await response.json();
            const pendingCount = photos.filter(p => p.status === 'pending').length;
            const approvedCount = photos.filter(p => p.status === 'approved').length;
            const rejectedCount = photos.filter(p => p.status === 'rejected').length;
            
            animateStatNumber('statPending', pendingCount);
            animateStatNumber('statApproved', approvedCount);
            animateStatNumber('statRejected', rejectedCount);
        }
        else if (tab === 'users') {
            const response = await fetch('/api/debug/db', {
                headers: getAuthHeaders()
            });
            const db = await response.json();
            const users = db.users || [];
            const totalCount = users.length;
            const normalCount = users.filter(u => !u.isBanned).length;
            const bannedCount = users.filter(u => u.isBanned).length;
            
            animateStatNumber('statUsers', totalCount);
            animateStatNumber('statApproved', normalCount);
            animateStatNumber('statRejected', bannedCount);
        }
        else if (tab === 'classmates') {
            const response = await fetch('/api/classmates');
            const classmates = await response.json();
            animateStatNumber('statUsers', classmates.length);
        }
        else if (tab === 'comments') {
            // 评论统计 - 如果有API的话
            animateStatNumber('statPending', 0);
            animateStatNumber('statApproved', 0);
            animateStatNumber('statRejected', 0);
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 统计数字动画更新
function animateStatNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // 添加更新动画类
    element.classList.add('updating');
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutQuart 缓动函数
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeProgress);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // 动画结束后移除类
            setTimeout(() => {
                element.classList.remove('updating');
            }, 200);
        }
    }
    
    requestAnimationFrame(update);
}

// 视频管理相关变量
let currentVideoTab = 'pending';
let allVideos = [];

// 切换视频标签
function switchVideoTab(tab) {
    currentVideoTab = tab;
    
    // 更新按钮样式
    document.querySelectorAll('#manageTab .photo-filter-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.add('active');
        }
    });
    
    // 加载对应数据
    loadVideosForTab(tab);
}

// 加载视频列表
async function loadVideosForTab(tab = 'pending') {
    const container = document.getElementById('videoList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="photo-loading">
            <iconify-icon icon="tabler:loader-2" width="48" height="48" class="spin"></iconify-icon>
            <p style="margin-top: 16px; color: #64748b;">加载中...</p>
        </div>
    `;
    
    try {
        let endpoint;
        const authHeaders = getAuthHeaders();
        if (tab === 'pending') {
            endpoint = '/api/videos/pending';
        } else {
            endpoint = '/api/admin/videos';
        }
        
        const response = await fetch(endpoint, {
            headers: authHeaders
        });
        
        if (!response.ok) {
            throw new Error('加载失败');
        }
        
        let videos = await response.json();
        allVideos = videos;
        
        // 根据标签筛选
        if (tab !== 'pending' && tab !== 'all') {
            videos = videos.filter(v => v.status === tab);
        }
        
        // 更新统计
        updateVideoStats();
        
        // 更新待审核数量徽章
        const pendingCount = allVideos.filter(v => v.status === 'pending').length;
        const badge = document.getElementById('pendingCount');
        const tabBadge = document.getElementById('tabPendingCount');
        if (badge) {
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'flex' : 'none';
        }
        if (tabBadge) {
            tabBadge.textContent = pendingCount;
        }
        
        renderVideos(videos);
        
    } catch (error) {
        console.error('加载视频列表失败:', error);
        container.innerHTML = `
            <div class="photo-empty-state">
                <div class="photo-empty-icon">
                    <iconify-icon icon="lucide:alert-triangle-circle" width="48" height="48" style="color: #ef4444;"></iconify-icon>
                </div>
                <h3 class="photo-empty-title">加载失败</h3>
                <p class="photo-empty-desc">无法加载视频列表，请刷新页面重试</p>
            </div>
        `;
    }
}

// 更新视频统计
function updateVideoStats() {
    const pendingCount = allVideos.filter(v => v.status === 'pending').length;
    const approvedCount = allVideos.filter(v => v.status === 'approved').length;
    const rejectedCount = allVideos.filter(v => v.status === 'rejected').length;
    const totalCount = allVideos.length;
    
    animateStatNumber('statPending', pendingCount);
    animateStatNumber('statApproved', approvedCount);
    animateStatNumber('statRejected', rejectedCount);
    animateStatNumber('statTotal', totalCount);
}

// 渲染视频列表
function renderVideos(videos) {
    const container = document.getElementById('videoList');
    if (!container) return;
    
    if (videos.length === 0) {
        const isSearch = document.getElementById('videoSearchInput')?.value.trim() !== '';
        const emptyMessages = {
            'pending': { title: '暂无待审核视频', desc: '太棒了！所有视频已审核完毕' },
            'approved': { title: '暂无已通过视频', desc: '还没有已审核通过的视频' },
            'rejected': { title: '暂无已拒绝视频', desc: '还没有被拒绝的视频' },
            'all': { title: '暂无视频', desc: '还没有用户上传视频' }
        };
        const msg = isSearch ? { title: '未找到匹配的视频', desc: '请尝试其他搜索关键词' } : emptyMessages[currentVideoTab];
        
        container.innerHTML = `
            <div class="photo-empty-state">
                <div class="photo-empty-icon">
                    <iconify-icon icon="tabler:video-off" width="48" height="48" style="color: #3b82f6;"></iconify-icon>
                </div>
                <h3 class="photo-empty-title">${msg.title}</h3>
                <p class="photo-empty-desc">${msg.desc}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = videos.map((video, index) => `
        <div class="photo-audit-card ${video.status}" style="animation: fadeInUp 0.5s ease ${index * 0.08}s both;">
            <div class="photo-card-preview" onclick="playVideo(${video.id})">
                <img src="${video.coverFilename ? '/uploads/' + video.coverFilename : '/api/video-cover/' + video.id}" 
                     alt="${escapeHtml(video.title)}"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%2333%22 width=%22400%22 height=%22300%22/><text fill=%22%23888%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22>2302</text></svg>'">
                <div class="photo-count-badge">
                    <iconify-icon icon="tabler:player-play" width="14" height="14"></iconify-icon>
                    <span>播放</span>
                </div>
                <div class="photo-card-overlay">
                    <button class="btn-view-details">
                        <iconify-icon icon="tabler:player-play" width="18" height="18"></iconify-icon>
                        播放视频
                    </button>
                </div>
            </div>
            <div class="photo-card-content">
                <div class="photo-card-header">
                    <h4 class="photo-card-title">${escapeHtml(video.title)}</h4>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span class="photo-status-badge ${video.status}">${getStatusText(video.status)}</span>
                        ${activeTranscodeIds.has(video.id) ? '<span class="transcode-badge transcoding"><iconify-icon icon="lucide:loader-2" width="12" height="12" class="spin-icon"></iconify-icon>转码中</span>' : ''}
                        ${!activeTranscodeIds.has(video.id) && video.qualities && video.qualities.length > 1 ? '<span class="transcode-badge completed"><iconify-icon icon="lucide:check-circle" width="12" height="12"></iconify-icon>已转码</span>' : ''}
                    </div>
                </div>
                <div class="photo-card-meta">
                    <div class="photo-meta-item">
                        <iconify-icon icon="lucide:user" width="16" height="16"></iconify-icon>
                        <span>${escapeHtml(video.uploaderUsername || '未知用户')}</span>
                    </div>
                    <div class="photo-meta-item">
                        <iconify-icon icon="lucide:eye" width="16" height="16"></iconify-icon>
                        <span>${video.views || 0} 次观看</span>
                    </div>
                    <div class="photo-meta-item">
                        <iconify-icon icon="lucide:calendar" width="16" height="16"></iconify-icon>
                        <span>${new Date(video.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                </div>
                ${video.rejectionReason ? `
                    <div class="photo-reject-reason">
                        <iconify-icon icon="lucide:alert-triangle" width="14" height="14" style="vertical-align: middle; margin-right: 4px;"></iconify-icon>
                        ${escapeHtml(video.rejectionReason)}
                    </div>
                ` : ''}
                <div class="photo-card-actions">
                    ${video.status === 'pending' ? `
                        <button class="btn-approve" onclick="approveVideo(${video.id})">
                            <iconify-icon icon="lucide:check" width="16" height="16"></iconify-icon>
                            通过
                        </button>
                        <button class="btn-reject" onclick="openRejectModal(${video.id})">
                            <iconify-icon icon="lucide:x" width="16" height="16"></iconify-icon>
                            拒绝
                        </button>
                    ` : ''}
                    <button class="btn-delete" onclick="confirmDeleteVideo(${video.id})">
                        <iconify-icon icon="tabler:trash" width="16" height="16"></iconify-icon>
                        删除
                    </button>
                    <button class="btn-secondary" onclick="transcodeVideo(${video.id})">
                        <iconify-icon icon="lucide:film" width="16" height="16"></iconify-icon>
                        转码
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 搜索视频
function searchVideos(keyword) {
    if (!keyword.trim()) {
        loadVideosForTab(currentVideoTab);
        return;
    }
    
    const filtered = allVideos.filter(video => 
        video.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (video.uploaderUsername && video.uploaderUsername.toLowerCase().includes(keyword.toLowerCase())) ||
        (video.description && video.description.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    renderVideos(filtered);
}

// 确认删除视频
function confirmDeleteVideo(videoId) {
    confirmActionCallback = () => deleteVideo(videoId);
    
    document.getElementById('confirmTitle').textContent = '确认删除';
    document.getElementById('confirmMessage').textContent = '确定要删除这个视频吗？此操作不可恢复，视频将从系统中永久移除。';
    document.getElementById('confirmIcon').className = 'confirm-dialog-icon danger';
    document.getElementById('confirmIcon').innerHTML = '<iconify-icon icon="tabler:trash-alert" width="32" height="32"></iconify-icon>';
    document.getElementById('confirmBtn').textContent = '确认删除';
    
    document.getElementById('confirmDialog').classList.add('active');
}

// 播放视频
function playVideo(videoId) {
    window.open(`/?video=${videoId}`, '_blank');
}

let transcodePollTimer = null;
let activeTranscodeIds = new Set();

async function transcodeVideo(videoId) {
    try {
        showToast('开始转码任务...', 'info');
        activeTranscodeIds.add(videoId);
        renderVideos(allVideos);
        startTranscodePolling();
        const response = await fetch(`/api/videos/${videoId}/transcode`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '转码失败');
        }
        activeTranscodeIds.delete(videoId);
        showToast('转码完成', 'success');
        loadVideosForTab(currentVideoTab);
    } catch (error) {
        console.error('转码失败:', error);
        activeTranscodeIds.delete(videoId);
        showToast(error.message || '转码失败', 'error');
    }
    stopTranscodePollingIfIdle();
}

function startTranscodePolling() {
    if (transcodePollTimer) return;
    pollTranscodeStatus();
    transcodePollTimer = setInterval(pollTranscodeStatus, 5000);
}

function stopTranscodePollingIfIdle() {
    if (activeTranscodeIds.size === 0) {
        if (transcodePollTimer) {
            clearInterval(transcodePollTimer);
            transcodePollTimer = null;
        }
        updateTranscodeStatusBar([]);
    }
}

async function pollTranscodeStatus() {
    try {
        const response = await fetch('/api/admin/transcode/status', {
            headers: getAuthHeaders()
        });
        if (!response.ok) return;
        const data = await response.json();
        const active = data.active || [];

        activeTranscodeIds = new Set(active.map(a => a.videoId));
        updateTranscodeStatusBar(active);
        renderVideos(allVideos);

        if (active.length === 0 && transcodePollTimer) {
            clearInterval(transcodePollTimer);
            transcodePollTimer = null;
        }
    } catch (e) {
        console.warn('Poll transcode status failed:', e.message);
    }
}

function updateTranscodeStatusBar(activeList) {
    const bar = document.getElementById('transcodeStatusBar');
    const text = document.getElementById('transcodeStatusText');
    const items = document.getElementById('transcodeStatusItems');
    if (!bar) return;

    if (!activeList || activeList.length === 0) {
        bar.classList.add('hidden');
        return;
    }

    bar.classList.remove('hidden');
    text.textContent = `正在转码 ${activeList.length} 个视频`;

    items.innerHTML = activeList.map(a => {
        const title = a.title || `视频 ${a.videoId}`;
        const progress = a.progress != null ? `${a.progress}%` : '...';
        const quality = a.currentQuality ? a.currentQuality.toUpperCase() : '';
        return `<div class="transcode-status-item">
            <span class="transcode-status-item-title">${escapeHtml(title)}</span>
            ${quality ? `<span style="opacity:0.6">${quality}</span>` : ''}
            <span class="transcode-status-item-progress">${progress}</span>
        </div>`;
    }).join('');
}

async function loadUsers() {
    const container = document.getElementById('userList');
    if (!container) {
        console.error('User list container not found');
        return;
    }
    
    // 显示加载状态
    container.innerHTML = `
        <div class="loading-state">
            <iconify-icon icon="tabler:loader-2" width="48" height="48" class="spin"></iconify-icon>
            <p>加载用户列表...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/admin/users/all', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                container.innerHTML = `
                    <div class="admin-empty-state">
                        <iconify-icon icon="lucide:lock" width="64" height="64" style="color: var(--text-muted);"></iconify-icon>
                        <h3>权限不足</h3>
                        <p>您没有权限查看用户列表</p>
                    </div>
                `;
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const users = await response.json();
        
        if (users.length === 0) {
            container.innerHTML = `
                <div class="admin-empty-state">
                    <iconify-icon icon="tabler:users-group" width="64" height="64" style="opacity: 0.3;"></iconify-icon>
                    <h3>暂无用户</h3>
                    <p>系统中还没有注册用户</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="admin-user-card">
                <div class="admin-user-avatar">
                    <iconify-icon icon="lucide:user" width="28" height="28"></iconify-icon>
                </div>
                <div class="admin-user-details">
                    <p class="admin-username">${escapeHtml(user.username)}</p>
                    <p class="admin-user-role">${getRoleDisplayName(user.role)}</p>
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
                        ${user.isBanned ? `<p style="color: #f87171; font-size: 0.8rem;"><iconify-icon icon="lucide:alert-triangle-circle" width="14" height="14"></iconify-icon> 账号已封禁: ${escapeHtml(user.banReason) || '无原因'}</p>` : ''}
                        ${user.uploadDisabled ? `<p style="color: #f59e0b; font-size: 0.8rem;"><iconify-icon icon="tabler:upload-off" width="14" height="14"></iconify-icon> 禁止上传: ${escapeHtml(user.uploadDisableReason) || '无原因'}</p>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    ${user.role !== 'admin' && user.role !== 'superadmin' ? `
                        ${!user.isBanned ? `
                            <button class="admin-btn reject" onclick="openBanModal(${user.id})">
                                <iconify-icon icon="tabler:circle-x" width="16" height="16"></iconify-icon>
                                封禁
                            </button>
                        ` : `
                            <button class="admin-btn approve" onclick="unbanUser(${user.id})">
                                <iconify-icon icon="lucide:check" width="16" height="16"></iconify-icon>
                                解封
                            </button>
                        `}
                        ${!user.uploadDisabled ? `
                            <button class="admin-btn reject" onclick="openDisableUploadModal(${user.id})">
                                <iconify-icon icon="tabler:upload-off" width="16" height="16"></iconify-icon>
                                禁止上传
                            </button>
                        ` : `
                            <button class="admin-btn approve" onclick="enableUpload(${user.id})">
                                <iconify-icon icon="lucide:cloud-upload" width="16" height="16"></iconify-icon>
                                允许上传
                            </button>
                        `}
                    ` : `<span class="status-badge approved">${user.role === 'superadmin' ? '超级管理员' : '管理员'}</span>`}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载用户列表失败:', error);
        container.innerHTML = `
            <div class="admin-empty-state">
                <iconify-icon icon="lucide:alert-triangle-circle" width="64" height="64" style="color: #f87171;"></iconify-icon>
                <h3>加载失败</h3>
                <p>无法加载用户列表，请稍后重试</p>
                <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/**
 * 获取角色显示名称
 * @param {string} role - 角色标识
 * @returns {string}
 */
function getRoleDisplayName(role) {
    const roleNames = {
        'superadmin': '超级管理员',
        'admin': '管理员',
        'moderator': '版主',
        'user': '普通用户'
    };
    return roleNames[role] || role;
}

async function loadComments() {
    const container = document.getElementById('commentList');
    if (!container) {
        console.error('Comment list container not found');
        return;
    }
    
    // 显示加载状态
    container.innerHTML = `
        <div class="loading-state">
            <iconify-icon icon="tabler:loader-2" width="48" height="48" class="spin"></iconify-icon>
            <p>加载评论列表...</p>
        </div>
    `;
    
    try {
        // 获取所有视频
        const videosRes = await fetch('/api/videos');
        if (!videosRes.ok) {
            throw new Error(`Failed to fetch videos: ${videosRes.status}`);
        }
        const videos = await videosRes.json();
        
        // 获取每个视频的评论
        let allComments = [];
        for (const video of videos) {
            try {
                const commentsRes = await fetch(`/api/videos/${video.id}/comments`);
                if (commentsRes.ok) {
                    const comments = await commentsRes.json();
                    comments.forEach(comment => {
                        allComments.push({
                            ...comment,
                            videoTitle: video.title,
                            videoId: video.id
                        });
                    });
                }
            } catch (e) {
                console.warn(`Failed to load comments for video ${video.id}:`, e);
            }
        }
        
        // 按时间排序
        allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        if (allComments.length === 0) {
            container.innerHTML = `
                <div class="admin-empty-state">
                    <iconify-icon icon="tabler:message-2" width="64" height="64" style="opacity: 0.3;"></iconify-icon>
                    <h3>暂无评论</h3>
                    <p>还没有用户发表评论</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = allComments.map(comment => `
            <div class="admin-video-card" style="flex-direction: column;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
                        <iconify-icon icon="lucide:user" width="22" height="22"></iconify-icon>
                    </div>
                    <div style="flex: 1;">
                        <p style="color: #fff; font-weight: 600; margin-bottom: 2px;">${escapeHtml(comment.username) || '匿名用户'}</p>
                        <p style="color: #a1a1aa; font-size: 0.85rem;">在视频 "${escapeHtml(comment.videoTitle)}" 的评论</p>
                    </div>
                    <button class="admin-btn delete" onclick="deleteComment(${comment.videoId}, ${comment.id})">
                        <iconify-icon icon="tabler:trash" width="18" height="18"></iconify-icon>
                        删除
                    </button>
                </div>
                <p style="color: #e4e4e7; line-height: 1.6;">${escapeHtml(comment.content)}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载评论失败:', error);
        container.innerHTML = `
            <div class="admin-empty-state">
                <iconify-icon icon="lucide:alert-triangle-circle" width="64" height="64" style="color: #f87171;"></iconify-icon>
                <h3>加载失败</h3>
                <p>无法加载评论列表，请稍后重试</p>
                <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

async function approveVideo(videoId) {
    try {
        const response = await fetch(`/api/videos/${videoId}/approve`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('视频已通过审核', 'success');
            loadAdminData();
        } else {
            showToast('操作失败', 'error');
        }
    } catch (error) {
        console.error('审核失败:', error);
        showToast('操作失败', 'error');
    }
}

function openRejectModal(videoId) {
    currentRejectVideoId = videoId;
    document.getElementById('rejectModal').classList.add('active');
    document.getElementById('rejectReason').value = '';
}

function closeRejectModal() {
    document.getElementById('rejectModal').classList.remove('active');
    currentRejectVideoId = null;
}

async function confirmReject() {
    if (!currentRejectVideoId) return;
    
    const reason = document.getElementById('rejectReason').value.trim() || '内容不符合规范';
    
    try {
        const response = await fetch(`/api/videos/${currentRejectVideoId}/reject`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ reason })
        });
        
        if (response.ok) {
            showToast('视频已拒绝', 'success');
            closeRejectModal();
            loadAdminData();
        } else {
            showToast('操作失败', 'error');
        }
    } catch (error) {
        console.error('拒绝失败:', error);
        showToast('操作失败', 'error');
    }
}

async function deleteVideo(videoId) {
    if (!confirm('确定要删除这个视频吗？此操作不可恢复！')) return;
    
    try {
        const response = await fetch(`/api/videos/${videoId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('视频已删除', 'success');
            loadAdminData();
        } else {
            showToast('删除失败', 'error');
        }
    } catch (error) {
        console.error('删除失败:', error);
        showToast('删除失败', 'error');
    }
}

async function deleteComment(videoId, commentId) {
    if (!confirm('确定要删除这条评论吗？')) return;
    
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            showToast('评论已删除', 'success');
            loadComments();
        } else {
            showToast('删除失败', 'error');
        }
    } catch (error) {
        console.error('删除失败:', error);
        showToast('删除失败', 'error');
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝'
    };
    return statusMap[status] || status;
}

function formatTimeAgo(dateString) {
    if (!dateString) return '刚刚';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
}

function handleAdminLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('adminToast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' active';
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// 封禁用户相关函数
function openBanModal(userId) {
    currentBanUserId = userId;
    document.getElementById('banModal').classList.add('active');
    document.getElementById('banReason').value = '';
}

function closeBanModal() {
    document.getElementById('banModal').classList.remove('active');
    currentBanUserId = null;
}

async function confirmBan() {
    if (!currentBanUserId) return;
    
    const reason = document.getElementById('banReason').value.trim() || '违反社区规范';
    
    try {
        const response = await fetch(`/api/admin/user/${currentBanUserId}/ban`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ reason })
        });
        
        if (response.ok) {
            showToast('用户已封禁', 'success');
            closeBanModal();
            loadUsers();
        } else {
            showToast('操作失败', 'error');
        }
    } catch (error) {
        console.error('封禁失败:', error);
        showToast('操作失败', 'error');
    }
}

async function unbanUser(userId) {
    try {
        const response = await fetch(`/api/admin/user/${userId}/unban`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('用户已解封', 'success');
            loadUsers();
        } else {
            showToast('操作失败', 'error');
        }
    } catch (error) {
        console.error('解封失败:', error);
        showToast('操作失败', 'error');
    }
}

// 禁止上传相关函数
function openDisableUploadModal(userId) {
    currentDisableUploadUserId = userId;
    document.getElementById('disableUploadModal').classList.add('active');
    document.getElementById('disableUploadReason').value = '';
}

function closeDisableUploadModal() {
    document.getElementById('disableUploadModal').classList.remove('active');
    currentDisableUploadUserId = null;
}

async function confirmDisableUpload() {
    if (!currentDisableUploadUserId) return;
    
    const reason = document.getElementById('disableUploadReason').value.trim() || '违反上传规范';
    
    try {
        const response = await fetch(`/api/admin/user/${currentDisableUploadUserId}/disable-upload`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ reason })
        });
        
        if (response.ok) {
            showToast('用户上传已禁用', 'success');
            closeDisableUploadModal();
            loadUsers();
        } else {
            showToast('操作失败', 'error');
        }
    } catch (error) {
        console.error('禁止上传失败:', error);
        showToast('操作失败', 'error');
    }
}

async function enableUpload(userId) {
    try {
        const response = await fetch(`/api/admin/user/${userId}/enable-upload`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('用户上传已允许', 'success');
            loadUsers();
        } else {
            showToast('操作失败', 'error');
        }
    } catch (error) {
        console.error('允许上传失败:', error);
        showToast('操作失败', 'error');
    }
}

// 同学录管理相关函数
async function loadClassmates() {
    try {
        const response = await fetch('/api/classmates');
        const data = await response.json();
        const classmates = data.classmates || [];
        
        const container = document.getElementById('classmateList');
        
        if (!classmates || classmates.length === 0) {
            container.innerHTML = `
                <div class="admin-empty-state">
                    <iconify-icon icon="tabler:users-group"></iconify-icon>
                    <h3>还没有添加同学录</h3>
                    <p>点击上方"添加同学"按钮开始添加</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = classmates.map(classmate => `
            <div class="admin-classmate-card">
                <div class="admin-classmate-avatar">
                    ${classmate.photo ? 
                        `<img src="${classmate.photo}" alt="${classmate.name}">` :
                        `<iconify-icon icon="lucide:user"></iconify-icon>`
                    }
                </div>
                <div class="admin-classmate-content">
                    <h4 class="admin-classmate-name">
                        <iconify-icon icon="lucide:user-round"></iconify-icon>
                        ${escapeHtml(classmate.name)}
                    </h4>
                    <div class="admin-classmate-meta">
                        ${classmate.graduationYear ? `
                            <span class="admin-classmate-tag">
                                <iconify-icon icon="lucide:graduation-cap"></iconify-icon>
                                ${classmate.graduationYear}
                            </span>
                        ` : ''}
                        ${classmate.personality ? `
                            <span class="admin-classmate-tag">
                                <iconify-icon icon="lucide:smile"></iconify-icon>
                                ${escapeHtml(classmate.personality)}
                            </span>
                        ` : ''}
                        ${classmate.contact ? `
                            <span class="admin-classmate-tag">
                                <iconify-icon icon="lucide:contact-round"></iconify-icon>
                                ${escapeHtml(classmate.contact)}
                            </span>
                        ` : ''}
                    </div>
                    ${classmate.description ? `<p class="admin-classmate-desc">${escapeHtml(classmate.description)}</p>` : ''}
                    <div class="admin-classmate-actions">
                        <button class="admin-classmate-btn edit" onclick="openEditClassmateModal(${classmate.id})">
                            <iconify-icon icon="lucide:pencil"></iconify-icon>
                            编辑
                        </button>
                        <button class="admin-classmate-btn delete" onclick="openDeleteClassmateModal(${classmate.id})">
                            <iconify-icon icon="tabler:trash"></iconify-icon>
                            删除
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载同学录失败:', error);
        showToast('加载同学录失败', 'error');
    }
}

function openAddClassmateModal() {
    currentEditClassmateId = null;
    document.getElementById('classmateModalTitle').textContent = '添加同学';
    document.getElementById('classmateName').value = '';
    document.getElementById('classmateGraduationYear').value = '';
    document.getElementById('classmatePersonality').value = '';
    document.getElementById('classmateContact').value = '';
    document.getElementById('classmatePhoto').value = '';
    document.getElementById('classmateDescription').value = '';
    resetPhotoPreview();
    document.getElementById('classmateModal').classList.add('active');
}

function openEditClassmateModal(classmateId) {
    fetch('/api/classmates')
        .then(res => res.json())
        .then(data => {
            const classmates = data.classmates || [];
            const classmate = classmates.find(c => c.id === classmateId);
            if (!classmate) {
                showToast('同学录不存在', 'error');
                return;
            }
            
            currentEditClassmateId = classmateId;
            document.getElementById('classmateModalTitle').textContent = '编辑同学';
            document.getElementById('classmateName').value = classmate.name || '';
            document.getElementById('classmateGraduationYear').value = classmate.graduationYear || '';
            document.getElementById('classmatePersonality').value = classmate.personality || '';
            document.getElementById('classmateContact').value = classmate.contact || '';
            document.getElementById('classmatePhoto').value = classmate.photo || '';
            document.getElementById('classmateDescription').value = classmate.description || '';
            
            // 显示已有照片预览
            const preview = document.getElementById('classmatePhotoPreview');
            if (classmate.photo) {
                preview.innerHTML = `<img src="/uploads/${classmate.photo}" alt="预览">`;
            } else {
                resetPhotoPreview();
            }
            
            document.getElementById('classmateModal').classList.add('active');
        })
        .catch(err => {
            console.error('获取同学录信息失败:', err);
            showToast('获取信息失败', 'error');
        });
}

function closeClassmateModal() {
    document.getElementById('classmateModal').classList.remove('active');
    currentEditClassmateId = null;
    resetPhotoPreview();
}

async function saveClassmate() {
    const name = document.getElementById('classmateName').value.trim();
    const graduationYear = document.getElementById('classmateGraduationYear').value.trim();
    const personality = document.getElementById('classmatePersonality').value.trim();
    const contact = document.getElementById('classmateContact').value.trim();
    const existingPhoto = document.getElementById('classmatePhoto').value.trim();
    const description = document.getElementById('classmateDescription').value.trim();
    const photoFile = document.getElementById('classmatePhotoFile').files[0];
    
    if (!name) {
        showToast('姓名不能为空', 'error');
        return;
    }
    
    try {
        // 使用 FormData 发送数据
        const formData = new FormData();
        formData.append('name', name);
        formData.append('graduationYear', graduationYear);
        formData.append('personality', personality);
        formData.append('contact', contact);
        formData.append('description', description);
        formData.append('existingPhoto', existingPhoto);
        
        if (photoFile) {
            formData.append('photo', photoFile);
        }
        
        let response;
        if (currentEditClassmateId) {
            // 编辑
            response = await fetch(`/api/admin/classmates/${currentEditClassmateId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
        } else {
            // 添加
            response = await fetch('/api/admin/classmates', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
        }
        
        if (response.ok) {
            showToast(currentEditClassmateId ? '同学录已更新' : '同学录已添加', 'success');
            closeClassmateModal();
            loadClassmates();
        } else {
            showToast('操作失败', 'error');
        }
    } catch (error) {
        console.error('保存失败:', error);
        showToast('操作失败', 'error');
    }
}

function openDeleteClassmateModal(classmateId) {
    currentDeleteClassmateId = classmateId;
    document.getElementById('deleteClassmateModal').classList.add('active');
}

function closeDeleteClassmateModal() {
    document.getElementById('deleteClassmateModal').classList.remove('active');
    currentDeleteClassmateId = null;
}

async function confirmDeleteClassmate() {
    if (!currentDeleteClassmateId) return;
    
    try {
        const response = await fetch(`/api/admin/classmates/${currentDeleteClassmateId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('同学录已删除', 'success');
            closeDeleteClassmateModal();
            loadClassmates();
        } else {
            showToast('删除失败', 'error');
        }
    } catch (error) {
        console.error('删除失败:', error);
        showToast('删除失败', 'error');
    }
}

// 辅助函数：HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 关于页面管理 ====================
let aboutData = null;

async function loadAboutPage() {
    try {
        const response = await fetch('/api/about');
        aboutData = await response.json();
        
        const container = document.getElementById('aboutPreview');
        
        if (!aboutData) {
            container.innerHTML = `
                <div class="admin-empty-state">
                    <iconify-icon icon="lucide:info-variant"></iconify-icon>
                    <h3>还没有设置关于页面</h3>
                    <p>点击上方"编辑内容"按钮开始设置</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="admin-about-content">
                <div class="admin-about-creator">
                    <div class="admin-about-avatar">
                        <iconify-icon icon="lucide:user-circle"></iconify-icon>
                    </div>
                    <div class="admin-about-info">
                        <h4>${escapeHtml(aboutData.creatorName)}</h4>
                        <p>${escapeHtml(aboutData.creatorRole)}</p>
                    </div>
                </div>
                
                <div class="admin-about-section">
                    <h4><iconify-icon icon="lucide:star"></iconify-icon> 项目介绍</h4>
                    <div class="admin-about-card">
                        ${aboutData.projectDesc ? `<p>${escapeHtml(aboutData.projectDesc)}</p>` : ''}
                        ${aboutData.projectDesc2 ? `<p>${escapeHtml(aboutData.projectDesc2)}</p>` : ''}
                    </div>
                </div>
                
                <div class="admin-about-section">
                    <h4><iconify-icon icon="lucide:lightbulb"></iconify-icon> 功能特性</h4>
                    <div class="admin-about-features">
                        <div class="admin-about-feature">
                            <div class="admin-about-feature-icon">
                                <iconify-icon icon="lucide:cloud-upload"></iconify-icon>
                            </div>
                            <h5>视频上传</h5>
                            <p>支持多种视频格式上传，保留高清回忆</p>
                        </div>
                        <div class="admin-about-feature">
                            <div class="admin-about-feature-icon">
                                <iconify-icon icon="tabler:users-group"></iconify-icon>
                            </div>
                            <h5>同学录</h5>
                            <p>记录每位同学的信息，永不失联</p>
                        </div>
                        <div class="admin-about-feature">
                            <div class="admin-about-feature-icon">
                                <iconify-icon icon="tabler:message-2"></iconify-icon>
                            </div>
                            <h5>互动留言</h5>
                            <p>在视频下留言互动，分享感受</p>
                        </div>
                        <div class="admin-about-feature">
                            <div class="admin-about-feature-icon">
                                <iconify-icon icon="lucide:sun-moon"></iconify-icon>
                            </div>
                            <h5>主题切换</h5>
                            <p>支持日间与夜间主题，护眼更舒适</p>
                        </div>
                    </div>
                </div>
                
                <div class="admin-about-section">
                    <h4><iconify-icon icon="lucide:wrench"></iconify-icon> 技术栈</h4>
                    <div class="admin-about-tech">
                        <div class="admin-about-tech-item">
                            <iconify-icon icon="mdi:language-html5"></iconify-icon>
                            <span>HTML5</span>
                        </div>
                        <div class="admin-about-tech-item">
                            <iconify-icon icon="mdi:language-css3"></iconify-icon>
                            <span>CSS3</span>
                        </div>
                        <div class="admin-about-tech-item">
                            <iconify-icon icon="mdi:language-javascript"></iconify-icon>
                            <span>JavaScript</span>
                        </div>
                        <div class="admin-about-tech-item">
                            <iconify-icon icon="mdi:nodejs"></iconify-icon>
                            <span>Node.js</span>
                        </div>
                    </div>
                </div>
                
                <div class="admin-about-section">
                    <h4><iconify-icon icon="lucide:heart"></iconify-icon> 致谢</h4>
                    <div class="admin-about-card">
                        ${aboutData.thanks ? `<p>${escapeHtml(aboutData.thanks)}</p>` : ''}
                        ${aboutData.thanks2 ? `<p class="admin-about-thanks">${escapeHtml(aboutData.thanks2)}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('加载关于页面失败:', error);
        const container = document.getElementById('aboutPreview');
        container.innerHTML = `
            <div class="admin-empty-state">
                <iconify-icon icon="lucide:alert-triangle-circle"></iconify-icon>
                <h3>加载失败</h3>
                <p>请稍后重试</p>
            </div>
        `;
    }
}

function openEditAboutModal() {
    document.getElementById('aboutCreatorName').value = aboutData?.creatorName || '';
    document.getElementById('aboutCreatorRole').value = aboutData?.creatorRole || '';
    document.getElementById('aboutProjectDesc').value = aboutData?.projectDesc || '';
    document.getElementById('aboutProjectDesc2').value = aboutData?.projectDesc2 || '';
    document.getElementById('aboutThanks').value = aboutData?.thanks || '';
    document.getElementById('aboutThanks2').value = aboutData?.thanks2 || '';
    document.getElementById('aboutModal').classList.add('active');
}

function closeAboutModal() {
    document.getElementById('aboutModal').classList.remove('active');
}

async function saveAbout() {
    const creatorName = document.getElementById('aboutCreatorName').value.trim();
    const creatorRole = document.getElementById('aboutCreatorRole').value.trim();
    const projectDesc = document.getElementById('aboutProjectDesc').value.trim();
    const projectDesc2 = document.getElementById('aboutProjectDesc2').value.trim();
    const thanks = document.getElementById('aboutThanks').value.trim();
    const thanks2 = document.getElementById('aboutThanks2').value.trim();
    
    try {
        const response = await fetch('/api/admin/about', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                creatorName,
                creatorRole,
                projectDesc,
                projectDesc2,
                thanks,
                thanks2
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            aboutData = result.about;
            showToast('关于页面已更新', 'success');
            closeAboutModal();
            loadAboutPage();
        } else {
            showToast('操作失败', 'error');
        }
    } catch (error) {
        console.error('保存失败:', error);
        showToast('操作失败', 'error');
    }
}

// ==================== Permission Management ====================

let currentPermissionUser = null;
let allPermissionUsers = [];
let permissionTemplates = {};
let currentAuditPage = 1;
let confirmCallback = null;

// Check if current user is super admin
function isSuperAdmin() {
    return currentAdminUser && (currentAdminUser.role === 'superadmin' || currentAdminUser.isSuperAdmin);
}

// Show/hide super admin only elements
function updateSuperAdminUI() {
    console.log('updateSuperAdminUI called, currentAdminUser:', currentAdminUser);
    console.log('isSuperAdmin:', isSuperAdmin());
    
    const superAdminElements = document.querySelectorAll('.superadmin-only');
    console.log('Found superadmin-only elements:', superAdminElements.length);
    
    superAdminElements.forEach((el, index) => {
        console.log(`Element ${index}:`, el.textContent.trim());
        el.style.display = isSuperAdmin() ? 'flex' : 'none';
    });
    
    // Update admin role display
    const adminRoleEl = document.querySelector('.admin-role');
    if (adminRoleEl) {
        adminRoleEl.textContent = isSuperAdmin() ? '超级管理员' : '管理员';
    }
}

// Load permission users
async function loadPermissionUsers() {
    console.log('loadPermissionUsers called');
    const container = document.getElementById('permissionUsersList');
    if (!container) {
        console.error('permissionUsersList container not found');
        return;
    }
    
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found, redirecting to login');
        container.innerHTML = '<p class="empty-state">请先登录</p>';
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }
    
    container.innerHTML = `
        <div class="loading-state">
            <iconify-icon icon="tabler:loader-2" width="48" height="48" class="spin"></iconify-icon>
            <p>加载中...</p>
        </div>
    `;
    
    try {
        console.log('Fetching /api/admin/users/all');
        const headers = getAuthHeaders();
        console.log('Request headers:', headers);
        
        const response = await fetch('/api/admin/users/all', {
            headers: headers
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            allPermissionUsers = await response.json();
            console.log('Loaded users:', allPermissionUsers.length);
            renderPermissionUsers();
        } else if (response.status === 401) {
            console.error('Unauthorized - token invalid or expired');
            container.innerHTML = '<p class="empty-state">登录已过期，请重新登录</p>';
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => window.location.href = '/', 2000);
        } else if (response.status === 403) {
            const errorData = await response.json();
            console.error('Permission denied:', errorData);
            container.innerHTML = '<p class="empty-state">权限不足: ' + (errorData.error || '无法访问') + '</p>';
        } else {
            const error = await response.text();
            console.error('Failed to load users:', error);
            container.innerHTML = '<p class="empty-state">加载失败: ' + error + '</p>';
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
        container.innerHTML = '<p class="empty-state">加载失败: ' + error.message + '</p>';
    }
}

// Render permission users with filters
function renderPermissionUsers() {
    const container = document.getElementById('permissionUsersList');
    const searchTerm = document.getElementById('permissionUserSearch')?.value?.toLowerCase() || '';
    const roleFilter = document.getElementById('permissionRoleFilter')?.value || '';
    
    let filteredUsers = allPermissionUsers.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm) || 
                             (user.name && user.name.toLowerCase().includes(searchTerm));
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });
    
    if (filteredUsers.length === 0) {
        container.innerHTML = `
            <div class="admin-empty-state">
                <iconify-icon icon="lucide:user-off" width="64" height="64"></iconify-icon>
                <h3>没有找到用户</h3>
                <p>尝试调整搜索条件</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredUsers.map(user => `
        <div class="permission-user-card">
            <div class="permission-user-info">
                <div class="permission-user-avatar">
                    <iconify-icon icon="lucide:user" width="24" height="24"></iconify-icon>
                </div>
                <div class="permission-user-details">
                    <h4>${escapeHtml(user.username)} ${user.name ? `(${escapeHtml(user.name)})` : ''}</h4>
                    <p>
                        <span class="admin-role-badge ${user.role}">${getRoleDisplayName(user.role)}</span>
                        ${user.isBanned ? '<span class="admin-role-badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; margin-left: 8px;">已封禁</span>' : ''}
                    </p>
                </div>
            </div>
            <div class="permission-user-actions">
                <button class="permission-action-icon-btn" onclick="openPermissionModal(${user.id})" title="管理权限">
                    <iconify-icon icon="lucide:shield-cog" width="20" height="20"></iconify-icon>
                </button>
            </div>
        </div>
    `).join('');
}

// Get role display name
function getRoleDisplayName(role) {
    const names = {
        'superadmin': '超级管理员',
        'admin': '管理员',
        'moderator': '版主',
        'user': '普通用户'
    };
    return names[role] || role;
}

// Open permission modal
async function openPermissionModal(userId) {
    currentPermissionUser = allPermissionUsers.find(u => u.id === userId);
    if (!currentPermissionUser) return;
    
    // Load permission templates if not loaded
    if (Object.keys(permissionTemplates).length === 0) {
        await loadPermissionTemplates();
    }
    
    // Update modal content
    document.getElementById('permissionUsername').textContent = currentPermissionUser.username;
    document.getElementById('permissionCurrentRole').textContent = `当前角色：${getRoleDisplayName(currentPermissionUser.role)}`;
    
    // Update role buttons
    const promoteBtn = document.getElementById('promoteUserBtn');
    const demoteBtn = document.getElementById('demoteUserBtn');
    
    if (promoteBtn) {
        promoteBtn.disabled = currentPermissionUser.role === 'admin' || currentPermissionUser.role === 'superadmin';
    }
    if (demoteBtn) {
        demoteBtn.disabled = currentPermissionUser.role !== 'admin';
    }
    
    // Update permission checkboxes
    updatePermissionCheckboxes(currentPermissionUser.permissions || []);
    
    // Show modal
    document.getElementById('permissionModal').classList.add('active');
}

// Close permission modal
function closePermissionModal() {
    document.getElementById('permissionModal').classList.remove('active');
    currentPermissionUser = null;
}

// Load permission templates
async function loadPermissionTemplates() {
    try {
        const response = await fetch('/api/admin/permissions', {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            // 新的API格式：{ permissions, roles, groups, descriptions }
            permissionTemplates = {};
            if (data.roles) {
                data.roles.forEach(role => {
                    permissionTemplates[role.id] = role;
                });
            }
            // 保存权限描述信息供后续使用
            window.permissionDescriptions = data.descriptions || {};
            window.permissionGroups = data.groups || {};
        }
    } catch (error) {
        console.error('加载权限模板失败:', error);
    }
}

// Update permission checkboxes
function updatePermissionCheckboxes(userPermissions) {
    const checkboxes = document.querySelectorAll('#permissionModal .permission-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        const permission = checkbox.dataset.permission;
        checkbox.checked = userPermissions.includes(permission);
    });
}

// Apply permission template
function applyPermissionTemplate(templateName) {
    const template = permissionTemplates[templateName];
    if (!template) return;
    
    updatePermissionCheckboxes(template.permissions);
    showToast(`已应用${template.name}模板`, 'success');
}

// Clear all permissions
function clearAllPermissions() {
    const checkboxes = document.querySelectorAll('#permissionModal .permission-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    showToast('已清除所有权限', 'info');
}

// Get selected permissions from modal
function getSelectedPermissions() {
    const checkboxes = document.querySelectorAll('#permissionModal .permission-checkbox input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.dataset.permission);
}

// Save user permissions
async function saveUserPermissions() {
    if (!currentPermissionUser) return;
    
    const permissions = getSelectedPermissions();
    
    try {
        const response = await fetch(`/api/admin/users/${currentPermissionUser.id}/permissions`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ permissions })
        });
        
        if (response.ok) {
            showToast('权限已更新', 'success');
            closePermissionModal();
            loadPermissionUsers();
        } else {
            const error = await response.json();
            showToast(error.error || '更新失败', 'error');
        }
    } catch (error) {
        console.error('保存权限失败:', error);
        showToast('保存失败', 'error');
    }
}

// Promote user to admin
async function promoteUser() {
    if (!currentPermissionUser) return;
    
    showConfirmModal({
        title: '提升用户',
        message: `确定要将用户 "${currentPermissionUser.username}" 提升为管理员吗？`,
        warning: '该用户将获得管理员权限',
        onConfirm: async () => {
            try {
                const response = await fetch(`/api/admin/users/${currentPermissionUser.id}/promote`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    showToast('用户已提升为管理员', 'success');
                    closePermissionModal();
                    loadPermissionUsers();
                } else {
                    const error = await response.json();
                    showToast(error.error || '操作失败', 'error');
                }
            } catch (error) {
                console.error('提升用户失败:', error);
                showToast('操作失败', 'error');
            }
        }
    });
}

// Demote user to regular user
async function demoteUser() {
    if (!currentPermissionUser) return;
    
    showConfirmModal({
        title: '降级用户',
        message: `确定要将管理员 "${currentPermissionUser.username}" 降级为普通用户吗？`,
        warning: '该用户将失去所有管理员权限',
        onConfirm: async () => {
            try {
                const response = await fetch(`/api/admin/users/${currentPermissionUser.id}/demote`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    showToast('管理员已降级为普通用户', 'success');
                    closePermissionModal();
                    loadPermissionUsers();
                } else {
                    const error = await response.json();
                    showToast(error.error || '操作失败', 'error');
                }
            } catch (error) {
                console.error('降级用户失败:', error);
                showToast('操作失败', 'error');
            }
        }
    });
}

// ==================== Confirm Modal ====================

function showConfirmModal({ title, message, warning, onConfirm }) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmWarning').textContent = warning;
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}

function executeConfirmedAction() {
    if (confirmCallback) {
        confirmCallback();
        closeConfirmModal();
    }
}

// ==================== Audit Logs ====================

async function loadAuditLogs(page = 1) {
    console.log('loadAuditLogs called, page:', page);
    const container = document.getElementById('auditList');
    if (!container) {
        console.error('auditList container not found');
        return;
    }
    
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found, redirecting to login');
        container.innerHTML = '<p class="empty-state">请先登录</p>';
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }
    
    container.innerHTML = `
        <div class="loading-state">
            <iconify-icon icon="tabler:loader-2" width="48" height="48" class="spin"></iconify-icon>
            <p>加载中...</p>
        </div>
    `;
    
    try {
        const actionFilter = document.getElementById('auditActionFilter')?.value || '';
        console.log('Fetching audit logs, page:', page, 'filter:', actionFilter);
        
        const response = await fetch(`/api/admin/audit-logs?page=${page}&limit=20`, {
            headers: getAuthHeaders()
        });
        
        console.log('Audit logs response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            let logs = data.logs || [];
            console.log('Loaded audit logs:', logs.length);
            
            // Filter by action if selected
            if (actionFilter) {
                logs = logs.filter(log => log.action === actionFilter);
            }
            
            renderAuditLogs(logs);
            renderAuditPagination(data.page, data.totalPages, data.total);
        } else if (response.status === 401) {
            console.error('Unauthorized - token invalid or expired');
            container.innerHTML = '<p class="empty-state">登录已过期，请重新登录</p>';
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => window.location.href = '/', 2000);
        } else if (response.status === 403) {
            const errorData = await response.json();
            console.error('Permission denied:', errorData);
            container.innerHTML = '<p class="empty-state">权限不足: ' + (errorData.error || '无法访问') + '</p>';
        } else {
            const error = await response.text();
            console.error('Failed to load audit logs:', error);
            container.innerHTML = '<p class="empty-state">加载失败: ' + error + '</p>';
        }
    } catch (error) {
        console.error('加载审计日志失败:', error);
        container.innerHTML = '<p class="empty-state">加载失败</p>';
    }
}

function renderAuditLogs(logs) {
    const container = document.getElementById('auditList');
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="admin-empty-state">
                <iconify-icon icon="tabler:clipboard-text" width="64" height="64"></iconify-icon>
                <h3>暂无审计日志</h3>
                <p>系统操作记录将显示在这里</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = logs.map(log => {
        const iconConfig = getAuditLogIcon(log.action);
        const timeAgo = formatTimeAgo(new Date(log.timestamp));
        
        return `
            <div class="audit-log-item">
                <div class="audit-log-icon ${iconConfig.class}">
                    <iconify-icon icon="${iconConfig.icon}" width="24" height="24"></iconify-icon>
                </div>
                <div class="audit-log-content">
                    <div class="audit-log-header">
                        <span class="audit-log-action">${getAuditActionName(log.action)}</span>
                        <span class="audit-log-time">${timeAgo}</span>
                    </div>
                    <div class="audit-log-details">
                        ${getAuditLogDetails(log)}
                    </div>
                    <div class="audit-log-performer">
                        操作者: ${escapeHtml(log.performedByUsername || '未知')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getAuditLogIcon(action) {
    const icons = {
        'USER_PROMOTE': { icon: 'lucide:chevron-up', class: 'promote' },
        'USER_DEMOTE': { icon: 'lucide:chevron-down', class: 'demote' },
        'PERMISSION_UPDATE': { icon: 'lucide:shield-check', class: 'permission' },
        'USER_BAN': { icon: 'tabler:user-x', class: 'ban' },
        'USER_UNBAN': { icon: 'tabler:user-check', class: 'promote' }
    };
    return icons[action] || { icon: 'lucide:info', class: '' };
}

function getAuditActionName(action) {
    const names = {
        'USER_PROMOTE': '提升用户',
        'USER_DEMOTE': '降级用户',
        'PERMISSION_UPDATE': '更新权限',
        'USER_BAN': '封禁用户',
        'USER_UNBAN': '解封用户'
    };
    return names[action] || action;
}

function getAuditLogDetails(log) {
    if (log.action === 'USER_PROMOTE') {
        return `将用户 "${escapeHtml(log.targetUsername || '未知')}" 从 ${getRoleDisplayName(log.details?.oldRole)} 提升为 ${getRoleDisplayName(log.details?.newRole)}`;
    } else if (log.action === 'USER_DEMOTE') {
        return `将管理员 "${escapeHtml(log.targetUsername || '未知')}" 降级为普通用户`;
    } else if (log.action === 'PERMISSION_UPDATE') {
        return `更新了用户 "${escapeHtml(log.targetUsername || '未知')}" 的权限设置`;
    }
    return log.details ? JSON.stringify(log.details) : '';
}

function renderAuditPagination(currentPage, totalPages, total) {
    const container = document.getElementById('auditPagination');
    if (!container) return;
    
    let html = `
        <button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="loadAuditLogs(${currentPage - 1})">
            <iconify-icon icon="tabler:chevron-left" width="20" height="20"></iconify-icon>
        </button>
        <span class="pagination-info">第 ${currentPage} / ${totalPages} 页 (共 ${total} 条)</span>
        <button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="loadAuditLogs(${currentPage + 1})">
            <iconify-icon icon="tabler:chevron-right" width="20" height="20"></iconify-icon>
        </button>
    `;
    
    container.innerHTML = html;
}

function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 30) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Initialize ====================

// Update initAdmin to include super admin UI
// Initialize admin panel
async function initAdmin() {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (!savedUser || !savedToken) {
        window.location.href = '/';
        return;
    }
    
    currentAdminUser = JSON.parse(savedUser);
    
    // Check if user has admin access (admin or superadmin or has any management permission)
    const hasAdminAccess = currentAdminUser.role === 'admin' || 
                           currentAdminUser.role === 'superadmin' || 
                           currentAdminUser.isSuperAdmin;
    
    // 如果不是管理员角色，检查是否有任何管理权限
    if (!hasAdminAccess) {
        const managementPermissions = [
            'video_audit', 'video_manage', 'video_delete',
            'photo_manage', 'photo_delete',
            'comment_manage', 'comment_delete',
            'user_management', 'user_ban', 'user_unban',
            'classmates_manage', 'about_manage', 'statistics_view',
            'permission_manage', 'audit_log_view'
        ];
        
        const userPerms = currentAdminUser.permissions || [];
        const hasManagementPermission = managementPermissions.some(p => userPerms.includes(p));
        
        if (!hasManagementPermission) {
            window.location.href = '/';
            return;
        }
    }
    
    document.getElementById('adminName').textContent = currentAdminUser.username;
    
    // 首先根据本地存储的权限更新菜单显示
    userPermissions = currentAdminUser.permissions || [];
    
    // 安全存储权限到sessionStorage（加密）
    PermissionSecurity.storePermissions(userPermissions);
    
    updateMenuVisibility();
    
    // Update super admin UI
    updateSuperAdminUI();
    
    bindMenuEvents();
    loadAdminData();
    
    // 初始化统计卡片（默认显示视频管理的统计）
    updateStatsForTab('manage');
    
    // 异步获取最新权限并更新菜单
    await fetchUserPermissions();
    
    // 启动权限实时监控
    startPermissionMonitoring();
};

// Handle tab switching
function switchTab(tab) {
    // 检查当前用户是否有权限访问该页面
    if (!checkTabPermission(tab)) {
        console.warn(`Access denied to tab: ${tab}`);
        showToast('您没有权限访问此页面', 'error');
        
        // 切换到第一个有权限的页面
        const firstAccessibleTab = findFirstAccessibleTab();
        if (firstAccessibleTab && firstAccessibleTab !== tab) {
            // 更新菜单激活状态
            document.querySelectorAll('.admin-menu-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.tab === firstAccessibleTab) {
                    item.classList.add('active');
                }
            });
            // 递归调用switchTab切换到可访问页面
            switchTab(firstAccessibleTab);
        }
        return;
    }
    
    const tabTitles = {
        'videos': '视频审核',
        'manage': '视频管理',
        'photos': '图片管理',
        'users': '用户管理',
        'classmates': '同学录管理',
        'about': '关于页面',
        'comments': '评论管理',
        'statistics': '数据统计',
        'permissions': '权限管理',
        'audit': '审计日志'
    };
    document.getElementById('pageTitle').textContent = tabTitles[tab] || '管理后台';
    
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabMap = {
        'videos': 'videosTab',
        'manage': 'manageTab',
        'photos': 'photosTab',
        'users': 'usersTab',
        'classmates': 'classmatesTab',
        'about': 'aboutTab',
        'comments': 'commentsTab',
        'statistics': 'statisticsTab',
        'permissions': 'permissionsTab',
        'audit': 'auditTab'
    };
    
    const tabElement = document.getElementById(tabMap[tab]);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    // Load data for specific tabs
    if (tab === 'manage') loadVideosForTab('pending');
    if (tab === 'photos') loadAdminPhotos('pending');
    if (tab === 'users') loadUsers();
    if (tab === 'classmates') loadClassmates();
    if (tab === 'about') loadAboutPage();
    if (tab === 'comments') loadComments();
    if (tab === 'permissions') {
        console.log('Switching to permissions tab, calling loadPermissionUsers...');
        loadPermissionUsers();
    }
    if (tab === 'audit') {
        console.log('Switching to audit tab, calling loadAuditLogs...');
        loadAuditLogs();
    }
    
    // 更新统计卡片显示
    updateStatsForTab(tab);
};

// ==================== 图片管理功能 ====================

let currentPhotoTab = 'pending';
let allPhotoBatches = []; // 存储所有图片数据用于搜索
let confirmActionCallback = null; // 确认对话框回调

// 切换图片标签
function switchPhotoTab(tab, event) {
    currentPhotoTab = tab;

    // 更新按钮样式 - 使用新的选择器
    document.querySelectorAll('.photo-filter-tab').forEach(btn => {
        btn.classList.remove('active');
    });

    // 如果传入了事件对象，使用它；否则尝试从当前活动元素获取
    if (event && event.target) {
        event.target.closest('.photo-filter-tab').classList.add('active');
    } else {
        // 根据tab值找到对应的按钮并激活
        const tabButtons = document.querySelectorAll('.photo-filter-tab');
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tab || btn.textContent.includes(tab === 'pending' ? '待审核' : '全部')) {
                btn.classList.add('active');
            }
        });
    }

    // 加载对应数据
    loadAdminPhotos(tab);
}

// 加载图片列表（管理员）
async function loadAdminPhotos(tab = 'pending') {
    const container = document.getElementById('photoList');
    if (!container) return;

    container.innerHTML = `
        <div class="photo-loading">
            <iconify-icon icon="tabler:loader-2" width="48" height="48" class="spin"></iconify-icon>
            <p style="margin-top: 16px; color: #64748b;">加载中...</p>
        </div>
    `;

    try {
        const endpoint = tab === 'pending' ? '/api/photos/pending' : '/api/admin/photos';
        const token = localStorage.getItem('token');
        console.log(`[DEBUG] 加载图片列表，标签: ${tab}, 端点: ${endpoint}`);
        console.log(`[DEBUG] Token存在: ${!!token}, Token前20字符: ${token ? token.substring(0, 20) + '...' : 'null'}`);

        const response = await fetch(endpoint, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ERROR] API请求失败: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`加载失败: ${response.status} ${response.statusText}`);
        }

        let batches = await response.json();
        console.log(`[DEBUG] API返回数据:`, batches);

        // 根据标签过滤数据：全部图片标签只显示已通过和已拒绝的
        if (tab === 'all') {
            batches = batches.filter(b => b.status !== 'pending');
        }

        console.log(`[DEBUG] 过滤后批次数量: ${batches.length}`);
        allPhotoBatches = batches; // 保存数据用于搜索

        // 更新统计数据
        updatePhotoStats(batches, tab);

        // 更新待审核数量徽章
        if (tab === 'pending') {
            const pendingCount = batches.length;
            const badge = document.getElementById('pendingPhotoCount');
            const tabBadge = document.getElementById('tabPendingCount');
            if (badge) {
                badge.textContent = pendingCount;
                badge.style.display = pendingCount > 0 ? 'flex' : 'none';
            }
            if (tabBadge) {
                tabBadge.textContent = pendingCount;
            }
        }

        renderPhotoBatches(batches);
        
    } catch (error) {
        console.error('加载图片列表失败:', error);
        container.innerHTML = `
            <div class="photo-empty-state">
                <div class="photo-empty-icon">
                    <iconify-icon icon="lucide:alert-triangle-circle" width="48" height="48" style="color: #ef4444;"></iconify-icon>
                </div>
                <h3 class="photo-empty-title">加载失败</h3>
                <p class="photo-empty-desc">无法加载图片列表，请刷新页面重试</p>
            </div>
        `;
    }
}

// 更新统计卡片
function updatePhotoStats(batches, tab) {
    const pendingCount = batches.filter(b => b.status === 'pending').length;
    const approvedCount = batches.filter(b => b.status === 'approved').length;
    const rejectedCount = batches.filter(b => b.status === 'rejected').length;
    const totalCount = batches.reduce((sum, b) => sum + (b.photos ? b.photos.length : 0), 0);
    
    // 动画更新数字
    animateNumber('statPending', pendingCount);
    animateNumber('statApproved', approvedCount);
    animateNumber('statRejected', rejectedCount);
    animateNumber('statTotal', totalCount);
}

// 数字动画
function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeProgress);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// 渲染图片批次列表
function renderPhotoBatches(batches) {
    console.log(`[DEBUG] renderPhotoBatches 被调用，批次数量: ${batches ? batches.length : 0}`);
    const container = document.getElementById('photoList');
    if (!container) {
        console.error('[ERROR] photoList 容器未找到');
        return;
    }

    if (!batches || batches.length === 0) {
        console.log('[DEBUG] 没有批次数据，显示空状态');
        const isSearch = document.getElementById('photoSearchInput')?.value.trim() !== '';
        container.innerHTML = `
            <div class="photo-empty-state">
                <div class="photo-empty-icon">
                    <iconify-icon icon="tabler:photo-off" width="48" height="48" style="color: #3b82f6;"></iconify-icon>
                </div>
                <h3 class="photo-empty-title">${isSearch ? '未找到匹配的图片' : (currentPhotoTab === 'pending' ? '暂无待审核图片' : '暂无图片')}</h3>
                <p class="photo-empty-desc">${isSearch ? '请尝试其他搜索关键词' : (currentPhotoTab === 'pending' ? '太棒了！所有图片已审核完毕' : '还没有用户上传图片')}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = batches.map((batch, index) => {
        const firstPhoto = batch.photos && batch.photos.length > 0 ? batch.photos[0] : null;
        const statusClass = batch.status;
        const statusText = batch.status === 'approved' ? '已通过' : 
                          batch.status === 'rejected' ? '已拒绝' : '待审核';
        
        return `
            <div class="photo-audit-card ${statusClass}" style="animation: fadeInUp 0.5s ease ${index * 0.08}s both;">
                <div class="photo-card-preview" onclick="viewPhotoBatch('${batch.id}')">
                    ${firstPhoto 
                        ? `<img src="/uploads/${firstPhoto.filename}" alt="${escapeHtml(batch.title)}">`
                        : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(59, 130, 246, 0.1);"><iconify-icon icon="lucide:image" width="48" height="48" style="color: #3b82f6;"></iconify-icon></div>`
                    }
                    <div class="photo-count-badge">
                        <iconify-icon icon="lucide:image-multiple" width="14" height="14"></iconify-icon>
                        <span>${batch.photoCount || (batch.photos && batch.photos.length) || 0} 张</span>
                    </div>
                    <div class="photo-card-overlay">
                        <button class="btn-view-details">
                            <iconify-icon icon="lucide:eye" width="18" height="18"></iconify-icon>
                            查看详情
                        </button>
                    </div>
                </div>
                <div class="photo-card-content">
                    <div class="photo-card-header">
                        <h4 class="photo-card-title">${escapeHtml(batch.title)}</h4>
                        <span class="photo-status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="photo-card-meta">
                        <div class="photo-meta-item">
                            <iconify-icon icon="lucide:user" width="16" height="16"></iconify-icon>
                            <span>${escapeHtml(batch.username)}</span>
                        </div>
                        <div class="photo-meta-item">
                            <iconify-icon icon="lucide:calendar" width="16" height="16"></iconify-icon>
                            <span>${new Date(batch.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                    </div>
                    ${batch.rejectReason ? `
                        <div class="photo-reject-reason">
                            <iconify-icon icon="lucide:alert-triangle" width="14" height="14" style="vertical-align: middle; margin-right: 4px;"></iconify-icon>
                            ${escapeHtml(batch.rejectReason)}
                        </div>
                    ` : ''}
                    <div class="photo-card-actions">
                        ${batch.status === 'pending' ? `
                            <button class="btn-approve" onclick="approvePhotoBatch('${batch.id}', event)">
                                <iconify-icon icon="lucide:check" width="16" height="16"></iconify-icon>
                                通过
                            </button>
                            <button class="btn-reject" onclick="rejectPhotoBatch('${batch.id}', event)">
                                <iconify-icon icon="lucide:x" width="16" height="16"></iconify-icon>
                                拒绝
                            </button>
                        ` : ''}
                        <button class="btn-delete" onclick="confirmDeletePhotoBatch('${batch.id}', event)">
                            <iconify-icon icon="tabler:trash" width="16" height="16"></iconify-icon>
                            删除
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 搜索图片
function searchPhotos(keyword) {
    if (!keyword.trim()) {
        renderPhotoBatches(allPhotoBatches);
        return;
    }
    
    const filtered = allPhotoBatches.filter(batch => 
        batch.title.toLowerCase().includes(keyword.toLowerCase()) ||
        batch.username.toLowerCase().includes(keyword.toLowerCase()) ||
        (batch.description && batch.description.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    renderPhotoBatches(filtered);
}

// 查看图片批次详情
async function viewPhotoBatch(batchId) {
    try {
        console.log(`[DEBUG] 查看图片详情 - batchId: ${batchId}`);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/photos/${batchId}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[ERROR] 获取图片详情失败:', errorData);
            throw new Error(errorData.error || '加载失败');
        }

        const batch = await response.json();
        console.log(`[DEBUG] 获取到图片详情:`, batch);
        
        // 使用主页的图片详情模态框显示
        currentPhotoBatch = batch;
        currentPhotoIndex = 0;
        
        // 更新详情信息
        document.getElementById('photoDetailTitle').textContent = batch.title;
        document.getElementById('photoDetailDescription').textContent = batch.description || '暂无描述';
        document.getElementById('photoDetailAuthor').textContent = batch.username;
        document.getElementById('photoDetailCategory').textContent = batch.category || '未分类';
        document.getElementById('photoDetailDate').textContent = new Date(batch.created_at).toLocaleDateString('zh-CN');
        document.getElementById('photoDetailCount').textContent = `共 ${batch.photos.length} 张`;
        
        // 显示第一张图片
        updatePhotoViewer();
        
        // 渲染缩略图
        renderPhotoThumbnails();
        
        // 显示模态框
        document.getElementById('photoDetailModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // 根据状态显示/隐藏审核按钮
        const approveBtn = document.getElementById('btnApprovePhoto');
        const rejectBtn = document.getElementById('btnRejectPhoto');
        if (approveBtn && rejectBtn) {
            if (batch.status === 'pending') {
                approveBtn.style.display = 'flex';
                rejectBtn.style.display = 'flex';
            } else {
                approveBtn.style.display = 'none';
                rejectBtn.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('加载图片详情失败:', error);
        showToast('加载图片详情失败', 'error');
    }
}

// 更新图片查看器
function updatePhotoViewer() {
    if (!currentPhotoBatch || !currentPhotoBatch.photos[currentPhotoIndex]) return;

    const photo = currentPhotoBatch.photos[currentPhotoIndex];
    const img = document.getElementById('currentPhoto');
    if (!img) return;

    // 防止快速切换时的动画冲突
    if (img.classList.contains('switching-out') || img.classList.contains('switching-in')) {
        return;
    }

    // 添加淡出动画
    img.classList.add('switching-out');

    // 等待淡出动画完成后更新图片
    setTimeout(() => {
        // 创建新图片对象预加载
        const newImg = new Image();
        newImg.src = `/uploads/${photo.filename}`;

        newImg.onload = () => {
            img.src = newImg.src;
            img.alt = photo.originalName || '图片';

            // 移除淡出动画，添加淡入动画
            img.classList.remove('switching-out');
            img.classList.add('switching-in');

            // 淡入动画完成后清理
            setTimeout(() => {
                img.classList.remove('switching-in');
            }, 300);
        };

        newImg.onerror = () => {
            // 加载失败时显示占位图
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23333" width="400" height="300"/><text fill="%23888" x="50%" y="50%" text-anchor="middle" dy=".3em">加载失败</text></svg>';
            img.classList.remove('switching-out');
            img.classList.add('switching-in');
            setTimeout(() => {
                img.classList.remove('switching-in');
            }, 300);
        };
    }, 250);

    // 更新计数器
    const currentIndexEl = document.getElementById('currentPhotoIndex');
    const totalPhotosEl = document.getElementById('totalPhotos');
    if (currentIndexEl) currentIndexEl.textContent = currentPhotoIndex + 1;
    if (totalPhotosEl) totalPhotosEl.textContent = currentPhotoBatch.photos.length;

    // 更新导航按钮状态
    updateNavButtons();

    // 更新缩略图激活状态
    updateThumbnails();
}

// 更新导航按钮状态
function updateNavButtons() {
    const prevBtn = document.querySelector('.photo-nav-btn.prev');
    const nextBtn = document.querySelector('.photo-nav-btn.next');

    if (prevBtn) {
        const isFirst = currentPhotoIndex === 0;
        prevBtn.disabled = isFirst;
        prevBtn.style.opacity = isFirst ? '0.2' : '1';
        prevBtn.style.pointerEvents = isFirst ? 'none' : 'auto';
    }

    if (nextBtn) {
        const isLast = currentPhotoIndex === currentPhotoBatch.photos.length - 1;
        nextBtn.disabled = isLast;
        nextBtn.style.opacity = isLast ? '0.2' : '1';
        nextBtn.style.pointerEvents = isLast ? 'none' : 'auto';
    }
}

// 更新缩略图状态
function updateThumbnails() {
    document.querySelectorAll('.photo-thumbnail').forEach((thumb, index) => {
        thumb.classList.toggle('active', index === currentPhotoIndex);
        // 滚动到当前缩略图
        if (index === currentPhotoIndex) {
            thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    });
}

// 渲染缩略图
function renderPhotoThumbnails() {
    const container = document.getElementById('photoThumbnails');
    if (!container || !currentPhotoBatch) return;

    container.innerHTML = currentPhotoBatch.photos.map((photo, index) => `
        <div class="photo-thumbnail ${index === 0 ? 'active' : ''}" onclick="goToPhoto(${index})">
            <img src="/uploads/${photo.filename}" alt="">
        </div>
    `).join('');
}

// 切换锁定标志，防止快速点击
let isSwitching = false;

// 上一张图片
function prevPhoto() {
    if (isSwitching || !currentPhotoBatch || currentPhotoIndex <= 0) return;

    isSwitching = true;
    currentPhotoIndex--;
    updatePhotoViewer();

    // 动画完成后解锁
    setTimeout(() => {
        isSwitching = false;
    }, 600);
}

// 下一张图片
function nextPhoto() {
    if (isSwitching || !currentPhotoBatch || currentPhotoIndex >= currentPhotoBatch.photos.length - 1) return;

    isSwitching = true;
    currentPhotoIndex++;
    updatePhotoViewer();

    // 动画完成后解锁
    setTimeout(() => {
        isSwitching = false;
    }, 600);
}

// 跳转到指定图片
function goToPhoto(index) {
    if (currentPhotoBatch && index >= 0 && index < currentPhotoBatch.photos.length) {
        currentPhotoIndex = index;
        updatePhotoViewer();
    }
}

// 关闭图片详情
function closePhotoDetail() {
    const modal = document.getElementById('photoDetailModal');
    if (modal) {
        modal.classList.remove('active');
    }
    document.body.style.overflow = '';
    currentPhotoBatch = null;
    currentPhotoIndex = 0;
}

// 审核通过图片批次
async function approvePhotoBatch(batchId, event) {
    if (event) event.stopPropagation();

    try {
        console.log(`[DEBUG] 发送审核通过请求 - batchId: ${batchId}`);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/photos/${batchId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();
        console.log(`[DEBUG] 审核通过响应:`, data);

        if (response.ok) {
            showToast('图片批次已通过审核', 'success');
            loadAdminPhotos(currentPhotoTab);
        } else {
            // 处理不同的错误状态
            if (response.status === 404) {
                showToast(data.error || '相册不存在', 'error');
            } else if (response.status === 400) {
                showToast(data.error || '请求参数错误', 'warning');
            } else if (response.status === 403) {
                showToast(data.error || '权限不足', 'error');
            } else {
                showToast(data.error || '审核失败', 'error');
            }
            console.error('审核失败:', data);
        }
    } catch (error) {
        console.error('[ERROR] 审核图片失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 拒绝图片批次
async function rejectPhotoBatch(batchId, event) {
    if (event) event.stopPropagation();

    const reason = prompt('请输入拒绝原因：');
    if (reason === null) return;

    try {
        console.log(`[DEBUG] 发送拒绝审核请求 - batchId: ${batchId}, reason: ${reason}`);
        const response = await fetch(`/api/photos/${batchId}/reject`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();
        console.log(`[DEBUG] 拒绝审核响应:`, data);

        if (response.ok) {
            showToast('图片批次已拒绝', 'success');
            loadAdminPhotos(currentPhotoTab);
        } else {
            // 处理不同的错误状态
            if (response.status === 404) {
                showToast(data.error || '相册不存在', 'error');
            } else if (response.status === 400) {
                showToast(data.error || '请求参数错误', 'warning');
            } else {
                showToast(data.error || '拒绝失败', 'error');
            }
            console.error('拒绝失败:', data);
        }
    } catch (error) {
        console.error('[ERROR] 拒绝图片失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 显示确认删除对话框
function confirmDeletePhotoBatch(batchId, event) {
    if (event) event.stopPropagation();
    
    confirmActionCallback = () => deletePhotoBatch(batchId);
    
    document.getElementById('confirmTitle').textContent = '确认删除';
    document.getElementById('confirmMessage').textContent = '确定要删除这个图片批次吗？此操作不可恢复，图片将从系统中永久移除。';
    document.getElementById('confirmIcon').className = 'confirm-dialog-icon danger';
    document.getElementById('confirmIcon').innerHTML = '<iconify-icon icon="tabler:trash-alert" width="32" height="32"></iconify-icon>';
    document.getElementById('confirmBtn').textContent = '确认删除';
    
    document.getElementById('confirmDialog').classList.add('active');
}

// 关闭确认对话框
function closeConfirmDialog() {
    document.getElementById('confirmDialog').classList.remove('active');
    confirmActionCallback = null;
}

// 执行确认操作
function executeConfirmAction() {
    if (confirmActionCallback) {
        confirmActionCallback();
    }
    closeConfirmDialog();
}

// 删除图片批次
async function deletePhotoBatch(batchId) {
    try {
        console.log(`[DEBUG] 发送删除请求 - batchId: ${batchId}`);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/photos/${batchId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();
        console.log(`[DEBUG] 删除响应:`, data);

        if (response.ok) {
            showToast('图片批次已删除', 'success');
            loadAdminPhotos(currentPhotoTab);
        } else {
            // 处理不同的错误状态
            if (response.status === 404) {
                showToast(data.error || '相册不存在', 'error');
            } else if (response.status === 403) {
                showToast(data.error || '没有权限删除此相册', 'error');
            } else {
                showToast(data.error || '删除失败', 'error');
            }
            console.error('删除失败:', data);
        }
    } catch (error) {
        console.error('[ERROR] 删除图片失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 审核当前查看的图片批次
async function approveCurrentPhotoBatch() {
    if (!currentPhotoBatch) return;

    try {
        console.log(`[DEBUG] 从详情页发送审核通过请求 - batchId: ${currentPhotoBatch.id}`);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/photos/${currentPhotoBatch.id}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();
        console.log(`[DEBUG] 详情页审核通过响应:`, data);

        if (response.ok) {
            showToast('图片批次已通过审核', 'success');
            currentPhotoBatch.status = 'approved';
            // 隐藏审核按钮
            const btnApprove = document.getElementById('btnApprovePhoto');
            const btnReject = document.getElementById('btnRejectPhoto');
            if (btnApprove) btnApprove.style.display = 'none';
            if (btnReject) btnReject.style.display = 'none';
            loadAdminPhotos(currentPhotoTab);
        } else {
            if (response.status === 404) {
                showToast(data.error || '相册不存在', 'error');
            } else if (response.status === 403) {
                showToast(data.error || '权限不足', 'error');
            } else {
                showToast(data.error || '审核失败', 'error');
            }
            console.error('审核失败:', data);
        }
    } catch (error) {
        console.error('[ERROR] 审核图片失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 拒绝当前查看的图片批次
async function rejectCurrentPhotoBatch() {
    if (!currentPhotoBatch) return;

    const reason = prompt('请输入拒绝原因：');
    if (reason === null) return;

    try {
        console.log(`[DEBUG] 从详情页发送拒绝审核请求 - batchId: ${currentPhotoBatch.id}`);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/photos/${currentPhotoBatch.id}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();
        console.log(`[DEBUG] 详情页拒绝审核响应:`, data);

        if (response.ok) {
            showToast('图片批次已拒绝', 'success');
            currentPhotoBatch.status = 'rejected';
            currentPhotoBatch.rejectReason = reason;
            // 隐藏审核按钮
            const btnApprove = document.getElementById('btnApprovePhoto');
            const btnReject = document.getElementById('btnRejectPhoto');
            if (btnApprove) btnApprove.style.display = 'none';
            if (btnReject) btnReject.style.display = 'none';
            loadAdminPhotos(currentPhotoTab);
        } else {
            if (response.status === 404) {
                showToast(data.error || '相册不存在', 'error');
            } else if (response.status === 403) {
                showToast(data.error || '权限不足', 'error');
            } else {
                showToast(data.error || '拒绝失败', 'error');
            }
            console.error('拒绝失败:', data);
        }
    } catch (error) {
        console.error('[ERROR] 拒绝图片失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 删除当前查看的图片批次
async function deleteCurrentPhotoBatch() {
    if (!currentPhotoBatch) return;

    if (!confirm('确定要删除这个图片批次吗？此操作不可恢复。')) {
        return;
    }

    try {
        console.log(`[DEBUG] 从详情页发送删除请求 - batchId: ${currentPhotoBatch.id}`);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/photos/${currentPhotoBatch.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();
        console.log(`[DEBUG] 详情页删除响应:`, data);

        if (response.ok) {
            showToast('图片批次已删除', 'success');
            closePhotoDetail();
            loadAdminPhotos(currentPhotoTab);
        } else {
            if (response.status === 404) {
                showToast(data.error || '相册不存在', 'error');
            } else if (response.status === 403) {
                showToast(data.error || '权限不足', 'error');
            } else {
                showToast(data.error || '删除失败', 'error');
            }
            console.error('删除失败:', data);
        }
    } catch (error) {
        console.error('[ERROR] 删除图片失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 显示帮助文档
function showPhotoAuditHelp() {
    document.getElementById('photoAuditHelpModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 关闭帮助文档
function closePhotoAuditHelp() {
    document.getElementById('photoAuditHelpModal').classList.remove('active');
    document.body.style.overflow = '';
}

// 点击模态框外部关闭
['photoAuditHelpModal', 'confirmDialog'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => {
        if (e.target.id === id) {
            if (id === 'photoAuditHelpModal') {
                closePhotoAuditHelp();
            } else {
                closeConfirmDialog();
            }
        }
    });
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
