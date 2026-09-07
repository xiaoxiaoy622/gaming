/**
 * 时间加速器 · 游戏控制台 (Gaming Accelerator)
 * 基于 accelerator_gaming.html 的纯 JS 版本
 * Timer Hook 逻辑与 HTML 原版完全一致
 */
(function () {
    'use strict';

    // ================================================================
    // Part 1: Timer Hook 核心 (与 accelerator_gaming.html Block 1 一致)
    // ================================================================

    var _origSetTimeout = window.setTimeout;
    var _origClearTimeout = window.clearTimeout;
    var _origSetInterval = window.setInterval;
    var _origClearInterval = window.clearInterval;
    var _origDate = window.Date;
    var _origDateNow = _origDate.now.bind ? _origDate.now.bind(_origDate) : function () { return _origDate.now(); };
    var _origDateParse = _origDate.parse;
    var _origDateUTC = _origDate.UTC;

    var _percentage = 1.0;
    var _invPercentage = 1.0;
    var _timeoutIds = {};
    var _intervalIds = {};
    var _autoUniqueId = 1;
    var _hooksInstalled = false;
    var _lastRealTime = _origDateNow();
    var _lastVirtualTime = _origDateNow();

    function genUniqueId() { return _autoUniqueId++; }
    function notifyExec(uniqueId) {
        if (!uniqueId) return;
        var keys = Object.keys(_timeoutIds);
        for (var i = 0; i < keys.length; i++) {
            var info = _timeoutIds[keys[i]];
            if (info.uniqueId === uniqueId) {
                _origClearTimeout.call(window, info.nowId);
                delete _timeoutIds[info.originId];
                break;
            }
        }
    }
    function hookedSetTimeout() {
        var uniqueId = genUniqueId();
        var callback = arguments[0];
        if (typeof callback === 'function') {
            var _cb = callback;
            arguments[0] = function () {
                var ret = _cb.apply(this, arguments);
                notifyExec(uniqueId);
                return ret;
            };
        }
        var originMS = arguments[1];
        arguments[1] = (originMS || 0) * _percentage;
        var resultId = _origSetTimeout.apply(window, arguments);
        _timeoutIds[resultId] = {
            args: arguments, originMS: originMS, originId: resultId,
            nowId: resultId, uniqueId: uniqueId, oldPercentage: _percentage,
            exceptNextFireTime: _origDateNow() + (originMS || 0)
        };
        return resultId;
    }
    function hookedSetInterval() {
        var uniqueId = genUniqueId();
        var callback = arguments[0];
        if (typeof callback === 'function') {
            var _cb = callback;
            arguments[0] = function () {
                var ret = _cb.apply(this, arguments);
                notifyExec(uniqueId);
                return ret;
            };
        }
        var originMS = arguments[1];
        arguments[1] = (originMS || 0) * _percentage;
        var resultId = _origSetInterval.apply(window, arguments);
        _intervalIds[resultId] = {
            args: arguments, originMS: originMS, originId: resultId,
            nowId: resultId, uniqueId: uniqueId, oldPercentage: _percentage,
            exceptNextFireTime: _origDateNow() + (originMS || 0)
        };
        return resultId;
    }
    function hookedClearTimeout() {
        var id = arguments[0];
        if (_timeoutIds[id]) { arguments[0] = _timeoutIds[id].nowId; delete _timeoutIds[id]; }
        return _origClearTimeout.apply(window, arguments);
    }
    function hookedClearInterval() {
        var id = arguments[0];
        if (_intervalIds[id]) { arguments[0] = _intervalIds[id].nowId; delete _intervalIds[id]; }
        return _origClearInterval.apply(window, arguments);
    }
    function percentageChangeHandler(newPercentage) {
        var intKeys = Object.keys(_intervalIds);
        for (var i = 0; i < intKeys.length; i++) {
            var idObj = _intervalIds[intKeys[i]];
            idObj.args[1] = Math.floor((idObj.originMS || 1) * newPercentage);
            _origClearInterval.call(window, idObj.nowId);
            idObj.nowId = _origSetInterval.apply(window, idObj.args);
        }
        var toutKeys = Object.keys(_timeoutIds);
        for (var j = 0; j < toutKeys.length; j++) {
            var idObj2 = _timeoutIds[toutKeys[j]];
            var now = _origDateNow();
            var exceptTime = idObj2.exceptNextFireTime;
            var oldPercentage = idObj2.oldPercentage;
            var time = exceptTime - now;
            if (time < 0) time = 0;
            var changedTime = Math.floor(newPercentage / oldPercentage * time);
            idObj2.args[1] = changedTime;
            idObj2.exceptNextFireTime = now + changedTime;
            idObj2.oldPercentage = newPercentage;
            _origClearTimeout.call(window, idObj2.nowId);
            idObj2.nowId = _origSetTimeout.apply(window, idObj2.args);
        }
    }
    function _HookedDate() {
        var n = arguments.length;
        if (n === 0) return new _origDate(Date.now());
        if (n === 1) return new _origDate(arguments[0]);
        if (n === 2) return new _origDate(arguments[0], arguments[1]);
        if (n === 3) return new _origDate(arguments[0], arguments[1], arguments[2]);
        if (n === 4) return new _origDate(arguments[0], arguments[1], arguments[2], arguments[3]);
        if (n === 5) return new _origDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
        if (n === 6) return new _origDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
        return new _origDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]);
    }
    _HookedDate.prototype = _origDate.prototype;
    function _hookedDateNow() {
        var realNow = _origDateNow();
        return _lastVirtualTime + (realNow - _lastRealTime) * _invPercentage;
    }
    function installHooks() {
        if (_hooksInstalled) return;
        _hooksInstalled = true;
        window.setTimeout = hookedSetTimeout;
        window.setInterval = hookedSetInterval;
        window.clearTimeout = hookedClearTimeout;
        window.clearInterval = hookedClearInterval;
        window.Date = _HookedDate;
        _HookedDate.now = _hookedDateNow;
        _HookedDate.parse = _origDateParse;
        _HookedDate.UTC = _origDateUTC;
    }
    function removeHooks() {
        if (!_hooksInstalled) return;
        _hooksInstalled = false;
        window.setTimeout = _origSetTimeout;
        window.setInterval = _origSetInterval;
        window.clearTimeout = _origClearTimeout;
        window.clearInterval = _origClearInterval;
        window.Date = _origDate;
        _intervalIds = {};
        _timeoutIds = {};
    }
    function _applySpeed(speed) {
        var realNow = _origDateNow();
        if (speed === 1) {
            _lastVirtualTime = _hookedDateNow();
            _lastRealTime = realNow;
            _percentage = 1.0;
            _invPercentage = 1.0;
            percentageChangeHandler(1.0);
            return;
        }
        installHooks();
        _lastVirtualTime = _hookedDateNow();
        _lastRealTime = realNow;
        var newPercentage = 1 / speed;
        percentageChangeHandler(newPercentage);
        _percentage = newPercentage;
        _invPercentage = speed;
    }
    window.$hookTimer = {
        setSpeed: function (speed) { if (typeof speed !== 'number' || speed <= 0) return; _applySpeed(speed); },
        getSpeed: function () { return 1 / _percentage; },
        getPercentage: function () { return _percentage; }
    };
    window.__timerCore = {
        _applySpeed: _applySpeed,
        _origSetTimeout: _origSetTimeout,
        _origClearTimeout: _origClearTimeout,
        _origDateNow: _origDateNow,
        getPercentage: function () { return _percentage; },
        getSpeed: function () { return 1 / _percentage; }
    };

    // ================================================================
    // Part 2: CSS 注入 (游戏科技风，全面响应式优化)
    // ================================================================

    // --- 基准设备：1366px（最常见笔记本分辨率）---
    // 缩放比 = clamp(viewport / BASE_WIDTH, MIN_SCALE, 1.0)
    var _BASE_WIDTH = 1366;
    var _MIN_PANEL_W = 200;   // 面板最小宽度（保证 2 列按钮每列 ≥ 88px）
    var _MIN_PILL_H = 36;     // 胶囊最小高度（满足触控安全区 44px 的视觉底线）
    var _MIN_BTN_H  = 28;     // 按钮最小高度（触控友好）

    // 所有元素的基准值（s=1.0 对应 1366px）
    var _BASE = {
        pillW: 80, pillH: 40, pillTL: 30,   // 触发器：宽/高/上左边距
        panelW: 300, panelTop: 80, pad: 16, clipR: 10,
        headerFS: 8, gaugeFS: 36,
        sliderTrackH: 6, sliderThumb: 18,
        gridGap: 6, btnH: 34, btnFS: 13, btnClip: 4,
        resetPadV: 8, resetPadH: 16, resetFS: 8,
        persistFS: 12,
        toastFS: 14, toastPadV: 8, toastPadH: 20, toastClip: 4,
        iconL: 8, iconTB: 5,
        speedFS: 16
    };

    // --- 断点与缩放比（基于主流设备屏幕宽度）---
    // 桌面: 1366px+  s=1.0          — MacBook / 笔记本
    // 大屏手机: 480px  s≈0.903      — iPhone 14 Pro Max / Pixel 7 Pro
    // 手机:   390px  s≈0.740      — iPhone 14/13/12 / Galaxy S23
    // 小屏手机: 320px  s≈0.602      — iPhone SE / 小屏 Android
    // 平板:   768px  s≈0.562  → clamped 200px — iPad / Surface Go
    var _SCALE_TABLE = {
        // 大屏手机：按实际比例缩放，面板约 271px
        lgPhone: 480 / _BASE_WIDTH,
        // 手机：按实际比例缩放，面板约 222px
        phone:   390 / _BASE_WIDTH,
        // 小屏手机：clamp 到 200px
        small:   Math.min(_MIN_PANEL_W / _BASE.panelW, 320 / _BASE_WIDTH),
        // 平板：clamp 到 200px（内容最少要求）
        tablet:  Math.min(_MIN_PANEL_W / _BASE.panelW, 768 / _BASE_WIDTH),
    };

    // 尺寸计算工具：round(BASE * scale)，最小值保护
    function _sz(base, scale) {
        return Math.max(1, Math.round(base * scale));
    }
    // 面板宽度：按比例缩放，不低于最小值
    function _panelW(scale) {
        return Math.max(_MIN_PANEL_W, _sz(_BASE.panelW, scale));
    }
    // 胶囊高度：不低于最小触控安全区
    function _pillH(scale) {
        return Math.max(_MIN_PILL_H, _sz(_BASE.pillH, scale));
    }
    // 按钮高度：不低于最小触控安全区
    function _btnH(scale) {
        return Math.max(_MIN_BTN_H, _sz(_BASE.btnH, scale));
    }
    // 获取当前视口对应的缩放比
    function _getScale() {
        var w = window.innerWidth;
        if (w >= 1366) return 1.0;
        if (w >= 480)  return _SCALE_TABLE.lgPhone;
        if (w >= 390)  return _SCALE_TABLE.phone;
        if (w >= 320)  return _SCALE_TABLE.small;
        return _SCALE_TABLE.tablet;
    }
    // 获取当前断点名称
    function _getBreakpoint() {
        var w = window.innerWidth;
        if (w >= 1366) return 'desktop';
        if (w >= 768)  return 'tablet';
        if (w >= 480)  return 'lgPhone';
        if (w >= 390)  return 'phone';
        return 'small';
    }
    // 按钮网格列数：桌面4列 / 大屏手机3列 / 手机&小屏2列 / 平板3列
    function _gridCols() {
        var bp = _getBreakpoint();
        if (bp === 'desktop' || bp === 'lgPhone') return 4;
        if (bp === 'tablet') return 3;
        return 2;
    }

    // 生成媒体查询 CSS 字符串（带列数断点）
    function _mq(breakpoint, scale) {
        var b = _BASE, s = scale;
        var pw = _panelW(s), ph = _pillH(s), ptl = _sz(b.pillTL, s);
        var pt = _sz(b.panelTop, s);
        var pad = _sz(b.pad, s), clipR = _sz(b.clipR, s);
        var hFS = _sz(b.headerFS, s), gFS = _sz(b.gaugeFS, s);
        var stH = _sz(b.sliderTrackH, s), stT = _sz(b.sliderThumb, s);
        var gap = _sz(b.gridGap, s), btnH = _btnH(s), btnFS = _sz(b.btnFS, s), btnClip = _sz(b.btnClip, s);
        var rPV = _sz(b.resetPadV, s), rPH = _sz(b.resetPadH, s), rFS = _sz(b.resetFS, s);
        var pFS = _sz(b.persistFS, s);
        var tFS = _sz(b.toastFS, s), tPV = _sz(b.toastPadV, s), tPH = _sz(b.toastPadH, s), tClip = _sz(b.toastClip, s);
        var iL = _sz(b.iconL, s), iTB = _sz(b.iconTB, s);
        var spFS = _sz(b.speedFS, s);
        var cols = (breakpoint === 'lgPhone') ? 4
                 : (breakpoint === 'tablet')  ? 3
                 : 2;
        // 移动端紧凑模式：phone 及以下缩小内边距和间距
        var isCompact = (breakpoint === 'phone' || breakpoint === 'small' || breakpoint === 'lgPhone');
        var cPad  = isCompact ? Math.max(8,  Math.round(pad  * 0.6)) : pad;
        var cMbtn = isCompact ? Math.max(4,  Math.round(12 * 0.6)) : 12; // margin-bottom header
        var cMgug = isCompact ? Math.max(4,  Math.round(16 * 0.6)) : 16; // margin-bottom gauge
        var cMslw = isCompact ? Math.max(4,  Math.round(16 * 0.6)) : 16; // margin-bottom slider-wrap
        var cMgri = isCompact ? Math.max(4,  Math.round(12 * 0.6)) : 12; // margin-bottom grid
        var cPtop = isCompact ? Math.max(4,  Math.round(10 * 0.6)) : 10; // padding-top footer
        var cPbot = isCompact ? Math.max(4,  Math.round( 8 * 0.6)) :  8; // padding-bottom header

        return '@media (max-width:' + breakpoint + 'px){' +
            '.gaming-pill{top:' + ptl + 'px;left:' + ptl + 'px;width:' + _sz(b.pillW,s) + 'px;height:' + ph + 'px}' +
            '.pill-icon{border-left-width:' + iL + 'px;border-top-width:' + iTB + 'px;border-bottom-width:' + iTB + 'px}' +
            '.pill-speed{font-size:' + spFS + 'px}' +
            '.gaming-panel{top:' + pt + 'px;left:' + ptl + 'px;width:' + pw + 'px;padding:' + cPad + 'px;clip-path:polygon(' + clipR + 'px 0,calc(100% - ' + clipR + 'px) 0,100% ' + clipR + 'px,100% calc(100% - ' + clipR + 'px),calc(100% - ' + clipR + 'px) 100%,' + clipR + 'px 100%,0 calc(100% - ' + clipR + 'px),0 ' + clipR + 'px);overflow-y:auto}' +
            '.gp-header{font-size:' + hFS + 'px;margin-bottom:' + cMbtn + 'px;padding-bottom:' + cPbot + 'px}' +
            '.gp-close{width:' + Math.round(hFS * 1.6) + 'px;height:' + Math.round(hFS * 1.6) + 'px;font-size:' + hFS + 'px}' +
            '.gauge-value{font-size:' + gFS + 'px}' +
            '.gaming-gauge{margin-bottom:' + cMgug + 'px}' +
            '.gaming-slider-wrap{margin-bottom:' + cMslw + 'px}' +
            '.gaming-slider{height:' + stH + 'px}' +
            '.gaming-slider::-webkit-slider-thumb{width:' + stT + 'px;height:' + stT + 'px}' +
            '.gaming-slider::-moz-range-thumb{width:' + stT + 'px;height:' + stT + 'px}' +
            '.gaming-grid{grid-template-columns:repeat(' + cols + ',1fr);gap:' + gap + 'px;margin-bottom:' + cMgri + 'px}' +
            '.gaming-btn{height:' + btnH + 'px;font-size:' + btnFS + 'px;clip-path:polygon(' + btnClip + 'px 0,calc(100% - ' + btnClip + 'px) 0,100% ' + btnClip + 'px,100% calc(100% - ' + btnClip + 'px),calc(100% - ' + btnClip + 'px) 100%,' + btnClip + 'px 100%,0 calc(100% - ' + btnClip + 'px),0 ' + btnClip + 'px)}' +
            '.gaming-reset{padding:' + rPV + 'px ' + rPH + 'px;font-size:' + rFS + 'px;clip-path:polygon(' + btnClip + 'px 0,calc(100% - ' + btnClip + 'px) 0,100% ' + btnClip + 'px,100% calc(100% - ' + btnClip + 'px),calc(100% - ' + btnClip + 'px) 100%,' + btnClip + 'px 100%,0 calc(100% - ' + btnClip + 'px),0 ' + btnClip + 'px)}' +
            '.gaming-footer{padding-top:' + cPtop + 'px}' +
            '.gaming-persist-label{font-size:' + pFS + 'px}' +
            '.gaming-toast{font-size:' + tFS + 'px;padding:' + tPV + 'px ' + tPH + 'px;clip-path:polygon(' + tClip + 'px 0,calc(100% - ' + tClip + 'px) 0,100% ' + tClip + 'px,100% calc(100% - ' + tClip + 'px),calc(100% - ' + tClip + 'px) 100%,' + tClip + 'px 100%,0 calc(100% - ' + tClip + 'px),0 ' + tClip + 'px)}' +
        '}';
    }

    var _cssText = [
        // --- 游戏风胶囊触发器（基准值 s=1.0）---
        '.gaming-pill{position:fixed;top:' + _BASE.pillTL + 'px;left:' + _BASE.pillTL + 'px;width:' + _BASE.pillW + 'px;height:' + _BASE.pillH + 'px;border-radius:' + Math.round(_BASE.pillH/2) + 'px;background:linear-gradient(90deg,#1a1a2e,#2d2d44);border:2px solid #00ff88;box-shadow:0 0 8px rgba(0,255,136,.3);z-index:2147483647;cursor:pointer;user-select:none;display:flex;align-items:center;padding:0 ' + Math.round(_BASE.pillW*0.1) + 'px;gap:' + Math.round(_BASE.pillW*0.05) + 'px;touch-action:none;transition:box-shadow .15s}',
        '.gaming-pill:hover{box-shadow:0 0 14px rgba(0,255,136,.5)}',
        '.gaming-pill:active{transform:scale(.95)}',
        '.gaming-pill.dragging{cursor:grabbing}',
        '.pill-icon{width:0;height:0;border-left:' + _BASE.iconL + 'px solid #00ff88;border-top:' + _BASE.iconTB + 'px solid transparent;border-bottom:' + _BASE.iconTB + 'px solid transparent;flex-shrink:0}',
        '.pill-speed{font-family:Rajdhani,sans-serif;font-size:' + _BASE.speedFS + 'px;font-weight:700;color:#00ff88;text-shadow:0 0 6px rgba(0,255,136,.5)}',

        // --- 游戏面板（基准值 s=1.0）---
        '.gaming-panel{position:fixed;top:' + _BASE.panelTop + 'px;left:' + _BASE.pillTL + 'px;width:' + _BASE.panelW + 'px;background:#1a1a2e;border:2px solid #00ff88;z-index:2147483646;user-select:none;visibility:hidden;opacity:0;transform:translateY(10px);transition:visibility 0s .2s,opacity .2s,transform .2s;clip-path:polygon(' + _BASE.clipR + 'px 0,calc(100% - ' + _BASE.clipR + 'px) 0,100% ' + _BASE.clipR + 'px,100% calc(100% - ' + _BASE.clipR + 'px),calc(100% - ' + _BASE.clipR + 'px) 100%,' + _BASE.clipR + 'px 100%,0 calc(100% - ' + _BASE.clipR + 'px),0 ' + _BASE.clipR + 'px);padding:' + _BASE.pad + 'px;overflow-y:auto;-webkit-overflow-scrolling:touch}',
        '.gaming-panel.open{visibility:visible;opacity:1;transform:translateY(0);transition:visibility 0s,opacity .2s,transform .2s}',
        '.gp-header{font-family:"Press Start 2P",monospace;font-size:' + _BASE.headerFS + 'px;color:#00ff88;letter-spacing:2px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #2d2d44;text-shadow:0 0 6px rgba(0,255,136,.4);display:flex;align-items:center;justify-content:space-between;gap:8px}',
        '.gp-close{width:' + Math.round(_BASE.headerFS * 1.6) + 'px;height:' + Math.round(_BASE.headerFS * 1.6) + 'px;background:transparent;border:1px solid #ff4444;color:#ff4444;font-size:' + Math.round(_BASE.headerFS) + 'px;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;flex-shrink:0;padding:0;line-height:1}',
        '.gp-close:hover{background:#ff4444;color:#1a1a2e}',
        '.gp-close:active{transform:scale(.9)}',

        // --- 仪表盘 ---
        '.gaming-gauge{text-align:center;margin-bottom:16px}',
        '.gaming-gauge svg{filter:drop-shadow(0 0 4px rgba(0,255,136,.3));width:100%;height:auto;display:block}',
        '.gauge-value{font-family:Rajdhani,sans-serif;font-size:' + _BASE.gaugeFS + 'px;font-weight:700;color:#00ff88;text-shadow:0 0 12px rgba(0,255,136,.5);margin-top:-4px}',

        // --- 滑块 ---
        '.gaming-slider-wrap{margin-bottom:16px;padding:0 4px}',
        '.gaming-slider-wrap label{font-size:10px;color:#8888aa;display:block;margin-bottom:6px}',
        '.gaming-slider{-webkit-appearance:none;appearance:none;width:100%;height:' + _BASE.sliderTrackH + 'px;background:#2d2d44;border-radius:' + Math.round(_BASE.sliderTrackH/2) + 'px;outline:none;cursor:pointer}',
        '.gaming-slider::-webkit-slider-thumb{-webkit-appearance:none;width:' + _BASE.sliderThumb + 'px;height:' + _BASE.sliderThumb + 'px;border-radius:50%;background:#00ff88;border:2px solid #1a1a2e;box-shadow:0 0 8px rgba(0,255,136,.5);cursor:pointer}',
        '.gaming-slider::-moz-range-thumb{width:' + _BASE.sliderThumb + 'px;height:' + _BASE.sliderThumb + 'px;border-radius:50%;background:#00ff88;border:2px solid #1a1a2e;box-shadow:0 0 8px rgba(0,255,136,.5);cursor:pointer}',
        '.gaming-slider-value{display:block;font-family:Rajdhani,sans-serif;font-size:11px;color:#00ff88;text-align:center;margin-top:4px;text-shadow:0 0 4px rgba(0,255,136,.4);min-height:14px}',

        // --- 预设按钮网格 ---
        '.gaming-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:' + _BASE.gridGap + 'px;margin-bottom:12px}',
        '.gaming-btn{height:' + _BASE.btnH + 'px;background:#2d2d44;border:1px solid #3d3d55;color:#e0e0e0;font-family:Rajdhani,sans-serif;font-size:' + _BASE.btnFS + 'px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;user-select:none;clip-path:polygon(' + _BASE.btnClip + 'px 0,calc(100% - ' + _BASE.btnClip + 'px) 0,100% ' + _BASE.btnClip + 'px,100% calc(100% - ' + _BASE.btnClip + 'px),calc(100% - ' + _BASE.btnClip + 'px) 100%,' + _BASE.btnClip + 'px 100%,0 calc(100% - ' + _BASE.btnClip + 'px),0 ' + _BASE.btnClip + 'px);transition:background .1s,color .1s,transform .1s}',
        '.gaming-btn:hover{background:#3d3d55;transform:translateY(-1px)}',
        '.gaming-btn:active{transform:scale(.95)}',
        '.gaming-btn.active{background:#00ff88;color:#1a1a2e;border-color:#00ff88}',

        // --- 底部 ---
        '.gaming-footer{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #2d2d44}',
        '.gaming-reset{font-family:"Press Start 2P",monospace;font-size:' + _BASE.resetFS + 'px;padding:' + _BASE.resetPadV + 'px ' + _BASE.resetPadH + 'px;background:#ff8800;color:#1a1a2e;border:none;cursor:pointer;clip-path:polygon(' + _BASE.btnClip + 'px 0,calc(100% - ' + _BASE.btnClip + 'px) 0,100% ' + _BASE.btnClip + 'px,100% calc(100% - ' + _BASE.btnClip + 'px),calc(100% - ' + _BASE.btnClip + 'px) 100%,' + _BASE.btnClip + 'px 100%,0 calc(100% - ' + _BASE.btnClip + 'px),0 ' + _BASE.btnClip + 'px);transition:filter .15s}',
        '.gaming-reset:active{filter:brightness(.8)}',
        '.gaming-persist-label{font-size:' + _BASE.persistFS + 'px;color:#8888aa;display:flex;align-items:center;gap:6px}',
        '.gaming-persist-label input{accent-color:#00ff88}',

        // --- Toast ---
        '.gaming-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(26,26,46,.95);border:1px solid #00ff88;color:#00ff88;font-family:Rajdhani,sans-serif;font-size:' + _BASE.toastFS + 'px;font-weight:600;padding:' + _BASE.toastPadV + 'px ' + _BASE.toastPadH + 'px;z-index:2147483647;display:none;text-shadow:0 0 4px rgba(0,255,136,.3);clip-path:polygon(' + _BASE.toastClip + 'px 0,calc(100% - ' + _BASE.toastClip + 'px) 0,100% ' + _BASE.toastClip + 'px,100% calc(100% - ' + _BASE.toastClip + 'px),calc(100% - ' + _BASE.toastClip + 'px) 100%,' + _BASE.toastClip + 'px 100%,0 calc(100% - ' + _BASE.toastClip + 'px),0 ' + _BASE.toastClip + 'px)}',

        // --- 响应式断点（基于数学比例计算，覆盖主流设备）---
        // 基准宽度 1366px，面板最小宽度 200px（MAX(300*s, 200)）
        // lgPhone  480px  → s≈0.903  面板 271px（iPhone 14 Pro Max / Pixel 7 Pro）
        // phone    390px  → s≈0.740  面板 222px（iPhone 14/13/12 / Galaxy S23）
        // small    320px  → clamp    面板 200px（iPhone SE / 小屏 Android）
        // tablet   768px  → clamp    面板 200px（iPad / Surface Go）
        // 按钮列数：desktop/lgPhone=4列，tablet=3列，phone/small=2列
        _mq('lgPhone', _SCALE_TABLE.lgPhone),
        _mq('phone',   _SCALE_TABLE.phone),
        _mq('small',   _SCALE_TABLE.small),
        _mq('tablet',  _SCALE_TABLE.tablet),

        // --- 无障碍：减少动画 + 触控优化 ---
        '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important}}' +
        // --- 触控设备优化 ---
        '@media (hover:none) and (pointer:coarse){.gaming-btn{touch-action:manipulation}.gaming-slider{touch-action:manipulation}.gaming-pill{touch-action:none}}' +
        // --- 面板滚动优化 ---
        '.gaming-panel::-webkit-scrollbar{width:4px}' +
        '.gaming-panel::-webkit-scrollbar-track{background:rgba(0,0,0,.2)}' +
        '.gaming-panel::-webkit-scrollbar-thumb{background:#00ff88;border-radius:2px}'
    ];

    var _styleNode = document.createElement('style');
    _styleNode.textContent = _cssText.join('');

    // ================================================================
    // Part 3: 常量与配置
    // ================================================================

    var _SPEEDS = [0.1, 0.2, 0.5, 0.8, 1, 1.5, 2, 3, 5, 10, 20, 30, 50, 80, 100, 200];
    var _STORAGE_KEY = 'gameSpeed';
    var _PERSIST_KEY = 'speedPersistent';

    // ================================================================
    // Part 4: DOM 创建与 UI 逻辑
    // ================================================================

    var _isPanelOpen = false;
    var _currentSpeed = 1;
    var _isPersistent = false;
    var _sliderDragging = false;
    var _isLandscape = false;

    // DOM 引用（在 _mountUI 中赋值）
    var _pill, _panel, _pillSpeed, _gaugeValue, _gaugeFill, _gaugeNeedle;
    var _slider, _grid, _resetBtn, _persistChk, _toast;

    function speedToSlider(speed) {
        return ((Math.log10(speed) + 1) / 3.3) * 100;
    }
    function sliderToSpeed(val) {
        return Math.pow(10, -1 + (val / 100) * 3.3);
    }
    function speedToAngle(speed) {
        var normalized = (Math.log10(speed) + 1) / 3.3;
        return -90 + normalized * 180;
    }
    function updateGauge(speed) {
        if (!_gaugeNeedle || !_gaugeFill) return;
        var angle = speedToAngle(speed);
        _gaugeNeedle.setAttribute('transform', 'rotate(' + angle + ', 60, 65)');
        var normalized = (Math.log10(Math.max(0.1, speed)) + 1) / 3.3;
        var dashOffset = 157 - normalized * 157;
        _gaugeFill.setAttribute('stroke-dashoffset', dashOffset);
    }

    function showToast(msg) {
        if (!_toast) return;
        _toast.textContent = msg;
        _toast.style.display = 'block';
        _origSetTimeout.call(window, function () { _toast.style.display = 'none'; }, 2000);
    }

    function setSpeedUI(v, highlightBtns) {
        if (highlightBtns === undefined) highlightBtns = true;
        _currentSpeed = v;
        var label = v >= 1 ? v : (Math.round(v * 10) / 10);
        if (_gaugeValue) _gaugeValue.textContent = label + 'x';
        if (_pillSpeed) _pillSpeed.textContent = label + 'x';
        if (_slider) _slider.value = speedToSlider(v);
        updateGauge(v);

        if (highlightBtns && _grid) {
            var btns = _grid.querySelectorAll('.gaming-btn');
            for (var j = 0; j < btns.length; j++) {
                var btnVal = parseFloat(btns[j].getAttribute('data-speed'));
                btns[j].classList.toggle('active', Math.abs(btnVal - v) < 0.05);
            }
        }

        try { _applySpeed(v); showToast(v !== 1 ? 'ACCEL ' + label + 'x' : 'RESET 1x'); }
        catch (err) { showToast('ERR: ' + err.message); }
        if (_isPersistent) {
            try { localStorage.setItem(_STORAGE_KEY, v); } catch (e) { }
        }
    }

    function _openPanel() {
        _isPanelOpen = true;
        _panel.classList.add('open');
    }
    function _closePanel() {
        _isPanelOpen = false;
        _panel.classList.remove('open');
    }

    // ================================================================
    // Part 5: _mountUI - 创建所有 DOM 并绑定事件
    // ================================================================

    function _mountUI() {
        if (window.__gamingAcceleratorRendered) return;
        window.__gamingAcceleratorRendered = true;

        // 注入 CSS
        document.head.appendChild(_styleNode);

        var frag = document.createDocumentFragment();

        // === 创建 .gaming-pill ===
        _pill = document.createElement('div');
        _pill.className = 'gaming-pill';
        _pill.id = 'gamingPill';
        _pill.title = '点击展开 · 拖拽移动';
        _pill.innerHTML = '<div class="pill-icon"></div><span class="pill-speed" id="pillSpeed">1x</span>';
        _pillSpeed = _pill.querySelector('.pill-speed');
        frag.appendChild(_pill);

        // === 创建 .gaming-panel ===
        _panel = document.createElement('div');
        _panel.className = 'gaming-panel';
        _panel.id = 'gamingPanel';

        // 标题（带关闭按钮）
        var header = document.createElement('div');
        header.className = 'gp-header';
        header.innerHTML = '<span>TIME WARP</span><button class="gp-close" id="gpCloseBtn" title="关闭">✕</button>';
        _panel.appendChild(header);
        // 关闭按钮（从 header 元素查找，因为此时还未挂载到 document）
        header.querySelector('#gpCloseBtn').addEventListener('click', function (e) {
            e.stopPropagation();
            _closePanel();
        });

        // SVG 仪表盘
        var gaugeDiv = document.createElement('div');
        gaugeDiv.className = 'gaming-gauge';
        gaugeDiv.innerHTML =
            '<svg viewBox="0 0 120 70">' +
            '<path d="M 10 65 A 50 50 0 0 1 110 65" stroke="#2d2d44" stroke-width="8" fill="none"/>' +
            '<path d="M 10 65 A 50 50 0 0 1 110 65" stroke="#00ff88" stroke-width="8" fill="none" stroke-dasharray="157" stroke-dashoffset="157" id="gaugeFill"/>' +
            '<line x1="60" y1="65" x2="60" y2="20" stroke="#ff8800" stroke-width="2" id="gaugeNeedle" transform="rotate(-90, 60, 65)" stroke-linecap="round"/>' +
            '<circle cx="60" cy="65" r="4" fill="#ff8800"/>' +
            '</svg>' +
            '<div class="gauge-value" id="gaugeValue">1x</div>';
        _panel.appendChild(gaugeDiv);
        _gaugeValue = gaugeDiv.querySelector('.gauge-value');
        _gaugeFill = gaugeDiv.querySelector('#gaugeFill');
        _gaugeNeedle = gaugeDiv.querySelector('#gaugeNeedle');

        // 精确调速滑块
        var sliderWrap = document.createElement('div');
        sliderWrap.className = 'gaming-slider-wrap';
        sliderWrap.innerHTML = '<label>精确调速</label><input type="range" class="gaming-slider" id="gamingSlider" min="0" max="100" value="30"><span class="gaming-slider-value" id="gamingSliderValue">1.0x</span>';
        _panel.appendChild(sliderWrap);
        _slider = sliderWrap.querySelector('.gaming-slider');
        var _sliderLabel = sliderWrap.querySelector('.gaming-slider-value');

        // 预设按钮网格
        _grid = document.createElement('div');
        _grid.className = 'gaming-grid';
        _grid.id = 'gamingGrid';
        _SPEEDS.forEach(function (spd) {
            var btn = document.createElement('button');
            btn.className = 'gaming-btn';
            btn.setAttribute('data-speed', spd);
            var label = spd < 1 ? spd.toFixed(1) : spd;
            btn.textContent = label + 'x';
            btn.addEventListener('click', function () {
                setSpeedUI(parseFloat(this.getAttribute('data-speed')));
            });
            _grid.appendChild(btn);
        });
        _panel.appendChild(_grid);

        // 底部控制栏
        var footer = document.createElement('div');
        footer.className = 'gaming-footer';
        footer.innerHTML =
            '<label class="gaming-persist-label"><input type="checkbox" id="gamingPersist"> 保持</label>' +
            '<button class="gaming-reset" id="gamingReset">RESET</button>';
        _panel.appendChild(footer);
        _persistChk = footer.querySelector('#gamingPersist');
        _resetBtn = footer.querySelector('#gamingReset');

        frag.appendChild(_panel);

        // === Toast ===
        _toast = document.createElement('div');
        _toast.className = 'gaming-toast';
        _toast.id = 'gamingToast';
        document.body.appendChild(_toast);

        // 挂载到 body：直接 appendChild，与 moonbeam 保持一致
        // 不使用 insertBefore，因为 Laya canvas 默认铺满视口，insertBefore 反而导致 canvas 渲染在 pill 上方
        document.body.appendChild(frag);
        console.log('[Gaming-Accel] UI appended to body');

        console.log('[Gaming-Accel] Pill in DOM:', document.body.contains(_pill));
        console.log('[Gaming-Accel] Pill offsetWidth:', _pill ? _pill.offsetWidth : 'null');
        console.log('[Gaming-Accel] Pill computed position:', _pill ? getComputedStyle(_pill).position : 'N/A');
        console.log('[Gaming-Accel] Pill computed zIndex:', _pill ? getComputedStyle(_pill).zIndex : 'N/A');

        // 强制刷新样式
        void _pill.offsetHeight;

        // === 绑定事件 ===

        // pill 点击切换面板（区分点击与拖拽）
        var _wasDragged = false;
        _pill.addEventListener('click', function (e) {
            if (_wasDragged) { _wasDragged = false; return; }
            e.stopPropagation();
            if (_isPanelOpen) _closePanel();
            else _openPanel();
            _wasDragged = false;
        });
        // 仅在真正发生拖拽时标记，避免移动端点击被误判为拖拽
        var _touchStartPos = null;
        var _DRAG_THRESH = ('ontouchstart' in window) ? 5 : 6;
        _pill.addEventListener('touchstart', function (e) {
            var t = e.touches[0];
            _touchStartPos = { x: t.clientX, y: t.clientY };
        }, { passive: true });
        document.addEventListener('touchmove', function (e) {
            if (!_touchStartPos) return;
            var t = e.touches[0];
            var dx = t.clientX - _touchStartPos.x;
            var dy = t.clientY - _touchStartPos.y;
            if (Math.abs(dx) > _DRAG_THRESH || Math.abs(dy) > _DRAG_THRESH) {
                _wasDragged = true;
                _touchStartPos = null;
            }
        }, { passive: true });
        document.addEventListener('touchend', function () {
            _touchStartPos = null;
        }, { passive: true });
        // 鼠标拖拽标记
        _pill.addEventListener('mousedown', function () {
            _wasDragged = false;
        });
        document.addEventListener('mouseup', function () {
            _wasDragged = false;
        });

        // 点击外部关闭
        document.addEventListener('click', function (e) {
            if (_isPanelOpen && !_panel.contains(e.target) && e.target !== _pill && !_pill.contains(e.target)) {
                _closePanel();
            }
        });

        // RESET 按钮
        _resetBtn.addEventListener('click', function () { setSpeedUI(1); });

        // 持久化 checkbox
        _persistChk.addEventListener('change', function () {
            _isPersistent = _persistChk.checked;
            try {
                if (_isPersistent) {
                    localStorage.setItem(_STORAGE_KEY, _currentSpeed);
                    localStorage.setItem(_PERSIST_KEY, 'true');
                } else {
                    localStorage.removeItem(_STORAGE_KEY);
                    localStorage.removeItem(_PERSIST_KEY);
                }
            } catch (e) { }
        });

        // 滑块交互：拖动时实时精确调速，松开后吸附到最近的预设速度
        _slider.addEventListener('input', function () {
            _isSliding = true;
            var rawSpeed = sliderToSpeed(parseFloat(_slider.value));
            rawSpeed = Math.max(_SPEEDS[0], Math.min(_SPEEDS[_SPEEDS.length - 1], rawSpeed));
            var label = rawSpeed >= 1 ? rawSpeed : (Math.round(rawSpeed * 100) / 100);
            if (_sliderLabel) _sliderLabel.textContent = label + 'x';
            if (_gaugeValue) _gaugeValue.textContent = label + 'x';
            if (_pillSpeed) _pillSpeed.textContent = label + 'x';
            updateGauge(rawSpeed);
            try { _applySpeed(rawSpeed); } catch (err) { }
        });
        _slider.addEventListener('change', function () {
            var rawSpeed = sliderToSpeed(parseFloat(_slider.value));
            rawSpeed = Math.max(_SPEEDS[0], Math.min(_SPEEDS[_SPEEDS.length - 1], rawSpeed));
            // 吸附到最近预设速度
            var nearest = _SPEEDS[0];
            var minDiff = Infinity;
            for (var i = 0; i < _SPEEDS.length; i++) {
                var diff = Math.abs(Math.log(_SPEEDS[i]) - Math.log(rawSpeed));
                if (diff < minDiff) { minDiff = diff; nearest = _SPEEDS[i]; }
            }
            if (_sliderLabel) _sliderLabel.textContent = '';
            setSpeedUI(nearest, true);
        });

        // 键盘快捷键
        document.addEventListener('keydown', function (e) {
            var currentSpeed = window.$hookTimer.getSpeed();
            switch (e.keyCode) {
                case 48: // 0
                    if (e.ctrlKey || e.altKey) { setSpeedUI(1); e.preventDefault(); }
                    break;
                case 187: case 190: // + / .
                    if (e.ctrlKey) { setSpeedUI(Math.min(200, currentSpeed + 2)); e.preventDefault(); }
                    else if (e.altKey) { setSpeedUI(Math.min(200, currentSpeed * 2)); e.preventDefault(); }
                    break;
                case 189: case 188: // - / ,
                    if (e.ctrlKey) { setSpeedUI(Math.max(0.1, currentSpeed - 2)); e.preventDefault(); }
                    else if (e.altKey) { setSpeedUI(Math.max(0.1, currentSpeed / 2)); e.preventDefault(); }
                    break;
                case 27: // Esc
                    if (_isPanelOpen) _closePanel();
                    break;
            }
        });

        // 拖拽 pill（兼容鼠标和触摸，优化触控灵敏度）
        (function (el) {
            var sx = null, sy = null, isDrag = false;
            // 触控设备用更小的拖拽阈值（3px），鼠标用原有阈值（6px）
            var DRAG_THRESHOLD = ('ontouchstart' in window) ? 3 : 6;
            function start(e) {
                var t = e.touches ? e.touches[0] : e;
                sx = t.clientX; sy = t.clientY; isDrag = false;
                el.classList.add('dragging');
            }
            function move(e) {
                if (sx === null) return;
                var t = e.touches ? e.touches[0] : e;
                var dx = t.clientX - sx, dy = t.clientY - sy;
                if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                    isDrag = true;
                    var cl = parseInt(el.style.left || _BASE.pillTL);
                    var ct = parseInt(el.style.top || _BASE.pillTL);
                    el.style.left = (cl + dx) + 'px';
                    el.style.top = (ct + dy) + 'px';
                    // 面板跟随 pill 移动（打开时）
                    if (_panel && _isPanelOpen) {
                        _repositionPanel();
                    }
                    sx = t.clientX; sy = t.clientY;
                    e.preventDefault();
                }
            }
            function end(e) {
                el.classList.remove('dragging');
                if (isDrag) { e.preventDefault(); e.stopPropagation(); }
                sx = null; isDrag = false;
            }
            el.addEventListener('mousedown', start);
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', end);
            el.addEventListener('touchstart', start, { passive: false });
            document.addEventListener('touchmove', move, { passive: false });
            document.addEventListener('touchend', end, { passive: false });
        })(_pill);

        // === 初始化 ===
        try {
            var savedPersist = localStorage.getItem(_PERSIST_KEY);
            var savedSpeed = localStorage.getItem(_STORAGE_KEY);
            if (savedPersist === 'true' && savedSpeed) {
                var spd = parseFloat(savedSpeed);
                if (!isNaN(spd) && spd !== 1) {
                    _isPersistent = true;
                    _persistChk.checked = true;
                    _origSetTimeout.call(window, function () { setSpeedUI(spd); }, 800);
                }
            }
        } catch (e) { }

        if (!_isPersistent) {
            setSpeedUI(1);
        }

        // 初始仪表盘
        updateGauge(1);
        if (_slider) _slider.value = speedToSlider(1);

        // ================================================================
        // 视口边界检测与横屏适配
        // ================================================================
        function _repositionPanel() {
            if (!_panel || !_pill) return;
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var pw = _panel.offsetWidth || _panelW(_getScale());
            var pillH = _pill.offsetHeight || _BASE.pillH;
            var pillW = _pill.offsetWidth || _BASE.pillW;

            // 面板最大高度：不超过视口高度的 75%，保证内容可滚动
            var maxPh = Math.floor(vh * 0.75) - 16;
            var ph = Math.min(_panel.offsetHeight || 520, maxPh);
            _panel.style.maxHeight = maxPh + 'px';

            // 检测横屏（宽高比 > 1.4 或高度明显小于宽度）
            _isLandscape = (vw > vh && vw > 600) || (vw / vh > 1.4);

            // 胶囊当前位置
            var cx = parseInt(_pill.style.left || _BASE.pillTL);
            var cy = parseInt(_pill.style.top || _BASE.pillTL);

            // 面板位置：横屏时显示在胶囊右侧，竖屏时显示在胶囊右下方
            var panelX, panelY;
            if (_isLandscape) {
                // 横屏：面板紧贴胶囊右侧，垂直居中
                panelX = cx + pillW + 8;
                panelY = cy + Math.max(0, (pillH - ph) / 2);
            } else {
                // 竖屏：面板在胶囊右下方，左边缘对齐胶囊右边缘
                panelX = cx + pillW + 8;
                panelY = cy + pillH + 8;
            }

            // 边界修正：确保不超出视口右/下边缘
            if (panelX + pw > vw - 8) panelX = vw - pw - 8;
            if (panelY + ph > vh - 8) panelY = vh - ph - 8;
            if (panelX < 8) panelX = 8;
            if (panelY < 8) panelY = 8;

            _panel.style.left = panelX + 'px';
            _panel.style.top = panelY + 'px';
        }

        // 面板打开时重新定位
        var _origOpenPanel = _openPanel;
        var _origClosePanel = _closePanel;
        _openPanel = function () {
            _isPanelOpen = true;
            _panel.classList.add('open');
            _repositionPanel();
        };
        _closePanel = function () {
            _isPanelOpen = false;
            _panel.classList.remove('open');
        };

        // 窗口 resize / orientation change 时重新定位
        var _resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(_resizeTimer);
            _resizeTimer = setTimeout(_repositionPanel, 150);
        });
        window.addEventListener('orientationchange', function () {
            setTimeout(_repositionPanel, 300);
        });

        // 面板打开状态下触摸移动时实时更新位置（仅移动端）
        if ('ontouchstart' in window) {
            document.addEventListener('touchmove', function (e) {
                if (!_isPanelOpen) return;
                // 避免在拖拽 pill 时重复处理
                if (_pill && document.body.contains(_pill) &&
                    e.target === _pill || (_pill && _pill.contains(e.target))) return;
                _repositionPanel();
            }, { passive: true });
        }
    }

    // ================================================================
    // Part 6: 初始化入口
    // ================================================================

    // 加载顺序与 moonbeam 一致：在所有游戏脚本之后执行
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        _mountUI();
    } else {
        document.addEventListener('readystatechange', function () {
            if ((document.readyState === 'interactive' || document.readyState === 'complete') && !window.__gamingAcceleratorRendered) {
                _mountUI();
            }
        });
    }
})();
