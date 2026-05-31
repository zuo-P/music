/**
 * ==========================================
 * 轻量化在线音乐播放器 - 核心逻辑文件
 * 课程：移动开发技术
 * 功能：实现线上歌曲列表加载与在线播放
 * ==========================================
 */

// ------------------------------
// 全局变量定义
// ------------------------------

/**
 * 公网音乐API地址（免费公开接口）
 * 接口来源：uomg.com 免费音乐API服务
 * 返回格式：JSON，包含歌曲名称、歌手、播放链接等信息
 */
const SONG_API = 'https://api.uomg.com/api/rand.music?sort=热歌榜&format=json';

/**
 * 音频播放器核心对象
 * 使用原生HTML5 Audio API实现音频播放
 */
let audio = null;

/**
 * 当前播放歌曲索引
 * -1表示未选择任何歌曲
 */
let currentSongIndex = -1;

/**
 * 歌曲列表数据
 * 存储从API获取的歌曲信息
 */
let songList = [];

/**
 * 筛选后的歌曲列表（用于搜索功能）
 */
let filteredList = [];

/**
 * 当前播放状态
 * true：正在播放，false：暂停
 */
let isPlaying = false;

// ------------------------------
// DOM元素引用
// ------------------------------
const songListEl = document.getElementById('songList');
const currentCoverEl = document.getElementById('currentCover');
const currentTitleEl = document.getElementById('currentTitle');
const currentArtistEl = document.getElementById('currentArtist');
const progressBarEl = document.getElementById('progressBar');
const progressFillEl = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const toastEl = document.getElementById('toast');
const searchInputEl = document.getElementById('searchInput');
const bottomProgressBarEl = document.getElementById('bottomProgressBar');
const bottomProgressFillEl = document.getElementById('bottomProgressFill');
const bottomCurrentTimeEl = document.getElementById('bottomCurrentTime');
const bottomDurationEl = document.getElementById('bottomDuration');

// ------------------------------
// 初始化函数（应用入口）
// ------------------------------

/**
 * 应用初始化函数
 * 在页面加载完成后执行，完成以下任务：
 * 1. 创建音频播放器对象
 * 2. 绑定音频事件监听器
 * 3. 加载歌曲列表
 * 4. 绑定用户交互事件
 */
function init() {
    console.log('[初始化] 开始初始化音乐播放器...');

    // 创建HTML5 Audio对象
    audio = new Audio();
    audio.crossOrigin = 'anonymous'; // 解决跨域问题

    // 绑定音频事件监听器
    bindAudioEvents();

    // 加载线上歌曲列表
    loadSongList();

    // 绑定用户交互事件
    bindUserEvents();

    console.log('[初始化] 音乐播放器初始化完成');
}

// ------------------------------
// 音频事件绑定
// ------------------------------

/**
 * 绑定音频播放器的事件监听器
 * 监听音频播放过程中的关键事件
 */
function bindAudioEvents() {
    // timeupdate：播放进度更新时触发
    audio.addEventListener('timeupdate', updateProgress);

    // loadedmetadata：音频元数据加载完成时触发（获取时长）
    audio.addEventListener('loadedmetadata', updateDuration);

    // ended：音频播放结束时触发
    audio.addEventListener('ended', playNext);

    // error：音频加载错误时触发
    audio.addEventListener('error', handleAudioError);
}

// ------------------------------
// 用户交互事件绑定
// ------------------------------

/**
 * 绑定用户交互事件
 * 为播放控制按钮和进度条添加点击事件
 */
function bindUserEvents() {
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrev);
    nextBtn.addEventListener('click', playNext);
    progressBarEl.addEventListener('click', seekTo);
    searchInputEl.addEventListener('input', handleSearch);
}

// ------------------------------
// 歌曲列表加载
// ------------------------------

/**
 * 加载歌曲列表
 * 优先使用 config.js 中的配置数据
 */
async function loadSongList() {
    console.log('[数据加载] 开始加载歌曲列表...');

    try {
        // 优先使用配置文件中的歌曲数据
        if (typeof SONGS_CONFIG !== 'undefined' && SONGS_CONFIG.length > 0) {
            songList = SONGS_CONFIG;
            filteredList = [...songList];
            console.log(`[数据加载] 成功加载配置文件中的 ${songList.length} 首歌曲`);
            renderSongList();
            return;
        }

        // 如果配置文件为空，尝试从公网API加载
        console.log('[数据加载] 配置文件为空，尝试从公网API加载...');
        const response = await fetch(SONG_API);

        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }

        const data = await response.json();

        if (data.code === 1 && data.data && data.data.list) {
            songList = data.data.list;
            filteredList = [...songList];
            console.log(`[数据加载] 成功从API加载 ${songList.length} 首歌曲`);
            renderSongList();
        } else {
            throw new Error('API返回数据格式异常');
        }

    } catch (error) {
        console.error('[数据加载] 加载失败:', error.message);
        showToast('加载失败，使用默认歌曲');
        loadDefaultSongs();
    }
}

