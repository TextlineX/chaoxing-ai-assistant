// ==UserScript==
// @name         超星作业 AI 助手
// @namespace    https://github.com/TextlineX/chaoxing-ai-assistant
// @version      24.1
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
        #yan-ball { position: fixed; bottom: 80px; left: 20px; width: 55px; height: 55px; background: #007aff; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; z-index: 9999999; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: bold; transition: transform 0.3s; }
        #yan-ball:hover { transform: scale(1.1); }
        #yan-panel { position: fixed; bottom: 145px; left: 20px; width: 300px; background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); border: 1px solid #f0f0f0; display: none; z-index: 9999998; overflow: hidden; font-family: sans-serif; }
        .yan-header { padding: 15px; background: #f9f9f9; border-bottom: 1px solid #eee; }
        .yan-title { font-weight: bold; font-size: 16px; color: #333; display: block; }
        .yan-btn { width: 100%; padding: 14px 20px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; color: #fff; text-align: left; }
        #btn-export { background: #34495e; }
        #btn-import { background: #2ecc71; }
        #yan-log { height: 160px; background: #222; color: #00ff00; overflow-y: auto; padding: 12px; font-size: 12px; font-family: monospace; }
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
                <span class="yan-title">超星全能助手 V24.1</span>
            </div>
            <button id="btn-export" class="yan-btn">📤 1. 导出题目 (含解析要求)</button>
            <button id="btn-import" class="yan-btn">📥 2. 一键回填 (同步解析)</button>
            <div id="yan-log">就绪...</div>
        `;
        document.body.appendChild(panel);

        ball.onclick = () => panel.style.display = panel.style.display === 'block' ? 'none' : 'block';

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
