// ==UserScript==
// @name         超星作业 AI 助手
// @namespace    https://github.com/TextlineX/chaoxing-ai-assistant
// @version      24.3
// @description  支持全题型 AI 回填，集成 UEditor 粘贴解锁。支持题目解析提取与展示。
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
        #yan-ball {
            position: fixed;
            left: 20px;
            top: 20px;
            width: 64px;
            height: 64px;
            background:
                radial-gradient(circle at 32% 28%, rgba(255,255,255,0.96) 0 10%, rgba(255,255,255,0.35) 11%, rgba(255,255,255,0) 32%),
                radial-gradient(circle at 35% 28%, rgba(255,255,255,0.38) 0 18%, rgba(255,255,255,0) 30%),
                linear-gradient(145deg, #49b4ff 0%, #1d8dff 45%, #0c62ea 100%);
            border-radius: 46% 54% 52% 48% / 44% 42% 58% 56%;
            box-shadow:
                0 18px 30px rgba(8, 72, 170, 0.28),
                inset 0 1px 3px rgba(255,255,255,0.35),
                inset 0 -8px 16px rgba(0,0,0,0.14);
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
            transition: box-shadow 0.25s ease, transform 0.25s ease, filter 0.25s ease;
            animation: yan-float 4.8s ease-in-out infinite, yan-breathe 3.2s ease-in-out infinite;
            will-change: transform, left, top;
        }
        #yan-ball::before {
            content: "";
            position: absolute;
            inset: 8% 18% 52% 18%;
            border-radius: 50%;
            background: linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0));
            filter: blur(1px);
            opacity: 0.9;
            pointer-events: none;
        }
        #yan-ball::after {
            content: "";
            position: absolute;
            inset: 14px 10px 8px;
            border-radius: 50%;
            background: radial-gradient(circle at 50% 65%, rgba(255,255,255,0.24), rgba(255,255,255,0));
            filter: blur(2px);
            pointer-events: none;
        }
        #yan-ball:hover {
            filter: saturate(1.05) brightness(1.03);
            box-shadow:
                0 20px 34px rgba(8, 72, 170, 0.3),
                inset 0 1px 3px rgba(255,255,255,0.38),
                inset 0 -8px 16px rgba(0,0,0,0.12);
        }
        #yan-ball.dragging {
            cursor: grabbing;
            animation: none;
            transform: scale(1.15);
            box-shadow:
                0 22px 38px rgba(8, 72, 170, 0.34),
                inset 0 1px 3px rgba(255,255,255,0.38),
                inset 0 -8px 16px rgba(0,0,0,0.12);
        }
        #yan-ball.was-dragged {
            animation: yan-settle 0.22s ease-out;
        }
        #yan-panel {
            position: fixed;
            width: 300px;
            background: rgba(255,255,255,0.96);
            border-radius: 18px;
            box-shadow: 0 18px 50px rgba(0,0,0,0.18);
            border: 1px solid rgba(255,255,255,0.7);
            backdrop-filter: blur(10px);
            display: none;
            z-index: 9999998;
            overflow: hidden;
            font-family: sans-serif;
        }
        .yan-header { padding: 15px; background: linear-gradient(180deg, #fafcff 0%, #f2f7ff 100%); border-bottom: 1px solid #eef2fb; }
        .yan-title { font-weight: bold; font-size: 16px; color: #23364f; display: block; }
        .yan-btn { width: 100%; padding: 14px 20px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; color: #fff; text-align: left; }
        #btn-export { background: #34495e; }
        #btn-import { background: #2ecc71; }
        #yan-log { height: 160px; background: #222; color: #00ff00; overflow-y: auto; padding: 12px; font-size: 12px; font-family: monospace; }
        @keyframes yan-float {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes yan-breathe {
            0%, 100% { filter: saturate(1) brightness(1); }
            50% { filter: saturate(1.08) brightness(1.03); }
        }
        @keyframes yan-settle {
            0% { transform: scale(1.18); }
            70% { transform: scale(0.98); }
            100% { transform: scale(1); }
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

    const BALL_STATE_KEY = 'chaoxing-ai-assistant.ball-position.v1';
    const BALL_SIZE = 64;
    const DEFAULT_MARGIN = 20;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const getDefaultBallPosition = () => ({
        left: DEFAULT_MARGIN,
        top: Math.max(DEFAULT_MARGIN, window.innerHeight - BALL_SIZE - 80)
    });

    const loadBallPosition = () => {
        try {
            const raw = localStorage.getItem(BALL_STATE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) {
                return parsed;
            }
        } catch (e) {}
        return null;
    };

    const saveBallPosition = (ball) => {
        const rect = ball.getBoundingClientRect();
        localStorage.setItem(BALL_STATE_KEY, JSON.stringify({
            left: Math.round(rect.left),
            top: Math.round(rect.top)
        }));
    };

    const applyBallPosition = (ball, left, top) => {
        const maxLeft = Math.max(DEFAULT_MARGIN, window.innerWidth - BALL_SIZE - DEFAULT_MARGIN);
        const maxTop = Math.max(DEFAULT_MARGIN, window.innerHeight - BALL_SIZE - DEFAULT_MARGIN);
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

        if (top < DEFAULT_MARGIN) {
            top = ballRect.bottom + gap;
        }

        left = clamp(left, DEFAULT_MARGIN, Math.max(DEFAULT_MARGIN, window.innerWidth - panelRect.width - DEFAULT_MARGIN));
        top = clamp(top, DEFAULT_MARGIN, Math.max(DEFAULT_MARGIN, window.innerHeight - panelRect.height - DEFAULT_MARGIN));

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.bottom = 'auto';
    };

    function init() {
        if (document.getElementById('yan-ball')) return;
        const ball = document.createElement('div');
        ball.id = 'yan-ball';
        ball.innerText = 'AI 助手';
        document.body.appendChild(ball);

        const storedPosition = loadBallPosition() || getDefaultBallPosition();
        applyBallPosition(ball, storedPosition.left, storedPosition.top);

        const panel = document.createElement('div');
        panel.id = 'yan-panel';
        panel.innerHTML = `
            <div class="yan-header">
                <span class="yan-title">超星全能助手 V24.3</span>
            </div>
            <button id="btn-export" class="yan-btn">📤 1. 导出题目 (含解析要求)</button>
            <button id="btn-import" class="yan-btn">📥 2. 一键回填 (同步解析)</button>
            <div id="yan-log">就绪...</div>
        `;
        document.body.appendChild(panel);

        const drag = {
            active: false,
            moved: false,
            startX: 0,
            startY: 0,
            originLeft: 0,
            originTop: 0
        };

        const showPanel = () => {
            panel.style.display = 'block';
            positionPanel(ball, panel);
        };

        const hidePanel = () => {
            panel.style.display = 'none';
        };

        const togglePanel = () => {
            if (panel.style.display === 'block') {
                hidePanel();
            } else {
                showPanel();
            }
        };

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
            if (panel.style.display === 'block') {
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
                if (panel.style.display === 'block') {
                    positionPanel(ball, panel);
                }
                setTimeout(() => ball.classList.remove('was-dragged'), 240);
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
            if (panel.style.display === 'block') {
                positionPanel(ball, panel);
            }
        });

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