/**
 * 加载默认歌曲数据（最终备用方案）
 */
function loadDefaultSongs() {
    console.log('[数据加载] 使用默认歌曲数据');

    songList = [
        { name: '晴天', author: '周杰伦', url: 'https://music.163.com/song/media/outer/url?id=186221.mp3' },
        { name: '后来', author: '刘若英', url: 'https://music.163.com/song/media/outer/url?id=167876.mp3' },
        { name: '夜曲', author: '周杰伦', url: 'https://music.163.com/song/media/outer/url?id=186224.mp3' },
        { name: '遇见', author: '孙燕姿', url: 'https://music.163.com/song/media/outer/url?id=167797.mp3' },
        { name: '稻香', author: '周杰伦', url: 'https://music.163.com/song/media/outer/url?id=27574415.mp3' },
        { name: '小幸运', author: '田馥甄', url: 'https://music.163.com/song/media/outer/url?id=36996254.mp3' },
        { name: '成全', author: '林宥嘉', url: 'https://music.163.com/song/media/outer/url?id=436514312.mp3' },
        { name: '追光者', author: '岑宁儿', url: 'https://music.163.com/song/media/outer/url?id=461623243.mp3' },
    ];

    filteredList = [...songList];
    renderSongList();
}

// ------------------------------
// 歌曲搜索功能
// ------------------------------

/**
 * 处理搜索输入
 * 根据用户输入过滤歌曲列表
 */
function handleSearch() {
    const keyword = searchInputEl.value.trim().toLowerCase();

    if (keyword === '') {
        filteredList = [...songList];
    } else {
        filteredList = songList.filter(song =>
            song.name.toLowerCase().includes(keyword) ||
            song.author.toLowerCase().includes(keyword)
        );
    }

    renderSongList(filteredList);

    if (filteredList.length === 0 && keyword !== '') {
        showToast('未找到匹配的歌曲');
    }
}

// ------------------------------
// 歌曲列表渲染
// ------------------------------

/**
 * 渲染歌曲列表到页面
 * 动态生成歌曲项HTML
 * @param {Array} list - 要渲染的歌曲列表（默认使用filteredList）
 */
function renderSongList(list) {
    const renderList = list || filteredList;
    console.log('[渲染] 开始渲染歌曲列表');

    // 检查歌曲列表是否为空
    if (renderList.length === 0) {
        songListEl.innerHTML = `
            <div class="empty-state">
                <div class="icon">🔍</div>
                <p>未找到歌曲，请尝试其他关键词</p>
            </div>
        `;
        return;
    }

    // 生成歌曲列表HTML
    songListEl.innerHTML = renderList.map((song, index) => {
        const originalIndex = songList.findIndex(s => s.url === song.url);
        return `
            <div class="song-item" onclick="selectSong(${originalIndex})">
                <div class="song-cover">🎵</div>
                <div class="song-info">
                    <div class="song-title">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.author)}</div>
                </div>
                <div class="play-btn">▶</div>
            </div>
        `;
    }).join('');

    console.log('[渲染] 歌曲列表渲染完成');
}

/**
 * HTML转义函数（安全处理）
 * 防止XSS攻击，转义特殊字符
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ------------------------------
// 歌曲播放控制
// ------------------------------

/**
 * 选择并播放指定歌曲
 * @param {number} index - 歌曲在列表中的索引
 */
