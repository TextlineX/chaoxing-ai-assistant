// ==UserScript==
// @name         超星作业 AI 助手
// @namespace    https://github.com/TextlineX/chaoxing-ai-assistant
// @homepageURL  https://github.com/TextlineX/chaoxing-ai-assistant
// @supportURL   https://greasyfork.org/zh-CN/scripts/577882-%E8%B6%85%E6%98%9F%E4%BD%9C%E4%B8%9A-ai-%E5%8A%A9%E6%89%8B
// @downloadURL  https://raw.githubusercontent.com/TextlineX/chaoxing-ai-assistant/main/%E8%B6%85%E6%98%9F%E4%BD%9C%E4%B8%9A%20%E5%8A%A9%E6%89%8B.user.js
// @updateURL    https://raw.githubusercontent.com/TextlineX/chaoxing-ai-assistant/main/%E8%B6%85%E6%98%9F%E4%BD%9C%E4%B8%9A%20%E5%8A%A9%E6%89%8B.user.js
// @icon         https://raw.githubusercontent.com/TextlineX/chaoxing-ai-assistant/main/docs/icon.svg
// @version      24.5
// @description  用于超星学习通作业页面的用户脚本，支持题目导出、AI 回填、UEditor 解锁、拖动浮球与可配置面板。
// @author       Textline
// @license      MIT
// @match        https://mooc1.chaoxing.com/mooc-ans/mooc2/work/view*
// @match        https://mooc1.chaoxing.com/mooc-ans/mooc2/work/dowork*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 1. 解锁粘贴限制
    const hookUEditor = () => {
        if (window.UE && window.UE.Editor) {
            const originalFire = window.UE.Editor.prototype.fireEvent;
            window.UE.Editor.prototype.fireEvent = function(type) {
                if (type === 'beforepaste') return;
                return originalFire.apply(this, arguments);
            };
            log("🔓 粘贴限制已自动解除");
        } else {
            setTimeout(hookUEditor, 1500);
        }
    };

    GM_addStyle(`
        :root {
            --yan-panel-width: 360px;
            --yan-panel-opacity: 0.97;
            --yan-float-duration: 4.8s;
            --yan-ball-size: 64px;
        }
        #yan-ball {
            position: fixed;
            left: 20px;
            top: 20px;
            width: var(--yan-ball-size);
            height: var(--yan-ball-size);
            background:
                radial-gradient(circle at 28% 24%, rgba(255,255,255,0.98) 0 8%, rgba(255,255,255,0.38) 10%, rgba(255,255,255,0) 30%),
                radial-gradient(circle at 68% 72%, rgba(31,145,255,0.24) 0 14%, rgba(31,145,255,0) 54%),
                linear-gradient(145deg, #58b9ff 0%, #2d93ff 40%, #0f68ef 100%);
            border-radius: 46% 54% 52% 48% / 44% 42% 58% 56%;
            box-shadow:
                0 18px 34px rgba(8, 72, 170, 0.28),
                inset 0 1px 3px rgba(255,255,255,0.45),
                inset 0 -10px 18px rgba(0,0,0,0.14);
            cursor: grab;
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.04em;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            overflow: hidden;
            transition: box-shadow 0.22s ease, filter 0.22s ease;
            animation: yan-morph var(--yan-float-duration) ease-in-out infinite, yan-breathe 3.1s ease-in-out infinite, yan-drift 7.8s ease-in-out infinite;
            will-change: transform, left, top, border-radius;
        }
        #yan-ball::before {
            content: "";
            position: absolute;
            inset: -12%;
            border-radius: 48% 52% 54% 46% / 50% 46% 54% 50%;
            background:
                radial-gradient(circle at 28% 28%, rgba(255,255,255,0.56) 0 10%, rgba(255,255,255,0.12) 28%, rgba(255,255,255,0) 56%),
                radial-gradient(circle at 68% 72%, rgba(34,141,255,0.32) 0 12%, rgba(34,141,255,0) 60%);
            filter: blur(6px);
            opacity: 0.9;
            transform: translate3d(0, 0, 0);
            animation: yan-swim calc(var(--yan-float-duration) * 1.15) ease-in-out infinite;
            pointer-events: none;
        }
        #yan-ball::after {
            content: "";
            position: absolute;
            inset: 12% 16% 50% 16%;
            border-radius: 50%;
            background: linear-gradient(to bottom, rgba(255,255,255,0.72), rgba(255,255,255,0));
            filter: blur(1px);
            opacity: 0.95;
            animation: yan-sheen 2.7s ease-in-out infinite;
            pointer-events: none;
        }
        #yan-ball span {
            position: relative;
            z-index: 1;
            text-shadow: 0 1px 2px rgba(0,0,0,0.16);
        }
        #yan-ball:hover {
            filter: saturate(1.05) brightness(1.03);
            box-shadow:
                0 20px 38px rgba(8, 72, 170, 0.32),
                inset 0 1px 3px rgba(255,255,255,0.5),
                inset 0 -10px 18px rgba(0,0,0,0.12);
        }
        #yan-ball.dragging {
            cursor: grabbing;
            animation: none;
            transform: scale(1.08);
            box-shadow:
                0 24px 42px rgba(8, 72, 170, 0.35),
                inset 0 1px 3px rgba(255,255,255,0.5),
                inset 0 -10px 18px rgba(0,0,0,0.12);
        }
        #yan-ball.was-dragged {
            animation: yan-settle 0.22s ease-out;
        }
        #yan-ball.releasing {
            animation: yan-release 0.36s cubic-bezier(.2,.8,.2,1);
        }
        #yan-panel {
            position: fixed;
            width: var(--yan-panel-width);
            background: rgba(255,255,255,var(--yan-panel-opacity));
            border-radius: 22px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.18);
            border: 1px solid rgba(255,255,255,0.72);
            backdrop-filter: blur(14px);
            z-index: 9999998;
            overflow: hidden;
            font-family: sans-serif;
            opacity: 0;
            transform: translateY(14px) scale(0.96);
            transition: opacity 220ms ease, transform 260ms cubic-bezier(.2,.9,.2,1);
            pointer-events: none;
        }
        #yan-panel.is-open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        .yan-panel-shell {
            display: flex;
            flex-direction: column;
            max-height: min(82vh, 760px);
        }
        #yan-wizard-mask {
            position: fixed;
            inset: 0;
            background: rgba(13, 22, 39, 0.42);
            backdrop-filter: blur(8px);
            z-index: 9999997;
            opacity: 0;
            pointer-events: none;
            transition: opacity 220ms ease;
        }
        #yan-wizard-mask.is-open {
            opacity: 1;
            pointer-events: auto;
        }
        #yan-wizard-panel {
            position: fixed;
            left: 50%;
            top: 50%;
            z-index: 9999998;
            width: min(440px, calc(100vw - 32px));
            border-radius: 24px;
            background: rgba(255,255,255,0.98);
            box-shadow: 0 26px 70px rgba(0,0,0,0.22);
            border: 1px solid rgba(255,255,255,0.72);
            overflow: hidden;
            opacity: 0;
            transform: translate(-50%, -46%) scale(0.96);
            pointer-events: none;
            transition: opacity 220ms ease, transform 260ms cubic-bezier(.2,.9,.2,1);
        }
        #yan-wizard-panel.is-open {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            pointer-events: auto;
        }
        .yan-wizard-shell {
            display: flex;
            flex-direction: column;
        }
        .yan-wizard-head {
            padding: 18px 18px 14px;
            background: linear-gradient(180deg, #fdfefe 0%, #f3f7ff 100%);
            border-bottom: 1px solid #e8eef9;
        }
        .yan-wizard-head-top {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
        }
        .yan-wizard-title {
            margin: 0;
            font-size: 17px;
            font-weight: 900;
            color: #20324a;
        }
        .yan-wizard-subtitle {
            margin-top: 8px;
            font-size: 12px;
            line-height: 1.6;
            color: #61738b;
        }
        .yan-wizard-body {
            padding: 16px 18px 18px;
        }
        .yan-wizard-step {
            display: grid;
            gap: 10px;
            padding: 14px;
            border-radius: 18px;
            background: linear-gradient(180deg, #fbfcff 0%, #f8fbff 100%);
            border: 1px solid #edf1f7;
            margin-bottom: 12px;
        }
        .yan-wizard-step:last-child {
            margin-bottom: 0;
        }
        .yan-wizard-step-head {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 900;
            color: #21314a;
            font-size: 14px;
        }
        .yan-wizard-step-number {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            background: linear-gradient(135deg, #3e76ff 0%, #1a57e8 100%);
            box-shadow: 0 10px 20px rgba(34, 89, 226, 0.16);
            flex: 0 0 auto;
        }
        .yan-wizard-step p {
            margin: 0;
            font-size: 13px;
            line-height: 1.65;
            color: #5d6f86;
        }
        .yan-wizard-actions {
            display: flex;
            gap: 10px;
            margin-top: 14px;
            flex-wrap: wrap;
        }
        .yan-wizard-btn {
            flex: 1 1 140px;
            border: none;
            border-radius: 14px;
            padding: 12px 14px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
        }
        .yan-wizard-btn:hover {
            transform: translateY(-1px);
            filter: brightness(1.02);
        }
        .yan-wizard-btn.primary {
            color: #fff;
            background: linear-gradient(135deg, #3e76ff 0%, #1a57e8 100%);
            box-shadow: 0 12px 24px rgba(34, 89, 226, 0.18);
        }
        .yan-wizard-btn.secondary {
            color: #243449;
            background: #eff4ff;
            border: 1px solid #dbe5fb;
        }
        .yan-wizard-btn.secondary:hover {
            background: #e7efff;
            color: #1f3357;
        }
        .yan-header {
            padding: 14px 16px 12px;
            background: linear-gradient(180deg, #fafcff 0%, #eff5ff 100%);
            border-bottom: 1px solid #e8eef9;
        }
        .yan-header-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
        }
        .yan-title-wrap {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .yan-title {
            font-weight: 800;
            font-size: 16px;
            color: #20324a;
            display: block;
            letter-spacing: 0.01em;
        }
        .yan-subtitle {
            font-size: 12px;
            color: #62738b;
            line-height: 1.4;
        }
        .yan-close {
            border: none;
            background: rgba(27, 52, 89, 0.08);
            color: #20324a;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            flex: 0 0 auto;
        }
        .yan-body {
            padding: 14px;
            overflow: auto;
        }
        .yan-tabs {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            padding: 10px 14px 0;
        }
        .yan-tab {
            border: 1px solid #e6ecf6;
            background: #f8fbff;
            color: #42526b;
            border-radius: 999px;
            padding: 10px 12px;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
        }
        .yan-tab:hover {
            transform: translateY(-1px);
            background: #eef4ff;
            border-color: #cfdcf8;
        }
        .yan-tab.is-active {
            background: linear-gradient(135deg, #3e76ff 0%, #1a57e8 100%);
            border-color: transparent;
            color: #fff;
            box-shadow: 0 10px 22px rgba(34, 89, 226, 0.18);
        }
        .yan-page {
            display: none;
            animation: yan-page-in 180ms ease-out;
        }
        .yan-page.is-active {
            display: block;
        }
        .yan-section {
            border: 1px solid #edf1f7;
            background: #fff;
            border-radius: 18px;
            margin-bottom: 12px;
            overflow: hidden;
        }
        .yan-section-title {
            padding: 10px 14px 8px;
            font-size: 13px;
            font-weight: 800;
            color: #21314a;
            background: linear-gradient(180deg, #fbfcfe 0%, #f7f9fd 100%);
            border-bottom: 1px solid #edf1f7;
            letter-spacing: 0.02em;
        }
        .yan-section-desc {
            padding: 10px 14px 0;
            font-size: 12px;
            line-height: 1.55;
            color: #718197;
        }
        .yan-action-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 12px 14px 14px;
        }
        .yan-btn {
            width: 100%;
            padding: 13px 16px;
            border: none;
            cursor: pointer;
            font-weight: 700;
            font-size: 14px;
            color: #eaf1ff;
            text-align: left;
            border-radius: 14px;
            box-shadow: 0 8px 18px rgba(0,0,0,0.1);
            transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
        }
        .yan-btn:hover {
            transform: translateY(-1px);
            filter: brightness(1.03);
            box-shadow: 0 12px 24px rgba(0,0,0,0.14);
        }
        .yan-btn:active {
            transform: translateY(0);
        }
        #btn-export { background: linear-gradient(135deg, #364a63 0%, #243449 100%); }
        #btn-import { background: linear-gradient(135deg, #25b46b 0%, #18a35d 100%); }
        #btn-reset { background: linear-gradient(135deg, #f59b23 0%, #e77b12 100%); }
        #btn-wizard {
            background: linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%);
            color: #243449;
            border: 1px solid #dbe5fb;
            box-shadow: 0 8px 18px rgba(25, 53, 96, 0.06);
        }
        #btn-wizard:hover {
            color: #1f3357;
            background: linear-gradient(135deg, #eff4ff 0%, #e4ecff 100%);
        }
        .yan-settings {
            display: grid;
            gap: 12px;
            padding: 12px 14px 14px;
        }
        .yan-field {
            display: grid;
            gap: 8px;
        }
        .yan-field-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 12px;
            color: #42526b;
        }
        .yan-field-label {
            font-weight: 700;
            color: #22324a;
        }
        .yan-field-value {
            font-variant-numeric: tabular-nums;
            color: #61738b;
        }
        .yan-range {
            width: 100%;
            margin: 0;
            accent-color: #3f79ff;
        }
        .yan-switch {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
            border: 1px solid #edf1f7;
            border-radius: 14px;
            background: #fbfcfe;
        }
        .yan-switch small {
            display: block;
            color: #7a8797;
            margin-top: 4px;
            line-height: 1.4;
        }
        .yan-switch strong {
            color: #21314a;
        }
        .yan-switch input {
            width: 18px;
            height: 18px;
        }
        .yan-setting-select {
            width: 100%;
            padding: 11px 12px;
            border: 1px solid #dfe6f1;
            border-radius: 14px;
            background: #fff;
            color: #22324a;
            font-weight: 700;
            outline: none;
        }
        .yan-setting-select option {
            color: #22324a;
        }
        #yan-log {
            height: 160px;
            background: #20242a;
            color: #89ff9c;
            overflow-y: auto;
            padding: 12px;
            font-size: 12px;
            font-family: monospace;
            border-radius: 0 0 18px 18px;
        }
        .yan-log-frame {
            border: 1px solid #edf1f7;
            border-radius: 18px;
            overflow: hidden;
            background: #20242a;
        }
        @keyframes yan-morph {
            0%, 100% {
                border-radius: 46% 54% 52% 48% / 44% 42% 58% 56%;
                transform: translate3d(0, 0, 0) rotate(-2deg);
            }
            25% {
                border-radius: 52% 48% 41% 59% / 50% 58% 42% 50%;
                transform: translate3d(0, -4px, 0) rotate(1deg);
            }
            50% {
                border-radius: 42% 58% 56% 44% / 58% 46% 54% 42%;
                transform: translate3d(0, 2px, 0) rotate(2deg);
            }
            75% {
                border-radius: 58% 42% 48% 52% / 42% 56% 44% 58%;
                transform: translate3d(0, -2px, 0) rotate(-1deg);
            }
        }
        @keyframes yan-swim {
            0%, 100% { transform: translate3d(-6px, -2px, 0) scale(1); }
            33% { transform: translate3d(5px, 3px, 0) scale(1.03); }
            66% { transform: translate3d(-2px, 5px, 0) scale(1.01); }
        }
        @keyframes yan-sheen {
            0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.95; }
            50% { transform: translate3d(2px, 4px, 0) scale(0.98); opacity: 0.8; }
        }
        @keyframes yan-breathe {
            0%, 100% { filter: saturate(1) brightness(1); }
            50% { filter: saturate(1.08) brightness(1.03); }
        }
        @keyframes yan-settle {
            0% { transform: scale(1.12); }
            70% { transform: scale(0.98); }
            100% { transform: scale(1); }
        }
        @keyframes yan-release {
            0% { transform: scale(1.05); }
            40% { transform: scale(0.96); }
            100% { transform: scale(1); }
        }
        @keyframes yan-drift {
            0%, 100% { filter: hue-rotate(0deg) saturate(1); }
            50% { filter: hue-rotate(10deg) saturate(1.08); }
        }
        @keyframes yan-page-in {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
            #yan-ball,
            #yan-ball::before,
            #yan-ball::after,
            #yan-panel {
                animation: none !important;
                transition-duration: 0.01ms !important;
            }
        }
    `);

    const log = (msg, color="#00ff00") => {
        const box = document.getElementById('yan-log');
        if (box) {
            const div = document.createElement('div');
            div.style.color = color;
            div.innerText = `> ${msg}`;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        }
    };

    const STORAGE_KEYS = {
        ballPosition: 'chaoxing-ai-assistant.ball-position.v2',
        settings: 'chaoxing-ai-assistant.ui-settings.v2'
    };
    const DEFAULT_MARGIN = 20;
    const DEFAULT_SETTINGS = {
        ballSize: 64,
        floatDuration: 4.8,
        panelWidth: 360,
        panelOpacity: 97,
        rememberPosition: true,
        reducedMotion: false,
        autoOpenPage: 'basic'
    };
    const WIZARD_SEEN_KEY = 'chaoxing-ai-assistant.wizard-seen.v1';

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const safeParse = (text) => {
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    };

    const loadSettings = () => {
        const raw = safeParse(localStorage.getItem(STORAGE_KEYS.settings) || '');
        const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };
        merged.ballSize = clamp(Number(merged.ballSize) || DEFAULT_SETTINGS.ballSize, 52, 92);
        merged.floatDuration = clamp(Number(merged.floatDuration) || DEFAULT_SETTINGS.floatDuration, 2.8, 8);
        merged.panelWidth = clamp(Number(merged.panelWidth) || DEFAULT_SETTINGS.panelWidth, 300, 480);
        merged.panelOpacity = clamp(Number(merged.panelOpacity) || DEFAULT_SETTINGS.panelOpacity, 85, 100);
        merged.rememberPosition = Boolean(merged.rememberPosition);
        merged.reducedMotion = Boolean(merged.reducedMotion);
        merged.autoOpenPage = ['basic', 'output', 'settings'].includes(merged.autoOpenPage) ? merged.autoOpenPage : DEFAULT_SETTINGS.autoOpenPage;
        return merged;
    };

    const saveSettings = (settings) => {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    };

    let uiSettings = loadSettings();

    const getBallSize = () => uiSettings.ballSize;

    const getDefaultBallPosition = () => ({
        left: DEFAULT_MARGIN,
        top: Math.max(DEFAULT_MARGIN, window.innerHeight - getBallSize() - 80)
    });

    const loadBallPosition = () => {
        if (!uiSettings.rememberPosition) return null;
        const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.ballPosition) || '');
        if (parsed && Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) {
            return parsed;
        }
        return null;
    };

    const saveBallPosition = (ball) => {
        if (!uiSettings.rememberPosition) {
            localStorage.removeItem(STORAGE_KEYS.ballPosition);
            return;
        }
        const rect = ball.getBoundingClientRect();
        localStorage.setItem(STORAGE_KEYS.ballPosition, JSON.stringify({
            left: Math.round(rect.left),
            top: Math.round(rect.top)
        }));
    };

    const applyBallStyle = (ball) => {
        const size = getBallSize();
        ball.style.width = `${size}px`;
        ball.style.height = `${size}px`;
        ball.style.fontSize = `${clamp(Math.round(size * 0.2), 11, 16)}px`;
        ball.style.setProperty('--yan-float-duration', `${uiSettings.floatDuration}s`);
        ball.style.animation = uiSettings.reducedMotion
            ? 'none'
            : `yan-morph ${uiSettings.floatDuration}s ease-in-out infinite, yan-breathe 3.1s ease-in-out infinite`;
    };

    const applyPanelStyle = (panel) => {
        document.documentElement.style.setProperty('--yan-panel-width', `${uiSettings.panelWidth}px`);
        document.documentElement.style.setProperty('--yan-panel-opacity', `${uiSettings.panelOpacity / 100}`);
        panel.style.width = `${uiSettings.panelWidth}px`;
    };

    const applySettingsToUI = (ball, panel, controls = {}) => {
        applyBallStyle(ball);
        applyPanelStyle(panel);
        if (controls.ballSize) controls.ballSize.value = String(uiSettings.ballSize);
        if (controls.floatDuration) controls.floatDuration.value = String(uiSettings.floatDuration);
        if (controls.panelWidth) controls.panelWidth.value = String(uiSettings.panelWidth);
        if (controls.panelOpacity) controls.panelOpacity.value = String(uiSettings.panelOpacity);
        if (controls.rememberPosition) controls.rememberPosition.checked = uiSettings.rememberPosition;
        if (controls.reducedMotion) controls.reducedMotion.checked = uiSettings.reducedMotion;
        if (controls.autoOpenPage) controls.autoOpenPage.value = uiSettings.autoOpenPage;
    };

    const hasSeenWizard = () => localStorage.getItem(WIZARD_SEEN_KEY) === '1';
    const markWizardSeen = () => localStorage.setItem(WIZARD_SEEN_KEY, '1');

    const applyBallPosition = (ball, left, top) => {
        const size = getBallSize();
        const maxLeft = Math.max(DEFAULT_MARGIN, window.innerWidth - size - DEFAULT_MARGIN);
        const maxTop = Math.max(DEFAULT_MARGIN, window.innerHeight - size - DEFAULT_MARGIN);
        ball.style.left = `${clamp(left, DEFAULT_MARGIN, maxLeft)}px`;
        ball.style.top = `${clamp(top, DEFAULT_MARGIN, maxTop)}px`;
        ball.style.right = 'auto';
        ball.style.bottom = 'auto';
    };

    const positionPanel = (ball, panel) => {
        const ballRect = ball.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const gap = 14;
        let left = ballRect.left;
        let top = ballRect.top - panelRect.height - gap;
        const below = top < DEFAULT_MARGIN;

        if (below) {
            top = ballRect.bottom + gap;
        }

        left = clamp(left, DEFAULT_MARGIN, Math.max(DEFAULT_MARGIN, window.innerWidth - panelRect.width - DEFAULT_MARGIN));
        top = clamp(top, DEFAULT_MARGIN, Math.max(DEFAULT_MARGIN, window.innerHeight - panelRect.height - DEFAULT_MARGIN));

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.bottom = 'auto';
        panel.style.transformOrigin = below ? 'left top' : 'left bottom';
    };

    const createRangeField = (id, label, min, max, step, unit, valueText) => `
        <div class="yan-field">
            <div class="yan-field-head">
                <span class="yan-field-label">${label}</span>
                <span class="yan-field-value"><span id="${id}-value">${valueText}</span>${unit}</span>
            </div>
            <input id="${id}" class="yan-range" type="range" min="${min}" max="${max}" step="${step}">
        </div>
    `;

    const createSelectField = (id, label, options) => `
        <div class="yan-field">
            <div class="yan-field-head">
                <span class="yan-field-label">${label}</span>
                <span class="yan-field-value">切换面板默认页</span>
            </div>
            <select id="${id}" class="yan-setting-select">
                ${options.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join('')}
            </select>
        </div>
    `;

    const renderSettings = (ball, panel, controls) => {
        controls.ballSize = document.getElementById('yan-setting-ball-size');
        controls.floatDuration = document.getElementById('yan-setting-float-duration');
        controls.panelWidth = document.getElementById('yan-setting-panel-width');
        controls.panelOpacity = document.getElementById('yan-setting-panel-opacity');
        controls.rememberPosition = document.getElementById('yan-setting-remember');
        controls.reducedMotion = document.getElementById('yan-setting-motion');
        controls.autoOpenPage = document.getElementById('yan-setting-default-page');
        applySettingsToUI(ball, panel, controls);

        const updateRangeLabel = (id, value) => {
            const node = document.getElementById(`${id}-value`);
            if (node) node.textContent = value;
        };

        const commitSettings = () => {
            saveSettings(uiSettings);
            applySettingsToUI(ball, panel, controls);
            if (panel.style.display === 'block') {
                positionPanel(ball, panel);
            }
        };

        controls.ballSize.addEventListener('input', () => {
            uiSettings.ballSize = clamp(Number(controls.ballSize.value) || DEFAULT_SETTINGS.ballSize, 52, 92);
            updateRangeLabel('yan-setting-ball-size', uiSettings.ballSize);
            const rect = ball.getBoundingClientRect();
            applySettingsToUI(ball, panel, controls);
            applyBallPosition(ball, rect.left, rect.top);
            saveBallPosition(ball);
            if (panel.style.display === 'block') positionPanel(ball, panel);
            saveSettings(uiSettings);
        });

        controls.floatDuration.addEventListener('input', () => {
            uiSettings.floatDuration = clamp(Number(controls.floatDuration.value) || DEFAULT_SETTINGS.floatDuration, 2.8, 8);
            updateRangeLabel('yan-setting-float-duration', uiSettings.floatDuration.toFixed(1));
            commitSettings();
        });

        controls.panelWidth.addEventListener('input', () => {
            uiSettings.panelWidth = clamp(Number(controls.panelWidth.value) || DEFAULT_SETTINGS.panelWidth, 300, 480);
            updateRangeLabel('yan-setting-panel-width', uiSettings.panelWidth);
            commitSettings();
        });

        controls.panelOpacity.addEventListener('input', () => {
            uiSettings.panelOpacity = clamp(Number(controls.panelOpacity.value) || DEFAULT_SETTINGS.panelOpacity, 85, 100);
            updateRangeLabel('yan-setting-panel-opacity', uiSettings.panelOpacity);
            commitSettings();
        });

        controls.rememberPosition.addEventListener('change', () => {
            uiSettings.rememberPosition = controls.rememberPosition.checked;
            if (!uiSettings.rememberPosition) {
                localStorage.removeItem(STORAGE_KEYS.ballPosition);
            } else {
                saveBallPosition(ball);
            }
            commitSettings();
        });

        controls.reducedMotion.addEventListener('change', () => {
            uiSettings.reducedMotion = controls.reducedMotion.checked;
            commitSettings();
        });

        controls.autoOpenPage.addEventListener('change', () => {
            uiSettings.autoOpenPage = controls.autoOpenPage.value;
            commitSettings();
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            uiSettings = { ...DEFAULT_SETTINGS };
            saveSettings(uiSettings);
            localStorage.removeItem(STORAGE_KEYS.ballPosition);
            const defaultPosition = getDefaultBallPosition();
            applySettingsToUI(ball, panel, controls);
            applyBallPosition(ball, defaultPosition.left, defaultPosition.top);
            if (panel.style.display === 'block') positionPanel(ball, panel);
            updateRangeLabel('yan-setting-ball-size', uiSettings.ballSize);
            updateRangeLabel('yan-setting-float-duration', uiSettings.floatDuration.toFixed(1));
            updateRangeLabel('yan-setting-panel-width', uiSettings.panelWidth);
            updateRangeLabel('yan-setting-panel-opacity', uiSettings.panelOpacity);
            controls.rememberPosition.checked = uiSettings.rememberPosition;
            controls.reducedMotion.checked = uiSettings.reducedMotion;
            controls.autoOpenPage.value = uiSettings.autoOpenPage;
            log('↺ 已恢复默认参数');
        });

        updateRangeLabel('yan-setting-ball-size', uiSettings.ballSize);
        updateRangeLabel('yan-setting-float-duration', uiSettings.floatDuration.toFixed(1));
        updateRangeLabel('yan-setting-panel-width', uiSettings.panelWidth);
        updateRangeLabel('yan-setting-panel-opacity', uiSettings.panelOpacity);
    };

    function init() {
        if (document.getElementById('yan-ball')) return;
        const ball = document.createElement('div');
        ball.id = 'yan-ball';
        ball.innerHTML = '<span>AI 助手</span>';
        document.body.appendChild(ball);

        const wizardMask = document.createElement('div');
        wizardMask.id = 'yan-wizard-mask';
        wizardMask.innerHTML = `
            <div id="yan-wizard-panel">
                <div class="yan-wizard-shell">
                    <div class="yan-wizard-head">
                        <div class="yan-wizard-head-top">
                            <div>
                                <h2 class="yan-wizard-title">配置向导</h2>
                                <div class="yan-wizard-subtitle">这个向导是单独的面板。第一次会自动出现，关闭后也可以从主面板再次打开。</div>
                            </div>
                            <button id="yan-wizard-close" class="yan-close" type="button" aria-label="关闭向导">×</button>
                        </div>
                    </div>
                    <div class="yan-wizard-body">
                        <div class="yan-wizard-step">
                            <div class="yan-wizard-step-head"><span class="yan-wizard-step-number">1</span> 基本操作</div>
                            <p>导出题目、一键回填、恢复默认参数。先把最常用的动作放在这里，方便你直接开干。</p>
                        </div>
                        <div class="yan-wizard-step">
                            <div class="yan-wizard-step-head"><span class="yan-wizard-step-number">2</span> 输出</div>
                            <p>看导出内容、回填结果和解析日志。这里负责把过程和结果展示清楚。</p>
                        </div>
                        <div class="yan-wizard-step">
                            <div class="yan-wizard-step-head"><span class="yan-wizard-step-number">3</span> 设置</div>
                            <p>调浮球大小、动效、透明度和默认打开页。需要怎么用，直接在这里调。</p>
                        </div>
                        <div class="yan-wizard-actions">
                            <button id="yan-wizard-start" class="yan-wizard-btn primary" type="button">开始使用</button>
                            <button id="yan-wizard-never" class="yan-wizard-btn secondary" type="button">关闭并记住</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(wizardMask);

        const panel = document.createElement('div');
        panel.id = 'yan-panel';
        panel.innerHTML = `
            <div class="yan-panel-shell">
                <div class="yan-header">
                    <div class="yan-header-top">
                        <div class="yan-title-wrap">
                            <span class="yan-title">超星全能助手</span>
                            <span class="yan-subtitle">拖动球体可以换位置，面板里分成基本操作、输出和设置三块。</span>
                        </div>
                        <div style="display:flex;align-items:flex-start;gap:8px;">
                            <button id="yan-close" class="yan-close" type="button" aria-label="关闭面板">×</button>
                        </div>
                    </div>
                </div>
                <div class="yan-body">
                    <div class="yan-tabs">
                        <button class="yan-tab is-active" data-page="basic" type="button">基本操作</button>
                        <button class="yan-tab" data-page="output" type="button">输出</button>
                        <button class="yan-tab" data-page="settings" type="button">设置</button>
                    </div>

                    <div class="yan-page is-active" data-page-panel="basic">
                        <div class="yan-section">
                            <div class="yan-section-title">基本操作</div>
                            <div class="yan-section-desc">这里放最常用的操作，尽量少打扰你。</div>
                            <div class="yan-action-grid">
                                <button id="btn-export" class="yan-btn">📤 导出题目</button>
                                <button id="btn-import" class="yan-btn">📥 一键回填</button>
                                <button id="btn-reset" class="yan-btn">↺ 恢复默认参数</button>
                            </div>
                        </div>
                    </div>

                    <div class="yan-page" data-page-panel="output">
                        <div class="yan-section">
                            <div class="yan-section-title">输出</div>
                            <div class="yan-section-desc">导出内容、回填结果和解析日志都在这里看。</div>
                            <div class="yan-log-frame">
                                <div id="yan-log">就绪...</div>
                            </div>
                        </div>
                    </div>

                    <div class="yan-page" data-page-panel="settings">
                        <div class="yan-section">
                            <div class="yan-section-title">设置</div>
                            <div class="yan-section-desc">这些参数会立即生效并保存到本地。</div>
                            <div class="yan-settings">
                                <button id="btn-wizard" class="yan-btn" type="button">🧭 配置向导</button>
                                ${createRangeField('yan-setting-ball-size', '浮球大小', 52, 92, 1, ' px', uiSettings.ballSize)}
                                ${createRangeField('yan-setting-float-duration', '浮动速度', 2.8, 8, 0.1, ' s', uiSettings.floatDuration.toFixed(1))}
                                ${createRangeField('yan-setting-panel-width', '面板宽度', 300, 480, 10, ' px', uiSettings.panelWidth)}
                                ${createRangeField('yan-setting-panel-opacity', '面板透明度', 85, 100, 1, ' %', uiSettings.panelOpacity)}
                                ${createSelectField('yan-setting-default-page', '默认打开页', [
                                    { value: 'basic', label: '基本操作' },
                                    { value: 'output', label: '输出' },
                                    { value: 'settings', label: '设置' }
                                ])}
                                <label class="yan-switch">
                                    <div>
                                        <strong>记住浮球位置</strong>
                                        <small>关闭后，刷新页面会回到默认位置。</small>
                                    </div>
                                    <input id="yan-setting-remember" type="checkbox">
                                </label>
                                <label class="yan-switch">
                                    <div>
                                        <strong>减少动效</strong>
                                        <small>适合想要更安静的视觉反馈时开启。</small>
                                    </div>
                                    <input id="yan-setting-motion" type="checkbox">
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        const controls = {};
        applySettingsToUI(ball, panel, controls);
        renderSettings(ball, panel, controls);

        const pageMap = Array.from(panel.querySelectorAll('.yan-page'));
        const tabButtons = Array.from(panel.querySelectorAll('.yan-tab'));
        const wizardPanel = document.getElementById('yan-wizard-panel');
        const wizardClose = document.getElementById('yan-wizard-close');
        const wizardStart = document.getElementById('yan-wizard-start');
        const wizardNever = document.getElementById('yan-wizard-never');
        const wizardOpeners = [document.getElementById('btn-wizard')].filter(Boolean);

        const setPage = (page) => {
            tabButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.page === page));
            pageMap.forEach((node) => node.classList.toggle('is-active', node.dataset.pagePanel === page));
            if (panel.classList.contains('is-open')) {
                positionPanel(ball, panel);
            }
        };

        const openPanelTo = (page) => {
            setPage(page);
            panel.style.display = 'block';
            panel.getBoundingClientRect();
            positionPanel(ball, panel);
            requestAnimationFrame(() => panel.classList.add('is-open'));
        };

        const showWizard = () => {
            wizardMask.classList.add('is-open');
            wizardPanel.classList.add('is-open');
            markWizardSeen();
        };

        const hideWizard = () => {
            wizardPanel.classList.remove('is-open');
            wizardMask.classList.remove('is-open');
        };

        tabButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                setPage(btn.dataset.page);
                uiSettings.autoOpenPage = btn.dataset.page;
                saveSettings(uiSettings);
            });
        });

        wizardOpeners.forEach((button) => {
            button.addEventListener('click', showWizard);
        });
        wizardMask.addEventListener('click', (event) => {
            if (event.target === wizardMask) hideWizard();
        });
        wizardClose.addEventListener('click', hideWizard);
        wizardStart.addEventListener('click', hideWizard);
        wizardNever.addEventListener('click', hideWizard);

        const drag = {
            active: false,
            moved: false,
            startX: 0,
            startY: 0,
            originLeft: 0,
            originTop: 0
        };
        let panelHideTimer = null;

        const showPanel = () => {
            if (panelHideTimer) {
                clearTimeout(panelHideTimer);
                panelHideTimer = null;
            }
            openPanelTo(uiSettings.autoOpenPage);
        };

        const hidePanel = () => {
            panel.classList.remove('is-open');
            panelHideTimer = setTimeout(() => {
                if (!panel.classList.contains('is-open')) {
                    panel.style.display = 'none';
                }
            }, 260);
        };

        const togglePanel = () => {
            if (panel.classList.contains('is-open')) {
                hidePanel();
            } else {
                showPanel();
            }
        };

        document.getElementById('yan-close').addEventListener('click', hidePanel);

        const storedPosition = loadBallPosition() || getDefaultBallPosition();
        applyBallStyle(ball);
        applyBallPosition(ball, storedPosition.left, storedPosition.top);

        ball.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            drag.active = true;
            drag.moved = false;
            drag.startX = event.clientX;
            drag.startY = event.clientY;
            const rect = ball.getBoundingClientRect();
            drag.originLeft = rect.left;
            drag.originTop = rect.top;
            ball.classList.remove('was-dragged');
            ball.setPointerCapture(event.pointerId);
        });

        ball.addEventListener('pointermove', (event) => {
            if (!drag.active) return;
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;
            if (!drag.moved && Math.hypot(dx, dy) > 6) {
                drag.moved = true;
                ball.classList.add('dragging');
            }
            if (!drag.moved) return;

            applyBallPosition(ball, drag.originLeft + dx, drag.originTop + dy);
            if (panel.classList.contains('is-open')) {
                positionPanel(ball, panel);
            }
        });

        ball.addEventListener('pointerup', (event) => {
            if (!drag.active) return;
            drag.active = false;
            try {
                ball.releasePointerCapture(event.pointerId);
            } catch (e) {}

            if (drag.moved) {
                saveBallPosition(ball);
                ball.classList.remove('dragging');
                ball.classList.add('was-dragged');
                ball.classList.add('releasing');
                if (panel.classList.contains('is-open')) {
                    positionPanel(ball, panel);
                }
                setTimeout(() => ball.classList.remove('was-dragged', 'releasing'), 260);
                return;
            }

            togglePanel();
        });

        ball.addEventListener('pointercancel', () => {
            drag.active = false;
            ball.classList.remove('dragging');
        });

        window.addEventListener('resize', () => {
            const rect = ball.getBoundingClientRect();
            applyBallPosition(ball, rect.left, rect.top);
            saveBallPosition(ball);
            if (panel.classList.contains('is-open')) {
                positionPanel(ball, panel);
            }
        });

        if (!uiSettings.rememberPosition) {
            localStorage.removeItem(STORAGE_KEYS.ballPosition);
        }

        if (!hasSeenWizard()) {
            setTimeout(showWizard, 300);
        }

        // 导出逻辑：增加解析要求
        document.getElementById('btn-export').onclick = () => {
            const items = document.querySelectorAll('.questionLi');
            const prompt = `分析以下题目并严格返回JSON数组。必须包含"analysis"字段给出简短理由。格式：[{"questionId":"ID","answer":"内容","analysis":"解析"}]题目：\n` +
                Array.from(items).map((q, i) => {
                    const id = q.getAttribute('data') || q.id.replace('question', '');
                    const title = q.querySelector('h3')?.innerText.replace(/\s+/g, ' ').trim() || "";
                    const opts = Array.from(q.querySelectorAll('.answerBg')).map(o => o.innerText.trim()).join('|');
                    return `[${i+1}] ID:${id} 题目:${title} 选项:${opts}`;
                }).join('\n\n');
            GM_setClipboard(prompt);
            log(`✅ 已导出 ${items.length} 题 (已要求AI生成解析)`);
        };

        // 增强版回填逻辑：支持解析日志展示
        document.getElementById('btn-import').onclick = async () => {
            try {
                let text = await navigator.clipboard.readText();
                const json = JSON.parse(text.substring(text.indexOf('['), text.lastIndexOf(']') + 1));

                for (const item of json) {
                    const qDom = document.querySelector(`.questionLi[data="${item.questionId}"], #question${item.questionId}, [data-qid="${item.questionId}"]`);
                    if (!qDom) continue;

                    // 💡 在日志框显示解析内容
                    if (item.analysis) {
                        log(`💡 题${item.questionId}解析: ${item.analysis}`, "#eccc68");
                    }

                    const type = qDom.getAttribute('typename') || "";
                    if (type.includes("填空")) {
                        const answers = item.answer.split(/[;；\n]/);
                        answers.forEach((val, idx) => {
                            const eid = `answerEditor${item.questionId}${idx + 1}`;
                            const s = document.createElement('script');
                            s.textContent = `(function(){ if(window.UE && UE.getEditor("${eid}")){ UE.getEditor("${eid}").ready(function(){ this.setContent("${val.trim()}"); }); } })();`;
                            document.body.appendChild(s); s.remove();
                        });
                    } else {
                        const ansStr = String(item.answer).toUpperCase();
                        const opts = qDom.querySelectorAll('.answerBg, .answer_item, .options li');

                        for (let i = 0; i < opts.length; i++) {
                            const opt = opts[i];
                            const label = opt.querySelector('.num_option, .num_option_dx, b')?.innerText.trim().replace('.', '') ||
                                          opt.getAttribute('data') || "";

                            if (label && ansStr.includes(label)) {
                                const s = document.createElement('script');
                                s.textContent = `(function(){
                                    var qid = "${item.questionId}";
                                    var idx = ${i};
                                    var container = document.querySelector('.questionLi[data="' + qid + '"], #question' + qid);
                                    var el = container ? container.querySelectorAll('.answerBg, .answer_item, .options li')[idx] : null;
                                    if(el) {
                                        if(typeof addMultipleChoice === 'function' && "${type}".includes("多选")) {
                                            addMultipleChoice(el);
                                        } else if(typeof addChoice === 'function') {
                                            addChoice(el);
                                        } else {
                                            el.click();
                                        }
                                    }
                                })();`;
                                document.body.appendChild(s); s.remove();
                                await new Promise(r => setTimeout(r, 400));
                            }
                        }
                    }
                }
                log(`🎯 全部回填及解析展示完成`);
            } catch (e) { log("❌ 剪贴板内容读取失败，请检查AI返回格式", "red"); }
        };
    }

    hookUEditor();
    setInterval(init, 3000);
    init();
})();
