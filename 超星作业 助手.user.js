// ==UserScript==
// @name         超星作业助手
// @namespace    https://github.com/TextlineX/chaoxing-ai-assistant
// @version      23.0
// @description  支持超星学习通作业自动导出、AI解析及回填。适配 UEditor 填空题、多选题、判断题。已集成 UEditor 粘贴限制解锁功能。
// @author       Textline
// @match        *://*.chaoxing.com/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 1. 解锁 UEditor 粘贴限制逻辑
    const hookUEditor = () => {
        if (window.UE && window.UE.Editor) {
            const originalFire = window.UE.Editor.prototype.fireEvent;
            window.UE.Editor.prototype.fireEvent = function(type) {
                if (type === 'beforepaste') return; // 拦截粘贴检查
                return originalFire.apply(this, arguments);
            };
            log("🔓 粘贴限制已自动解除");
        } else {
            setTimeout(hookUEditor, 1000);
        }
    };

    // 样式美化
    GM_addStyle(`
        #yan-ball { position: fixed; bottom: 80px; left: 20px; width: 55px; height: 55px; background: #007aff; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; z-index: 9999999; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: bold; transition: transform 0.3s; }
        #yan-ball:hover { transform: scale(1.1); }
        #yan-panel { position: fixed; bottom: 145px; left: 20px; width: 300px; background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); border: 1px solid #f0f0f0; display: none; z-index: 9999998; overflow: hidden; font-family: sans-serif; }
        .yan-header { padding: 15px; background: #f9f9f9; border-bottom: 1px solid #eee; }
        .yan-title { font-weight: bold; font-size: 16px; color: #333; display: block; }
        .yan-guide { font-size: 11px; color: #999; margin-top: 4px; }
        .yan-btn { width: 100%; padding: 14px 20px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; color: #fff; text-align: left; }
        #btn-export { background: #34495e; }
        #btn-extract { background: #3498db; }
        #btn-import { background: #2ecc71; }
        #yan-log { height: 160px; background: #222; color: #00ff00; overflow-y: auto; padding: 12px; font-size: 12px; font-family: monospace; border-top: 1px solid #444; }
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

    function init() {
        if (document.getElementById('yan-ball')) return;

        const ball = document.createElement('div');
        ball.id = 'yan-ball'; ball.innerText = 'AI 助手'; document.body.appendChild(ball);

        const panel = document.createElement('div');
        panel.id = 'yan-panel';
        panel.innerHTML = `
            <div class="yan-header">
                <span class="yan-title">超星全能助手 V23.0</span>
                <div class="yan-guide">1.导出题目 → 2.发给AI获取JSON → 3.点击回填</div>
            </div>
            <button id="btn-export" class="yan-btn">📤 1. 导出题目</button>
            <button id="btn-extract" class="yan-btn">🔍 2. 提取已有答案</button>
            <button id="btn-import" class="yan-btn">📥 3. 识别并一键回填</button>
            <div id="yan-log">粘贴已解锁 | 等待操作...</div>
        `;
        document.body.appendChild(panel);

        ball.onclick = () => {
            panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        };

        // 导出
        document.getElementById('btn-export').onclick = () => {
            const items = document.querySelectorAll('.questionLi');
            if (items.length === 0) return log("❌ 未检测到题目", "red");
            const prompt = `分析题目并严格返回JSON数组。规则：多选连写(如ABC)；判断题A对B错；填空多空用分号";"隔开。包含"analysis"字段。格式：[{"questionId":"ID","answer":"内容","analysis":"解析"}]题目：\n` +
                Array.from(items).map((q, i) => {
                    const id = q.getAttribute('data');
                    const title = q.querySelector('h3')?.innerText.replace(/\s+/g, ' ').trim() || "";
                    const opts = Array.from(q.querySelectorAll('.answerBg')).map(o => o.innerText.trim()).join('|');
                    return `[${i+1}] ID:${id} 题目:${title} ${opts ? '选项:'+opts : ''}`;
                }).join('\n\n');
            GM_setClipboard(prompt);
            log(`✅ 已导出 ${items.length} 题`);
        };

        // 提取
        document.getElementById('btn-extract').onclick = () => {
            const items = document.querySelectorAll('.questionLi, .mark_item');
            const result = [];
            items.forEach(el => {
                let id = el.getAttribute('data') || el.id.replace('question', '');
                let ansEl = el.querySelector('.rightAnswerContent') || el.querySelector('.stuAnswerContent');
                if (ansEl && id) {
                    result.push({ questionId: id, answer: ansEl.innerText.trim().replace(/\s+/g, '').replace(/正确答案[:：]*/, '') });
                }
            });
            GM_setClipboard(JSON.stringify(result, null, 2));
            log(`✅ 提取完成，共 ${result.length} 题`);
        };

        // 回填
        document.getElementById('btn-import').onclick = async () => {
            try {
                let text = await navigator.clipboard.readText();
                const json = JSON.parse(text.substring(text.indexOf('['), text.lastIndexOf(']') + 1));
                for (const item of json) {
                    const qDom = document.querySelector(`.questionLi[data="${item.questionId}"], #question${item.questionId}`);
                    if (!qDom) continue;
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
                        const opts = qDom.querySelectorAll('.answerBg');
                        for (let i = 0; i < opts.length; i++) {
                            const label = opts[i].querySelector('.num_option, .num_option_dx')?.innerText.trim().replace('.', '') || "";
                            if (ansStr.includes(label)) {
                                const s = document.createElement('script');
                                s.textContent = `(function(){ var el = document.querySelectorAll('.questionLi[data="${item.questionId}"] .answerBg')[${i}]; if(el){ typeof addMultipleChoice==='function'?addMultipleChoice(el):typeof addChoice==='function'?addChoice(el):el.click(); } })();`;
                                document.body.appendChild(s); s.remove();
                                await new Promise(r => setTimeout(r, 450));
                            }
                        }
                    }
                }
                log(`🎯 回填完成！`);
            } catch (e) { log("❌ 剪贴板JSON格式错误", "red"); }
        };
    }

    hookUEditor();
    setInterval(init, 3000);
    init();
})();