function selectSong(index) {
    console.log(`[播放] 选择歌曲: ${index} - ${songList[index]?.name}`);

    // 更新选中状态样式
    document.querySelectorAll('.song-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    // 更新当前歌曲索引
    currentSongIndex = index;
    const song = songList[index];

    // 重置时长显示
    durationEl.textContent = '0:00';
    bottomDurationEl.textContent = '0:00';

    // 更新播放器显示信息
    currentTitleEl.textContent = song.name;
    currentArtistEl.textContent = song.author;

    // 设置音频源并尝试播放
    audio.src = song.url;
    audio.load(); // 强制开始加载

    // 音频元数据加载完成时更新时长
    audio.onloadedmetadata = () => {
        const duration = audio.duration;
        console.log(`[时长] 音频时长: ${duration}秒`);
        if (!isNaN(duration) && duration > 0) {
            durationEl.textContent = formatTime(duration);
            bottomDurationEl.textContent = formatTime(duration);
        } else {
            console.error('[时长] 无法获取音频时长，尝试预加载');
            // 如果无法获取时长，尝试另一种方式
            setTimeout(() => {
                const dur = audio.duration;
                if (!isNaN(dur) && dur > 0) {
                    durationEl.textContent = formatTime(dur);
                    bottomDurationEl.textContent = formatTime(dur);
                }
            }, 500);
        }
    };

    // 音频加载错误回调
    audio.onerror = (e) => {
        console.error('[错误] 音频加载失败:', e);
        showToast('音频加载失败，请检查网络');
    };

    audio.play().then(() => {
        isPlaying = true;
        updatePlayButton();
        currentCoverEl.classList.add('playing');
        showToast(`正在播放: ${song.name}`);
    }).catch(err => {
        console.error('[播放] 播放失败:', err.message);
        showToast('播放失败，请重试');
        handleAudioError();
    });
}

/**
 * 切换播放状态（播放/暂停）
 */
function togglePlay() {
    // 如果没有选择歌曲，自动选择第一首
    if (currentSongIndex < 0) {
        if (songList.length > 0) {
            selectSong(0);
        } else {
            showToast('暂无歌曲可播放');
        }
        return;
    }

    // 切换播放/暂停
    if (isPlaying) {
        audio.pause();
        showToast('已暂停');
    } else {
        audio.play().catch(err => {
            console.error('[播放] 继续播放失败:', err.message);
            showToast('播放失败');
        });
        showToast('继续播放');
    }

    // 更新状态和UI
    isPlaying = !isPlaying;
    updatePlayButton();
    currentCoverEl.classList.toggle('playing', isPlaying);
}

/**
 * 更新播放按钮显示状态
 */
function updatePlayButton() {
    playBtn.textContent = isPlaying ? '⏸' : '▶';
}

/**
 * 播放上一首歌曲
 */
function playPrev() {
    if (songList.length === 0) {
        showToast('暂无歌曲');
        return;
    }

    // 循环播放：如果是第一首，跳到最后一首
    currentSongIndex = currentSongIndex <= 0 ? songList.length - 1 : currentSongIndex - 1;
    selectSong(currentSongIndex);
}

/**
 * 播放下一首歌曲
 */
function playNext() {
    if (songList.length === 0) {
        showToast('暂无歌曲');
        return;
    }

    // 循环播放：如果是最后一首，跳到第一首
    currentSongIndex = currentSongIndex >= songList.length - 1 ? 0 : currentSongIndex + 1;
    selectSong(currentSongIndex);
}

// ------------------------------
// 进度条控制
// ------------------------------

/**
 * 更新播放进度条
 * 在timeupdate事件触发时调用
 */
function updateProgress() {
    const current = audio.currentTime;
    const duration = audio.duration;

    // 确保duration有效
    if (duration > 0 && !isNaN(duration)) {
        const percentage = (current / duration) * 100;
        progressFillEl.style.width = `${percentage}%`;
        bottomProgressFillEl.style.width = `${percentage}%`;
        currentTimeEl.textContent = formatTime(current);
        bottomCurrentTimeEl.textContent = formatTime(current);
    }
}

/**
 * 更新音频总时长显示
 * 在loadedmetadata事件触发时调用
 */
function updateDuration() {
    const duration = audio.duration;
    if (!isNaN(duration) && duration > 0) {
        const formattedTime = formatTime(duration);
        durationEl.textContent = formattedTime;
        bottomDurationEl.textContent = formattedTime;
    }
}

/**
 * 格式化时间显示（秒 -> mm:ss）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 进度条点击跳转
 * @param {Event} e - 点击事件对象
 */
function seekTo(e) {
    const rect = bottomProgressBarEl.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;

    // 确保百分比在有效范围内
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    audio.currentTime = clampedPercentage * audio.duration;
}

// ------------------------------
// 错误处理
// ------------------------------

/**
 * 处理音频播放错误
 */
function handleAudioError() {
    console.error('[错误] 音频播放错误:', audio.error?.message);
    showToast('音频加载失败，请检查网络或尝试其他歌曲');

    // 尝试播放下一首
    if (songList.length > 0 && currentSongIndex >= 0) {
        setTimeout(() => {
            playNext();
        }, 1000);
    }
}

// ------------------------------
// 辅助函数
// ------------------------------

/**
 * 显示提示消息
 * @param {string} message - 提示内容
 */
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');

    // 3秒后自动隐藏
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3000);
}

// ------------------------------
// 页面加载完成后初始化
// ------------------------------

document.addEventListener('DOMContentLoaded', init);