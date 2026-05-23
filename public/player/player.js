class VideoPlayer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.video = this.container.querySelector('.vp-video');
        this.wrapper = this.container.querySelector('.vp-video-wrapper');
        this.overlay = this.container.querySelector('.vp-overlay');
        this.playBtnLarge = this.container.querySelector('.vp-play-btn-large');
        this.controls = this.container.querySelector('.vp-controls');

        this.playPauseBtn = document.getElementById('vpPlayPauseBtn');
        this.muteBtn = document.getElementById('vpMuteBtn');
        this.volumeSlider = document.getElementById('vpVolumeSlider');
        this.progressContainer = document.getElementById('vpProgressContainer');
        this.progressBar = document.getElementById('vpProgressBar');
        this.progressBuffered = document.getElementById('vpProgressBuffered');
        this.progressHandle = document.getElementById('vpProgressHandle');
        this.currentTimeEl = document.getElementById('vpCurrentTime');
        this.durationEl = document.getElementById('vpDuration');
        this.fullscreenBtn = document.getElementById('vpFullscreenBtn');
        this.pipBtn = document.getElementById('vpPipBtn');

        this.speedBtn = document.getElementById('vpSpeedBtn');
        this.speedLabel = document.getElementById('vpSpeedLabel');
        this.speedMenu = document.getElementById('vpSpeedMenu');

        this.qualityBtn = document.getElementById('vpQualityBtn');
        this.qualityLabel = document.getElementById('vpQualityLabel');
        this.qualityMenu = document.getElementById('vpQualityMenu');
        this.timeTooltip = document.getElementById('vpTimeTooltip');
        this.feedbackOverlay = document.getElementById('vpFeedbackOverlay');
        this.feedbackIcon = document.getElementById('vpFeedbackIcon');
        this.feedbackText = document.getElementById('vpFeedbackText');
        this.resumeCard = document.getElementById('vpResumeCard');
        this.resumeText = document.getElementById('vpResumeText');
        this.resumeContinue = document.getElementById('vpResumeContinue');
        this.resumeRestart = document.getElementById('vpResumeRestart');
        this.nextCard = document.getElementById('vpNextCard');
        this.nextCountdown = document.getElementById('vpNextCountdown');
        this.nextCancel = document.getElementById('vpNextCancel');
        this.helpBtn = document.getElementById('vpHelpBtn');
        this.helpPanel = document.getElementById('vpHelpPanel');
        this.helpClose = document.getElementById('vpHelpClose');
        this.screenshotBtn = document.getElementById('vpScreenshotBtn');
        this.loopBtn = document.getElementById('vpLoopBtn');

        this._lastClickTime = 0;
        this._clickTimer = null;
        this._destroyed = false;
        this._controlsTimer = null;
        this._idleTimer = null;
        this._controlsVisible = false;

        this._feedbackTimer = null;
        this._posSaveTimer = null;
        this._nextTimer = null;
        this._nextCountdownVal = 10;
        this._nextCancelled = false;
        this._miniPlayerEl = null;
        this._miniObserver = null;
        this._gestureStartX = 0;
        this._gestureStartY = 0;
        this._gestureActive = false;

        this._currentQuality = 'auto';
        this._availableQualities = [];
        this._videoId = null;
        this._baseSrc = null;
        this._autoSelectedQuality = null;
        this._qualitiesLoadFailed = false;

        this._currentSpeed = 1;
        this._speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

        this.initSpeed();
        this.bindEvents();
        this.initMiniPlayer();
        this.initTouchGestures();
        this.setState('paused');
    }

    bindEvents() {
        this.playBtnLarge.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.togglePlay();
        });

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                e.stopPropagation();
                e.preventDefault();
                this.togglePlay();
            }
        });

        this.wrapper.addEventListener('click', (e) => {
            if (e.target.closest('.vp-controls') || e.target.closest('.vp-play-btn-large') || e.target.closest('.vp-overlay')) return;
            if (e.target.closest('.vp-resume-card') || e.target.closest('.vp-next-card') || e.target.closest('.vp-help-panel')) return;
            const now = Date.now();
            if (now - this._lastClickTime < 300) {
                clearTimeout(this._clickTimer);
                this.toggleFullscreen();
                this.container.classList.add('vp-dblclick');
                setTimeout(() => this.container.classList.remove('vp-dblclick'), 300);
            } else {
                this._clickTimer = setTimeout(() => {
                    this.togglePlay();
                }, 300);
            }
            this._lastClickTime = now;
        });

        this.wrapper.addEventListener('touchend', (e) => {
            if (e.target.closest('.vp-controls')) return;
            if (e.target.closest('.vp-play-btn-large')) return;
            if (e.target.closest('.vp-overlay') && e.target !== this.overlay) return;
            if (e.target.closest('.vp-resume-card') || e.target.closest('.vp-next-card') || e.target.closest('.vp-help-panel')) return;
            e.preventDefault();
            this.showControls();
            this.togglePlay();
        }, { passive: false });

        this.wrapper.addEventListener('mousemove', (e) => this.onWrapperMove(e));

        this.playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlay();
        });

        this.muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute();
        });

        this.volumeSlider.addEventListener('input', (e) => {
            this.setVolume(parseFloat(e.target.value));
        });

        this.progressContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            this.seekTo(e);
        });

        this.progressContainer.addEventListener('mousedown', (e) => this.startDrag(e));
        this.progressContainer.addEventListener('touchstart', (e) => this.startTouchDrag(e), { passive: true });

        this.progressContainer.addEventListener('mousemove', (e) => this.showTimeTooltip(e));
        this.progressContainer.addEventListener('mouseleave', () => this.hideTimeTooltip());

        this.fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFullscreen();
        });

        this.pipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePiP();
        });

        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('loadedmetadata', () => this.updateDuration());
        this.video.addEventListener('progress', () => this.updateBuffer());
        this.video.addEventListener('ended', () => this.onEnded());
        this.video.addEventListener('waiting', () => this.container.classList.add('vp-loading'));
        this.video.addEventListener('canplay', () => this.container.classList.remove('vp-loading'));
        this.video.addEventListener('play', () => this.setState('playing'));
        this.video.addEventListener('pause', () => this.setState('paused'));
        this.video.addEventListener('error', (e) => this.onError(e));
        this.video.addEventListener('stalled', () => this.container.classList.add('vp-loading'));
        this.video.addEventListener('playing', () => this.container.classList.remove('vp-loading'));

        this._keyHandler = (e) => this.handleKeyboard(e);
        document.addEventListener('keydown', this._keyHandler);

        this._fsChangeHandler = () => this.updateFullscreenIcon();
        document.addEventListener('fullscreenchange', this._fsChangeHandler);
        document.addEventListener('webkitfullscreenchange', this._fsChangeHandler);

        this.speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSpeedMenu();
        });

        this.speedMenu.querySelectorAll('.vp-speed-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseFloat(opt.dataset.speed);
                this.setSpeed(speed);
                this.closeSpeedMenu();
            });
        });

        this.resumeContinue.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this._resumeTime) {
                this.video.currentTime = this._resumeTime;
            }
            this.hideResumeCard();
            this.video.play();
        });

        this.resumeRestart.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideResumeCard();
            this.clearSavedPosition();
            this.video.currentTime = 0;
            this.video.play();
        });

        this.nextCancel.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelAutoNext();
        });

        this.helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleHelpPanel();
        });

        this.helpClose.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeHelpPanel();
        });

        this.helpPanel.addEventListener('click', (e) => {
            if (e.target === this.helpPanel) {
                this.closeHelpPanel();
            }
        });

        this.screenshotBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.takeScreenshot();
        });

        this.loopBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLoop();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.vp-speed-control')) {
                this.closeSpeedMenu();
            }
        });
    }

    showControls() {
        this.container.classList.remove('vp-controls-hidden', 'vp-controls-hiding');
        this.container.classList.add('vp-controls-visible');
        this._controlsVisible = true;
        clearTimeout(this._controlsTimer);
        this.scheduleHideControls();
    }

    onWrapperMove(e) {
        if (!this.container.classList.contains('vp-playing')) return;
        this.showControls();
    }

    scheduleHideControls() {
        clearTimeout(this._idleTimer);
        if (!this.container.classList.contains('vp-playing')) return;
        this._idleTimer = setTimeout(() => {
            this.container.classList.remove('vp-controls-visible');
            this.container.classList.add('vp-controls-hiding');
            this._controlsVisible = false;
            this._controlsTimer = setTimeout(() => {
                this.container.classList.remove('vp-controls-hiding');
                this.container.classList.add('vp-controls-hidden');
            }, 800);
        }, 3000);
    }

    setState(state) {
        this.container.classList.remove('vp-playing', 'vp-paused');
        this.container.classList.add(`vp-${state}`);

        const playIcon = this.playPauseBtn.querySelector('.vp-icon-play');
        const pauseIcon = this.playPauseBtn.querySelector('.vp-icon-pause');

        if (state === 'playing') {
            playIcon.style.display = 'none';
            pauseIcon.style.display = '';
            this.showControls();
        } else {
            playIcon.style.display = '';
            pauseIcon.style.display = 'none';
            this.container.classList.remove('vp-controls-hidden', 'vp-controls-hiding');
            this.container.classList.remove('vp-controls-visible');
            clearTimeout(this._controlsTimer);
            clearTimeout(this._idleTimer);
        }
    }

    togglePlay() {
        if (!this.video.src && !this.video.currentSrc) return;
        if (this.video.paused) {
            const playPromise = this.video.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.warn('播放失败:', err.message);
                });
            }
        } else {
            this.video.pause();
        }
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateVolumeIcon();
        this.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
    }

    setVolume(val) {
        this.video.volume = val;
        this.video.muted = val === 0;
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        const vol = this.muteBtn.querySelector('.vp-icon-volume');
        const vol1 = this.muteBtn.querySelector('.vp-icon-volume1');
        const mute = this.muteBtn.querySelector('.vp-icon-mute');

        vol.style.display = 'none';
        vol1.style.display = 'none';
        mute.style.display = 'none';

        if (this.video.muted || this.video.volume === 0) {
            mute.style.display = '';
        } else if (this.video.volume < 0.5) {
            vol1.style.display = '';
        } else {
            vol.style.display = '';
        }
    }

    updateProgress() {
        if (!this.video.duration || isNaN(this.video.duration)) return;
        const pct = (this.video.currentTime / this.video.duration) * 100;
        this.progressBar.style.width = pct + '%';
        this.progressHandle.style.left = pct + '%';
        this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
        this.savePosition();
    }

    updateDuration() {
        if (this.video.duration && !isNaN(this.video.duration)) {
            this.durationEl.textContent = this.formatTime(this.video.duration);
        }
    }

    updateBuffer() {
        try {
            if (this.video.buffered.length > 0 && this.video.duration) {
                const end = this.video.buffered.end(this.video.buffered.length - 1);
                this.progressBuffered.style.width = (end / this.video.duration) * 100 + '%';
            }
        } catch (_) {}
    }

    seekTo(e) {
        if (!this.video.duration || isNaN(this.video.duration)) return;
        const rect = this.progressContainer.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.video.currentTime = pct * this.video.duration;
    }

    startDrag(e) {
        e.preventDefault();
        const onMove = (ev) => {
            if (!this.video.duration || isNaN(this.video.duration)) return;
            const rect = this.progressContainer.getBoundingClientRect();
            let pct = (ev.clientX - rect.left) / rect.width;
            pct = Math.max(0, Math.min(1, pct));
            this.video.currentTime = pct * this.video.duration;
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    startTouchDrag(e) {
        const onTouchMove = (ev) => {
            if (!this.video.duration || isNaN(this.video.duration)) return;
            const touch = ev.touches[0];
            const rect = this.progressContainer.getBoundingClientRect();
            let pct = (touch.clientX - rect.left) / rect.width;
            pct = Math.max(0, Math.min(1, pct));
            this.video.currentTime = pct * this.video.duration;
        };
        const onTouchEnd = () => {
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', onTouchEnd);
    }

    isMobile() {
        return window.innerWidth < 768;
    }

    toggleFullscreen() {
        if (this.isMobile() && this.video.webkitEnterFullscreen) {
            this.video.webkitEnterFullscreen();
            return;
        }
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const el = this.container;
            if (el.requestFullscreen) {
                el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    updateFullscreenIcon() {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        this.fullscreenBtn.querySelector('.vp-icon-expand').style.display = isFs ? 'none' : '';
        this.fullscreenBtn.querySelector('.vp-icon-compress').style.display = isFs ? '' : 'none';
    }

    async togglePiP() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (this.video.requestPictureInPicture) {
                await this.video.requestPictureInPicture();
            }
        } catch (_) {}
    }

    handleKeyboard(e) {
        if (!this.container.offsetParent) return;
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        switch (e.key) {
            case ' ':
            case 'k':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.video.currentTime = Math.max(0, this.video.currentTime - 5);
                this.showFeedback('lucide:rewind', '◀ 5s');
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.video.currentTime = Math.min(this.video.duration || 0, this.video.currentTime + 5);
                this.showFeedback('lucide:fast-forward', '▶ 5s');
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.setVolume(Math.min(1, this.video.volume + 0.1));
                this.volumeSlider.value = this.video.volume;
                this.showFeedback('lucide:volume-2', Math.round(this.video.volume * 100) + '%');
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.setVolume(Math.max(0, this.video.volume - 0.1));
                this.volumeSlider.value = this.video.volume;
                this.showFeedback('lucide:volume-1', Math.round(this.video.volume * 100) + '%');
                break;
            case 'm':
                this.toggleMute();
                break;
            case 'f':
                this.toggleFullscreen();
                break;
            case '<':
            case ',':
                e.preventDefault();
                this.adjustSpeed(-1);
                break;
            case '>':
            case '.':
                e.preventDefault();
                this.adjustSpeed(1);
                break;
            case '?':
                e.preventDefault();
                this.toggleHelpPanel();
                break;
            case 's':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    this.takeScreenshot();
                }
                break;
            case 'l':
                e.preventDefault();
                this.toggleLoop();
                break;
            case 'Escape':
                this.closeHelpPanel();
                break;
        }
    }

    onEnded() {
        this.setState('paused');
        this.clearSavedPosition();
        this.tryAutoNext();
    }

    onError(e) {
        const video = this.video;
        let msg = '视频加载失败';
        if (video.error) {
            switch (video.error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    msg = '视频加载被中止';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    msg = '网络错误，视频加载失败';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    msg = '视频解码失败，格式可能不支持';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    msg = '视频格式不支持或文件不存在';
                    break;
            }
        }
        console.error('视频错误:', msg, e);
        this.container.classList.remove('vp-loading');
        this.showError(msg);
    }

    showError(msg) {
        let errEl = this.container.querySelector('.vp-error-msg');
        if (!errEl) {
            errEl = document.createElement('div');
            errEl.className = 'vp-error-msg';
            this.wrapper.appendChild(errEl);
        }
        errEl.textContent = msg;
        errEl.style.display = 'flex';
    }

    hideError() {
        const errEl = this.container.querySelector('.vp-error-msg');
        if (errEl) errEl.style.display = 'none';
    }

    loadSource(src, videoId) {
        this.hideError();
        this._baseSrc = src || null;
        this._currentQuality = 'auto';
        this.video.src = src;
        this.video.load();
        this.progressBar.style.width = '0%';
        this.progressHandle.style.left = '0%';
        this.progressBuffered.style.width = '0%';
        this.currentTimeEl.textContent = '0:00';
        this.durationEl.textContent = '0:00';
        this.setState('paused');
        this.hideResumeCard();
        this.hideNextCard();
        this.cancelAutoNext();
        this.restoreSpeed();
        this.checkResumePosition(src);

        if (videoId) {
            this.loadQualities(videoId);
        } else {
            this._availableQualities = [];
            this._videoId = null;
            this.renderQualityMenu();
        }
    }

    stop() {
        if (!this.video.paused) {
            this.video.pause();
        }
        this.video.currentTime = 0;
        this.video.removeAttribute('src');
        this.video.load();
        this.progressBar.style.width = '0%';
        this.progressHandle.style.left = '0%';
        this.progressBuffered.style.width = '0%';
        this.currentTimeEl.textContent = '0:00';
        this.durationEl.textContent = '0:00';
        this.hideError();
        this.setState('paused');
        this.hideResumeCard();
        this.hideNextCard();
        this.cancelAutoNext();
    }

    formatTime(sec) {
        if (!sec || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this.stop();
        clearTimeout(this._controlsTimer);
        clearTimeout(this._clickTimer);
        clearTimeout(this._feedbackTimer);
        clearTimeout(this._posSaveTimer);
        clearTimeout(this._idleTimer);
        clearInterval(this._nextTimer);
        document.removeEventListener('keydown', this._keyHandler);
        document.removeEventListener('fullscreenchange', this._fsChangeHandler);
        document.removeEventListener('webkitfullscreenchange', this._fsChangeHandler);
        this.destroyMiniPlayer();
    }

    initSpeed() {
        try {
            const saved = localStorage.getItem('vp-playback-rate');
            if (saved) {
                const rate = parseFloat(saved);
                if (!isNaN(rate) && this._speedOptions.includes(rate)) {
                    this._currentSpeed = rate;
                    this.video.playbackRate = rate;
                    this.updateSpeedUI(rate);
                }
            }
        } catch (_) {}

        this.initQuality();
    }

    restoreSpeed() {
        try {
            const saved = localStorage.getItem('vp-playback-rate');
            if (saved) {
                const rate = parseFloat(saved);
                if (!isNaN(rate)) {
                    this._currentSpeed = rate;
                    this.video.playbackRate = rate;
                    this.updateSpeedUI(rate);
                    return;
                }
            }
        } catch (_) {}
        this._currentSpeed = 1;
        this.video.playbackRate = 1;
        this.updateSpeedUI(1);
    }

    setSpeed(speed) {
        this._currentSpeed = speed;
        this.video.playbackRate = speed;
        this.updateSpeedUI(speed);
        try {
            localStorage.setItem('vp-playback-rate', String(speed));
        } catch (_) {}
    }

    adjustSpeed(direction) {
        const idx = this._speedOptions.indexOf(this._currentSpeed);
        let newIdx;
        if (idx === -1) {
            newIdx = direction > 0 ? this._speedOptions.length - 1 : 0;
        } else {
            newIdx = idx + direction;
        }
        newIdx = Math.max(0, Math.min(this._speedOptions.length - 1, newIdx));
        this.setSpeed(this._speedOptions[newIdx]);
        this.showFeedback('lucide:gauge', this._speedOptions[newIdx] + 'x');
    }

    updateSpeedUI(speed) {
        this.speedLabel.textContent = speed + 'x';
        this.speedMenu.querySelectorAll('.vp-speed-option').forEach(opt => {
            opt.classList.toggle('vp-speed-active', parseFloat(opt.dataset.speed) === speed);
        });
    }

    toggleSpeedMenu() {
        if (this.isMobile() && typeof openBottomSheet === 'function') {
            const speed = this._currentSpeed;
            const options = this._speedOptions;
            let html = options.map(function(s) {
                return '<div class="vp-speed-option" data-speed="' + s + '" style="padding:14px 20px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--color-border-light);color:' + (s === speed ? 'var(--color-primary)' : 'var(--color-text)') + ';font-weight:' + (s === speed ? '600' : '400') + '">' +
                    '<span>' + s + 'x</span>' +
                    (s === speed ? '<iconify-icon icon="lucide:check" width="20" height="20"></iconify-icon>' : '') +
                '</div>';
            }).join('');
            const content = document.createElement('div');
            content.innerHTML = '<div style="padding:8px 0"><h3 style="font-family:var(--font-heading);font-size:16px;margin:0 0 8px 20px">播放速度</h3>' + html + '</div>';
            content.querySelectorAll('.vp-speed-option').forEach(function(el) {
                el.addEventListener('click', function() {
                    const speed = parseFloat(el.dataset.speed);
                    this.setSpeed(speed);
                    if (typeof closeBottomSheet === 'function') closeBottomSheet();
                }.bind(this));
            }.bind(this));
            openBottomSheet(content);
            return;
        }
        this.speedMenu.classList.toggle('vp-speed-open');
    }

    closeSpeedMenu() {
        this.speedMenu.classList.remove('vp-speed-open');
    }

    initQuality() {
        if (!this.qualityBtn || !this.qualityMenu) return;

        this.qualityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleQualityMenu();
        });

        this.qualityMenu.addEventListener('click', (e) => {
            const autoOption = e.target.closest('.vp-quality-auto-option');
            if (autoOption) {
                const quality = autoOption.dataset.quality;
                if (quality) this.setQuality(quality);
                return;
            }
            const pill = e.target.closest('.vp-quality-pill');
            if (pill) {
                const quality = pill.dataset.quality;
                if (quality) this.setQuality(quality);
                return;
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.qualityMenu.contains(e.target) && !this.qualityBtn.contains(e.target)) {
                this.closeQualityMenu();
            }
        });

        // Keyboard navigation
        this.qualityMenu.addEventListener('keydown', (e) => {
            const items = this.qualityMenu.querySelectorAll('.vp-quality-auto-option, .vp-quality-pill');
            if (items.length === 0) return;

            const currentIndex = Array.from(items).indexOf(document.activeElement);

            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowRight':
                    e.preventDefault();
                    const nextIndex = (currentIndex + 1) % items.length;
                    items[nextIndex].focus();
                    break;
                case 'ArrowUp':
                case 'ArrowLeft':
                    e.preventDefault();
                    const prevIndex = (currentIndex - 1 + items.length) % items.length;
                    items[prevIndex].focus();
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (document.activeElement && items.contains(document.activeElement)) {
                        document.activeElement.click();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.closeQualityMenu();
                    this.qualityBtn.focus();
                    break;
            }
        });

        // Make quality menu focusable
        this.qualityMenu.setAttribute('tabindex', '-1');
    }

    showQualityLoading() {
        let el = this.wrapper.querySelector('.vp-quality-loading');
        if (!el) {
            el = document.createElement('div');
            el.className = 'vp-quality-loading';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            el.innerHTML = '<div class="vp-quality-loading-spinner"></div><div class="vp-quality-loading-text">切换画质中...</div>';
            this.wrapper.appendChild(el);
        }
        el.classList.add('vp-quality-loading-visible');
        if (this.qualityLabel) {
            this.qualityLabel.textContent = '切换中...';
        }
    }

    hideQualityLoading() {
        const el = this.wrapper.querySelector('.vp-quality-loading');
        if (el) {
            el.classList.remove('vp-quality-loading-visible');
        }
        this.updateQualityLabel();
    }

    showToast(message, type, duration) {
        let el = this.wrapper.querySelector('.vp-toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'vp-toast';
            el.setAttribute('role', 'alert');
            this.wrapper.appendChild(el);
        }
        el.className = 'vp-toast vp-toast-' + (type || 'info');
        el.textContent = message;
        void el.offsetWidth;
        el.classList.add('vp-toast-visible');

        clearTimeout(el._toastTimer);
        el._toastTimer = setTimeout(() => {
            el.classList.remove('vp-toast-visible');
        }, duration || 2000);
    }

    async loadQualities(videoId) {
        this._videoId = videoId || null;
        this._qualitiesLoadFailed = false;
        try {
            if (!videoId) {
                this._availableQualities = [];
                this.renderQualityMenu();
                return;
            }
            const response = await fetch(`/api/videos/${videoId}/qualities`);
            if (!response.ok) throw new Error('fetch qualities failed');
            const data = await response.json();
            this._availableQualities = data.qualities || [];
            this.renderQualityMenu();
            this.autoSelectQuality();
        } catch (e) {
            this._availableQualities = [];
            this._qualitiesLoadFailed = true;
            this.renderQualityMenu();
        }
    }

    renderQualityMenu() {
        if (!this.qualityMenu) return;

        const isAutoActive = this._currentQuality === 'auto';

        let recommendedQuality = null;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const downlink = connection && connection.downlink ? connection.downlink : 10;
        if (downlink >= 20) {
            recommendedQuality = this._availableQualities.find(q => q.quality === '4k')?.quality || null;
        } else if (downlink >= 10) {
            recommendedQuality = this._availableQualities.find(q => q.quality === '1080p')?.quality || null;
        } else if (downlink >= 5) {
            recommendedQuality = this._availableQualities.find(q => q.quality === '1080p')?.quality || null;
        } else if (downlink >= 2) {
            recommendedQuality = this._availableQualities.find(q => q.quality === '720p')?.quality || null;
        }

        this.qualityMenu.setAttribute('role', 'menu');

        const autoHtml = `
            <div class="vp-quality-auto-row">
                <div class="vp-quality-auto-option ${isAutoActive ? 'vp-quality-active' : ''}" data-quality="auto" tabindex="-1" role="menuitem">
                    <span>自动</span>
                    <span class="vp-quality-auto-badge">推荐</span>
                </div>
            </div>
        `;

        let emptyMessage = '';
        if (this._availableQualities.length === 0) {
            if (this._qualitiesLoadFailed) {
                emptyMessage = '<div class="vp-quality-empty">画质加载失败</div>';
            } else {
                emptyMessage = '<div class="vp-quality-empty">暂无可用画质</div>';
            }
        }

        const pills = this._availableQualities.map(q => {
            const isActive = this._currentQuality === q.quality;
            const shortLabel = q.quality.toUpperCase();
            const isRecommended = q.quality === recommendedQuality && !isAutoActive && q.quality !== this._currentQuality;
            return `<div class="vp-quality-pill ${isActive ? 'vp-quality-active' : ''}" data-quality="${q.quality}" tabindex="-1" role="menuitem">
                <span>${shortLabel}</span>
                ${q.label !== shortLabel ? `<span class="vp-quality-pill-label">${q.label}</span>` : ''}
                ${isRecommended ? `<span class="vp-quality-recommended-badge">推荐</span>` : ''}
            </div>`;
        }).join('');

        const pillsHtml = pills ? `<div class="vp-quality-divider"></div><div class="vp-quality-pills">${pills}</div>` : '';

        this.qualityMenu.innerHTML = autoHtml + emptyMessage + pillsHtml;
        this.updateQualityLabel();
    }

    setQuality(quality) {
        const previousQuality = this._currentQuality;
        this._currentQuality = quality || 'auto';
        try {
            localStorage.setItem('vp-quality', this._currentQuality);
        } catch (_) {}

        const isSwitching = previousQuality !== this._currentQuality;
        if (isSwitching) {
            this.showQualityLoading();
        }

        if (this._currentQuality !== 'auto' && this._baseSrc) {
            const target = this._availableQualities.find(q => q.quality === this._currentQuality);
            if (target && target.filename) {
                const currentTime = this.video.currentTime;
                const wasPaused = this.video.paused;
                const playbackRate = this.video.playbackRate;
                let timeoutId = null;

                const cleanup = () => {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                };

                const fallbackToPrevious = () => {
                    cleanup();
                    this._currentQuality = previousQuality;
                    try {
                        localStorage.setItem('vp-quality', previousQuality);
                    } catch (_) {}
                    const prevTarget = this._availableQualities.find(q => q.quality === previousQuality);
                    if (prevTarget && prevTarget.filename) {
                        this.video.src = `/uploads/${prevTarget.filename}`;
                        this.video.load();
                        this.video.currentTime = currentTime || 0;
                        this.video.playbackRate = playbackRate;
                        if (!wasPaused) {
                            this.video.play().catch(() => {});
                        }
                    }
                    this.updateQualityLabel();
                    this.renderQualityMenu();
                };

                const onCanPlay = () => {
                    cleanup();
                    this.hideQualityLoading();
                    this.video.removeEventListener('canplay', onCanPlay);
                    this.video.removeEventListener('error', onError);
                    if (isSwitching) {
                        const label = target.label || target.quality.toUpperCase();
                        this.showToast('已切换至 ' + label, 'success', 2000);
                    }
                };
                const onError = () => {
                    cleanup();
                    this.hideQualityLoading();
                    this.video.removeEventListener('canplay', onCanPlay);
                    this.video.removeEventListener('error', onError);
                    fallbackToPrevious();
                    this.showToast('画质切换失败', 'error', 3000);
                };
                this.video.addEventListener('canplay', onCanPlay, { once: true });
                this.video.addEventListener('error', onError, { once: true });

                timeoutId = setTimeout(() => {
                    this.video.removeEventListener('canplay', onCanPlay);
                    this.video.removeEventListener('error', onError);
                    this.hideQualityLoading();
                    fallbackToPrevious();
                    this.showToast('画质切换超时', 'error', 3000);
                }, 10000);

                this.video.src = `/uploads/${target.filename}`;
                this.video.load();
                this.video.currentTime = currentTime || 0;
                this.video.playbackRate = playbackRate;
                if (!wasPaused) {
                    this.video.play().catch(() => {});
                }
            } else {
                this.hideQualityLoading();
                const label = this._currentQuality.toUpperCase();
                this.showToast(label + ' 画质文件不存在，已切换至自动模式', 'error', 3000);
                this._currentQuality = 'auto';
                try {
                    localStorage.setItem('vp-quality', 'auto');
                } catch (_) {}
                if (this._baseSrc) {
                    this.video.src = this._baseSrc;
                    this.video.load();
                    this.video.currentTime = this.video.currentTime || 0;
                    this.video.playbackRate = this.video.playbackRate;
                    if (!this.video.paused) {
                        this.video.play().catch(() => {});
                    }
                }
            }
        } else {
            this.hideQualityLoading();
        }

        this.updateQualityLabel();
        this.renderQualityMenu();
        this.closeQualityMenu();
    }

    autoSelectQuality() {
        let saved = null;
        try {
            saved = localStorage.getItem('vp-quality');
        } catch (_) {}

        if (saved && saved !== 'auto') {
            const exists = this._availableQualities.some(q => q.quality === saved);
            if (exists) {
                this.setQuality(saved);
                return;
            }
            this.showToast('保存的画质 (' + saved.toUpperCase() + ') 不可用，已切换至自动模式', 'info', 3000);
        }

        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const downlink = connection && connection.downlink ? connection.downlink : 10;
        let target = 'auto';
        if (downlink >= 20) {
            target = this._availableQualities.find(q => q.quality === '4k')?.quality || target;
        } else if (downlink >= 10) {
            target = this._availableQualities.find(q => q.quality === '1080p')?.quality || target;
        } else if (downlink >= 5) {
            target = this._availableQualities.find(q => q.quality === '1080p')?.quality || target;
        } else if (downlink >= 2) {
            target = this._availableQualities.find(q => q.quality === '720p')?.quality || target;
        } else {
            target = this._availableQualities.find(q => q.quality === '360p')?.quality || target;
        }

        this._autoSelectedQuality = target;
        this.setQuality(target || 'auto');
    }

    toggleQualityMenu() {
        // Adaptive positioning
        const wrapperRect = this.wrapper.getBoundingClientRect();
        const viewportBottom = window.innerHeight;
        const spaceBelow = viewportBottom - wrapperRect.bottom;

        // Reset any previous positioning override
        this.qualityMenu.style.bottom = '';
        this.qualityMenu.style.top = '';

        if (spaceBelow < 100) {
            // Not enough space below, position above
            this.qualityMenu.style.bottom = 'auto';
            this.qualityMenu.style.top = '-8px';
            this.qualityMenu.style.transform = 'translateX(-50%) translateY(-100%)';
        } else {
            this.qualityMenu.style.transform = '';
        }

        // Ensure menu doesn't overflow viewport horizontally
        const menuRect = this.qualityMenu.getBoundingClientRect();
        if (menuRect.right > viewportBottom) {
            this.qualityMenu.style.left = 'auto';
            this.qualityMenu.style.right = '0';
            this.qualityMenu.style.transform = this.qualityMenu.style.transform || 'translateY(0)';
        } else if (menuRect.left < 0) {
            this.qualityMenu.style.left = '0';
            this.qualityMenu.style.right = 'auto';
            this.qualityMenu.style.transform = this.qualityMenu.style.transform || 'translateY(0)';
        }

        if (this.isMobile() && typeof openBottomSheet === 'function') {
            this.closeQualityMenu();
            const currentQuality = this._currentQuality;
            const qualities = this._availableQualities;
            let autoHtml = '<div class="vp-quality-auto-option" data-quality="auto" style="padding:14px 20px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--color-border-light);color:' + (currentQuality === 'auto' ? 'var(--color-primary)' : 'var(--color-text)') + ';font-weight:' + (currentQuality === 'auto' ? '600' : '400') + '">' +
                '<span>自动</span>' +
                (currentQuality === 'auto' ? '<iconify-icon icon="lucide:check" width="20" height="20"></iconify-icon>' : '') +
            '</div>';
            let emptyHtml = '';
            if (qualities.length === 0) {
                const msg = this._qualitiesLoadFailed ? '画质加载失败' : '暂无可用画质';
                emptyHtml = '<div style="padding:14px 20px;font-size:14px;color:var(--vp-text-muted, rgba(255,255,255,0.6));text-align:center;">' + msg + '</div>';
            }
            let pillsHtml = qualities.map(function(q) {
                const isActive = currentQuality === q.quality;
                return '<div class="vp-quality-pill" data-quality="' + q.quality + '" style="padding:14px 20px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--color-border-light);color:' + (isActive ? 'var(--color-primary)' : 'var(--color-text)') + ';font-weight:' + (isActive ? '600' : '400') + '">' +
                    '<span>' + q.quality.toUpperCase() + '</span>' +
                    (isActive ? '<iconify-icon icon="lucide:check" width="20" height="20"></iconify-icon>' : '') +
                '</div>';
            }).join('');
            const content = document.createElement('div');
            content.innerHTML = '<div style="padding:8px 0"><h3 style="font-family:var(--font-heading);font-size:16px;margin:0 0 8px 20px">画质选择</h3>' + autoHtml + emptyHtml + pillsHtml + '</div>';
            content.querySelectorAll('.vp-quality-auto-option, .vp-quality-pill').forEach(function(el) {
                el.addEventListener('click', function() {
                    const quality = el.dataset.quality;
                    if (quality) this.setQuality(quality);
                    if (typeof closeBottomSheet === 'function') closeBottomSheet();
                }.bind(this));
            }.bind(this));
            openBottomSheet(content);
            return;
        }

        this.qualityMenu.classList.toggle('vp-quality-open');

        if (this.qualityMenu.classList.contains('vp-quality-open')) {
            setTimeout(() => {
                const firstItem = this.qualityMenu.querySelector('.vp-quality-auto-option, .vp-quality-pill');
                if (firstItem) firstItem.focus();
            }, 100);
        }
    }

    closeQualityMenu() {
        this.qualityMenu.classList.remove('vp-quality-open');
        // Reset adaptive positioning
        this.qualityMenu.style.bottom = '';
        this.qualityMenu.style.top = '';
        this.qualityMenu.style.left = '';
        this.qualityMenu.style.right = '';
        this.qualityMenu.style.transform = '';
    }

    updateQualityLabel() {
        if (!this.qualityLabel) return;

        if (this._currentQuality === 'auto') {
            const target = this._availableQualities.find(q => q.quality === this._autoSelectedQuality);
            if (target) {
                const label = target.quality.toUpperCase();
                this.qualityLabel.textContent = '自动';
                let sub = this.qualityBtn.querySelector('.vp-quality-sublabel');
                if (!sub) {
                    sub = document.createElement('span');
                    sub.className = 'vp-quality-sublabel';
                    this.qualityBtn.appendChild(sub);
                }
                sub.textContent = '· ' + label;
            } else {
                this.qualityLabel.textContent = '自动';
                const sub = this.qualityBtn.querySelector('.vp-quality-sublabel');
                if (sub) sub.remove();
            }
            return;
        }

        const sub = this.qualityBtn.querySelector('.vp-quality-sublabel');
        if (sub) sub.remove();

        const target = this._availableQualities.find(q => q.quality === this._currentQuality);
        if (target) {
            const shortLabel = target.quality.toUpperCase();
            if (target.label && target.label !== shortLabel) {
                this.qualityLabel.textContent = shortLabel;
                let subEl = this.qualityBtn.querySelector('.vp-quality-sublabel');
                if (!subEl) {
                    subEl = document.createElement('span');
                    subEl.className = 'vp-quality-sublabel';
                    this.qualityBtn.appendChild(subEl);
                }
                subEl.textContent = target.label;
            } else {
                this.qualityLabel.textContent = shortLabel;
            }
        } else {
            this.qualityLabel.textContent = '画质';
        }
    }

    showTimeTooltip(e) {
        if (!this.video.duration || isNaN(this.video.duration)) return;
        const rect = this.progressContainer.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = pct * this.video.duration;
        this.timeTooltip.textContent = this.formatTime(time);
        const tooltipRect = this.timeTooltip.getBoundingClientRect();
        let left = e.clientX - rect.left;
        left = Math.max(tooltipRect.width / 2, Math.min(left, rect.width - tooltipRect.width / 2));
        this.timeTooltip.style.left = left + 'px';
    }

    hideTimeTooltip() {
        this.timeTooltip.style.display = 'none';
        setTimeout(() => {
            if (this.timeTooltip) this.timeTooltip.style.display = '';
        }, 50);
    }

    showFeedback(icon, text) {
        clearTimeout(this._feedbackTimer);
        this.feedbackIcon.setAttribute('icon', icon);
        this.feedbackText.textContent = text;
        this.feedbackOverlay.classList.add('vp-feedback-visible');
        this._feedbackTimer = setTimeout(() => {
            this.feedbackOverlay.classList.remove('vp-feedback-visible');
        }, 800);
    }

    savePosition() {
        if (this._posSaveTimer) return;
        this._posSaveTimer = setTimeout(() => {
            this._posSaveTimer = null;
            try {
                const src = this.video.currentSrc || this.video.src;
                if (!src || !this.video.duration || isNaN(this.video.duration)) return;
                if (this.video.currentTime > 3 && this.video.currentTime < this.video.duration - 3) {
                    localStorage.setItem('vp-pos-' + src, String(Math.floor(this.video.currentTime)));
                }
            } catch (_) {}
        }, 5000);
    }

    clearSavedPosition() {
        try {
            const src = this.video.currentSrc || this.video.src;
            if (src) {
                localStorage.removeItem('vp-pos-' + src);
            }
        } catch (_) {}
    }

    checkResumePosition(src) {
        try {
            const saved = localStorage.getItem('vp-pos-' + src);
            if (saved) {
                const time = parseFloat(saved);
                if (!isNaN(time) && time > 3) {
                    this.showResumeCard(time);
                    return;
                }
            }
        } catch (_) {}
    }

    showResumeCard(time) {
        this.resumeText.textContent = '从 ' + this.formatTime(time) + ' 继续播放';
        this.resumeCard.classList.add('vp-card-visible');
        this._resumeTime = time;
    }

    hideResumeCard() {
        this.resumeCard.classList.remove('vp-card-visible');
    }

    tryAutoNext() {
        const allVideos = window.allVideos;
        const currentId = window.currentVideoId;
        if (!allVideos || !currentId) return;
        const idx = allVideos.findIndex(v => v.id === currentId);
        if (idx === -1 || idx >= allVideos.length - 1) return;
        const nextVideo = allVideos[idx + 1];
        if (!nextVideo) return;
        this._nextCancelled = false;
        this._nextCountdownVal = 10;
        this.nextCountdown.textContent = '10';
        this.nextCard.classList.add('vp-card-visible');
        clearInterval(this._nextTimer);
        this._nextTimer = setInterval(() => {
            if (this._nextCancelled) {
                clearInterval(this._nextTimer);
                return;
            }
            this._nextCountdownVal--;
            this.nextCountdown.textContent = String(this._nextCountdownVal);
            if (this._nextCountdownVal <= 0) {
                clearInterval(this._nextTimer);
                this.hideNextCard();
                if (window.openVideoDetail) {
                    window.openVideoDetail(nextVideo.id);
                }
            }
        }, 1000);
    }

    cancelAutoNext() {
        this._nextCancelled = true;
        clearInterval(this._nextTimer);
        this.hideNextCard();
    }

    hideNextCard() {
        this.nextCard.classList.remove('vp-card-visible');
    }

    toggleHelpPanel() {
        this.helpPanel.classList.toggle('vp-help-visible');
    }

    closeHelpPanel() {
        this.helpPanel.classList.remove('vp-help-visible');
    }

    takeScreenshot() {
        if (!this.video.videoWidth || !this.video.videoHeight) return;
        try {
            const canvas = document.getElementById('frameCanvas') || document.createElement('canvas');
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'screenshot-' + Date.now() + '.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 'image/png');
            this.showFeedback('lucide:camera', '截图已保存');
        } catch (_) {}
    }

    toggleLoop() {
        this.video.loop = !this.video.loop;
        this.loopBtn.classList.toggle('vp-active', this.video.loop);
        this.showFeedback('lucide:repeat', this.video.loop ? '循环已开启' : '循环已关闭');
    }

    initMiniPlayer() {
        if (!('IntersectionObserver' in window)) return;
        this._miniObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.destroyMiniPlayer();
                } else {
                    if (!this.video.paused && this.video.readyState > 2) {
                        this.createMiniPlayer();
                    }
                }
            });
        }, { threshold: 0.1 });
        this._miniObserver.observe(this.container);
    }

    createMiniPlayer() {
        if (this._miniPlayerEl) return;
        if (this._destroyed) return;
        const mini = document.createElement('div');
        mini.className = 'vp-mini-player';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'vp-mini-close';
        closeBtn.innerHTML = '<iconify-icon icon="lucide:x" width="16" height="16"></iconify-icon>';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.video.pause();
            this.destroyMiniPlayer();
        });
        mini.appendChild(closeBtn);
        mini.appendChild(this.video);
        mini.addEventListener('click', () => {
            this.container.scrollIntoView({ behavior: 'smooth' });
        });
        document.body.appendChild(mini);
        this._miniPlayerEl = mini;
    }

    destroyMiniPlayer() {
        if (!this._miniPlayerEl) return;
        const wrapper = this.container.querySelector('.vp-video-wrapper');
        const videoInsertPoint = wrapper.querySelector('.vp-loading-spinner');
        if (videoInsertPoint) {
            wrapper.insertBefore(this.video, videoInsertPoint);
        } else {
            wrapper.insertBefore(this.video, wrapper.firstChild);
        }
        if (this._miniPlayerEl.parentNode) {
            this._miniPlayerEl.parentNode.removeChild(this._miniPlayerEl);
        }
        this._miniPlayerEl = null;
    }

    initTouchGestures() {
        if (!this.wrapper) return;
        this.wrapper.addEventListener('touchstart', (e) => {
            if (e.target.closest('.vp-controls')) return;
            if (e.target.closest('.vp-resume-card') || e.target.closest('.vp-next-card') || e.target.closest('.vp-help-panel')) return;
            if (e.touches.length === 1) {
                this._gestureStartX = e.touches[0].clientX;
                this._gestureStartY = e.touches[0].clientY;
                this._gestureActive = true;
            }
        }, { passive: true });

        this.wrapper.addEventListener('touchmove', (e) => {
            if (!this._gestureActive || e.touches.length !== 1) return;
            if (e.target.closest('.vp-controls')) return;
            const dx = e.touches[0].clientX - this._gestureStartX;
            const dy = e.touches[0].clientY - this._gestureStartY;
            const wrapperRect = this.wrapper.getBoundingClientRect();
            const isRightHalf = this._gestureStartX > wrapperRect.left + wrapperRect.width / 2;
            if (Math.abs(dy) > 30 && isRightHalf && Math.abs(dy) > Math.abs(dx)) {
                const volDelta = -dy / wrapperRect.height;
                const newVol = Math.max(0, Math.min(1, this.video.volume + volDelta));
                this.setVolume(newVol);
                this.volumeSlider.value = this.video.volume;
                this.showGestureFeedback('lucide:volume-2', Math.round(this.video.volume * 100) + '%');
                this._gestureStartY = e.touches[0].clientY;
            } else if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
                const seekDelta = dx > 0 ? 10 : -10;
                this.video.currentTime = Math.max(0, Math.min(this.video.duration || 0, this.video.currentTime + seekDelta));
                this.showGestureFeedback(dx > 0 ? 'lucide:fast-forward' : 'lucide:rewind', (dx > 0 ? '▶' : '◀') + ' 10s');
                this._gestureStartX = e.touches[0].clientX;
            }
        }, { passive: true });

        this.wrapper.addEventListener('touchend', () => {
            this._gestureActive = false;
        }, { passive: true });
    }

    showGestureFeedback(icon, text) {
        let el = this.wrapper.querySelector('.vp-gesture-feedback');
        if (!el) {
            el = document.createElement('div');
            el.className = 'vp-gesture-feedback';
            el.innerHTML = '<iconify-icon class="vp-gesture-icon" width="40" height="40"></iconify-icon><span class="vp-gesture-text"></span>';
            this.wrapper.appendChild(el);
        }
        el.querySelector('.vp-gesture-icon').setAttribute('icon', icon);
        el.querySelector('.vp-gesture-text').textContent = text;
        el.classList.add('vp-gesture-visible');
        clearTimeout(this._gestureTimer);
        this._gestureTimer = setTimeout(() => {
            el.classList.remove('vp-gesture-visible');
        }, 600);
    }
}

window.VideoPlayer = VideoPlayer;
