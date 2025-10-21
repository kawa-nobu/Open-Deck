// 文章校正機能で使用
class OpdExtTextReview {
    constructor() {
        this.opd_text_review_url = "https://opd.kwdev-sys.com/api/opd/text_review/review";
        this.opd_text_review_token = null;
        this.Init = (column_window, icons) => {
            //初期化
            let editable_elem = null;
            let is_textarea_empty = false;
            let review_state = false;
            column_window.document.head.insertAdjacentHTML("beforeend", `<style opd_post_textreview_css>
                /* Premium 勧誘要素非表示 */
                div[aria-live="polite"][role="status"]:has(a[dir="ltr"]){
                    display: none;
                }
                .opd_post_functions{
                    margin-left: -8px;
                }
                .opd_text_review_loader {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #ddd;
                    border-top-color: #3498db;
                    border-radius: 50%;
                    animation: opd_text_review_loader_spin 1s linear infinite;
                    margin: 20px auto;
                }

                @keyframes opd_text_review_loader_spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
                .opd_text_review_btn{
                    width:34px;
                    height:34px;
                    margin:0 4px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer; 
                }
                .opd_text_review_btn_icon{
                    display: block;
                    mask: url(${chrome.runtime.getURL(icons.text_review)}) no-repeat center;
                    width: 18px;
                    height: 18px;
                }
                #opd_post_text_review[opd_text_review_is_empty]{
                opacity: 0.5;
                }
                .opd_text_review_panel{
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    border-radius: 5px;
                }
                .opd_text_review_panel, .opd_text_review_result{
                    width: 100%;
                }
                .opd_text_review_result_preview{
                    white-space: pre-wrap;
                    padding: 5px;
                    max-height: 10rem;
                    overflow: hidden auto;
                    scrollbar-width: thin;
                    background: #c9c9c940;
                }
                .opd_text_review_indication_switcher{
                    max-height: 8rem;
                    overflow: hidden auto;
                    scrollbar-width: thin;
                    padding:5px;
                }
                .opd_text_review_indication_switch{
                    display: flex;
                    flex-direction: row;
                    padding: 5px;
                    border-radius: 5px;
                    margin: 5px;
                    background: #00000012;
                    scrollbar-width: thin;
                }
                span[opd_text_review_indication_hidden]{
                    display: none;
                }
                .opd_text_review_indication_apply_panel{
                    display: flex;
                    flex-direction: row;
                    justify-content: space-evenly;
                }
                .opd_text_review_indication_apply_panel button{
                    border-radius: 100px;
                    width: 5rem;
                    display: flex;
                    justify-content: center;
                    border: #0000005e 1px solid;
                    margin: 2px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    
                }
                .opd_text_review_indication_apply_panel button:hover{
                    opacity: 0.8;
                }
            </style>`);
            //ヘルパースクリプト追加
            const helper_script = column_window.document.createElement('script');
            helper_script.src = chrome.runtime.getURL("extensions/text_review_helper.js");
            column_window.document.head.appendChild(helper_script);

            //貼り付け認証トークンを追加する
            this.opd_text_review_token = crypto.randomUUID();
            setTimeout(() => {
                column_window.document.dispatchEvent(new CustomEvent('opd_text_review_init', {
                    detail: { token:this.opd_text_review_token }
                }));
            }, 10);
            
            column_window.document.addEventListener("focusin", (ev) => {
                //テキストエリアフォーカスタイミングで文字有無のカウンタを仕込む
                if (ev.target && ev.target.isContentEditable) {
                    editable_elem = ev.target;
                    if(!editable_elem.getAttribute("opd_text_counter")){
                        //input イベントでは半角文字の削除が取得できないため、MutationObserver を使う
                        const editor_observer = new MutationObserver((mutations, obs) => {
                            is_textarea_empty = editable_elem.innerText.trim() === '';
                            if(is_textarea_empty){
                                column_window.document.getElementById("opd_post_text_review").setAttribute("opd_text_review_is_empty", "");
                            }else{
                                column_window.document.getElementById("opd_post_text_review").removeAttribute("opd_text_review_is_empty");
                            }
                        }).observe(editable_elem, {
                            childList: true,
                            subtree: true
                        });
                        editable_elem.setAttribute("opd_text_counter", "true");
                    }
                }else{
                    editable_elem = null;
                }
            });
            const observer = new MutationObserver((mutations, obs) => {
                //文章校正ボタンを仕込む
                //既存のボタン類のパネルに組み込むと、他のボタンが表示されなくなる現象があるので仕方なく文字数カウンタの下に配置している
                const btnAddTarget = column_window.document.querySelector('div[data-testid="toolBar"]');
                const function_panel = column_window.document.querySelector('div.opd_post_functions');
                if (btnAddTarget && !function_panel) {
                    //テーマカラー取得&ボタンカラー設定
                    const theme_color = this.CssChecker(getComputedStyle(column_window.document.querySelector('div[data-testid="progressBar-bar"]')).backgroundColor);
                    column_window.document.head.insertAdjacentHTML("beforeend", `<style opd_post_textreview_theme_css>.opd_text_review_btn_icon{background-color:${theme_color};}.opd_text_review_btn:not([opd_text_review_is_empty]):hover{border-radius: 100px;transition-duration: 0.2s;background-color:${theme_color.replace(")", ", 0.1)")};}.opd_text_review_panel{background-color:${theme_color.replace(")", ", 0.1)")};}</style>`);
                    //校正ボタンパネル追加
                    //TODO:今後、他機能追加する際は opd_post_functions 追加処理を別の場所で1回のみ行う実装をする
                    btnAddTarget.insertAdjacentHTML('afterend', '<div class="opd_post_functions"><div id="opd_post_text_review" class="opd_text_review_btn" title="文章校正ができます(校正ログを一切保存しません)" opd_text_review_is_empty><div class="opd_text_review_btn_icon"></div></div></div><div class="opd_text_review_panel"></div>');
                    //校正ボタン動作追加
                    column_window.document.getElementById("opd_post_text_review").addEventListener("click", async ()=>{
                        if(!review_state && editable_elem && !is_textarea_empty){
                            review_state = true;
                            const review_panel = column_window.document.querySelector('div.opd_text_review_panel');
                            review_panel.textContent = "";
                            review_panel.insertAdjacentHTML("beforeend", `<div>文章校正 (試作版)</div><div><div class="opd_text_review_loader"></div>校正中...</div>`);
                            await this.Review(editable_elem.innerText.trim(), review_panel, column_window);
                            review_state = false;
                        }
                    });
                }
            }).observe(column_window.document, {
                childList: true,
                subtree: true
            });
        }
        this.Review = async(text, panel_elem, column_window) => {
            //校正開始
            const review_request = await this.ReviewRquest(text);
            
            //校正に失敗したら終了
            if(!review_request){
                panel_elem.textContent = "";
                panel_elem.insertAdjacentHTML("beforeend", `<div>文章校正 (試作版)</div><div>校正に失敗しました</div>`);
                return;
            }
            //校正パネルを空にする
            panel_elem.textContent = "";

            //指摘箇所がなければ終了
            if(review_request.indications.length === 0){
                panel_elem.insertAdjacentHTML("beforeend", `<div>文章校正 (試作版)</div><div>指摘箇所はありません</div>`);
                return;
            }
            //校正結果がある場合
            let result = [];
            let indication_id = [];
            const indications_fix_enabled = [];
            let indication_fix_str = text;
            
            //indicationsの分だけ校正パネルへ指摘リストを表示
            review_request.indications.forEach((review) => {
                const id = this.CreateRandomID();
                let suggest_elem = "";
                if(review.params?.suggests != null){
                    suggest_elem = `<span style="background:#14ff0063;">${this.EscapeHTML(review.params?.suggests?.at(-1))}</span>`;
                }
                result.push(`<div class="opd_text_review_indication_switch"><input id="opd_text_review_iid_${id}" type="checkbox" opd_indication_id="${id}"><div><span style="font-size: 0.8em;">(${this.EscapeHTML(review.message)})</span><div><span style="text-decoration: line-through;background:#ff000054;">${this.EscapeHTML(review.relevant_part.problem)}</span>${suggest_elem}${this.EscapeHTML(review.relevant_part.after)}</div></div></div>`);
                indication_id.push(id);
                indications_fix_enabled.push(false);
            });
            //校正パネルへ全文指摘を表示
            const review_view = this.IndicationTexts(text, review_request.indications, indication_id);
            panel_elem.insertAdjacentHTML("beforeend", `<div>文章校正 (試作版)</div><div class="opd_text_review_result"><div class="opd_text_review_result_preview">${review_view}</div><div class="opd_text_review_indication_switcher">${result.join("")}</div><div class="opd_text_review_indication_apply_panel"><button id="opd_text_review_apply_selected">適用</button><button id="opd_text_review_apply_all">すべて適用</button></div></div>`);

            indication_id.forEach((id, i)=>{
                panel_elem.querySelector(`#opd_text_review_iid_${id}`).addEventListener("change", (ev)=>{
                    const indcation_target = panel_elem.querySelector(`#opd_text_review_problem_id_${id}`)
                    indcation_target.scrollIntoView({behavior: "smooth",inline: "end"});
                    if(ev.target.checked){
                        indcation_target.setAttribute("opd_text_review_indication_hidden", "");
                        indications_fix_enabled[i] = true;
                    }else{
                        indcation_target.removeAttribute("opd_text_review_indication_hidden");
                        indications_fix_enabled[i] = false;
                    }
                    indication_fix_str = this.GetReviewedText(text, review_request.indications, indications_fix_enabled);
                });
            });

            //指摘適用ボタンの動作を追加
            panel_elem.querySelector(`#opd_text_review_apply_selected`).addEventListener("click", (ev)=>{
                column_window.document.dispatchEvent(new CustomEvent('opd_text_review_apply', {
                    bubbles: true,
                    composed: true,
                    detail: { text: indication_fix_str, token:this.opd_text_review_token }
                }));
            });
            panel_elem.querySelector(`#opd_text_review_apply_all`).addEventListener("click", (ev)=>{
                indication_id.forEach((id)=>{
                    const target = panel_elem.querySelector(`#opd_text_review_iid_${id}`);
                    if(!target.checked){
                        panel_elem.querySelector(`#opd_text_review_iid_${id}`).click();
                    }
                });
                column_window.document.dispatchEvent(new CustomEvent('opd_text_review_apply', {
                    bubbles: true,
                    composed: true,
                    detail: { text: indication_fix_str, token:this.opd_text_review_token }
                }));
            });
        }
        this.IndicationTexts = (text, result, indication_ids) =>{
            //全文指摘表示機能用のHTML生成関数
            if (!result?.length) return this.EscapeHTML(text);

            //offsetの昇順で処理
            const sorted = [...result].sort((a, b) => a.offset - b.offset);

            let cur = 0;
            let html = "";

            for (const [i, ind] of sorted.entries()) {
                const { offset, length, params } = ind;
                const start = offset;
                const end = start + length;
                const suggest = params?.suggests?.at(-1) ?? "";

                //範囲チェック
                if (start < cur || start > text.length) continue;
                if (end > text.length) continue;

                html += this.EscapeHTML(text.slice(cur, start));

                let suggest_elem = "";
                if(suggest !== ""){
                    suggest_elem = `<span style="padding:3px;border-radius:3px;background:#14ff0063;">${this.EscapeHTML(suggest)}</span>`;
                }

                html += `<span class="patch" data-offset="${start}" data-length="${length}"><span id="opd_text_review_problem_id_${indication_ids[i]}" style="padding:3px;border-radius:3px;text-decoration: line-through;background:#ff000054;">${this.EscapeHTML(text.slice(start, end))}</span>${suggest_elem}</span>`;

                cur = end;
            }

            html += this.EscapeHTML(text.slice(cur));

            return html;
        }
        this.GetReviewedText = (text, result, indication_enabled) =>{
            //指摘適用済みのテキストを生成生成する関数
            if (!result?.length) return text;

            //offsetの昇順で処理
            const sorted = [...result].sort((a, b) => a.offset - b.offset);

            let cur = 0;
            let output = "";

            for (const [i, ind] of sorted.entries()) {
                const { offset, length, params } = ind;
                const start = offset;
                const end = start + length;
                const suggest = params?.suggests?.at(-1) ?? "";
                const problem = text.slice(start, end);

                //範囲チェック
                if (start < cur || start > text.length) continue;
                if (end > text.length) continue;

                //前の修正部分の後から今回の修正部分の前までを追加
                output += text.slice(cur, start);

                if (indication_enabled[i]) {
                    output += String(suggest);
                } else {
                    output += String(problem);
                }

                cur = end;
            }

            output += text.slice(cur);

            return output;
        }
        this.ReviewRquest = async(str)=>{
            //校正を開始し、結果を得る関数
            const api_url = this.opd_text_review_url;
            try{
                const res = await fetch(api_url, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({"text":str}),
                });

                if(!res.ok){
                    console.error(`ReviewFetchError->Code:${res.status}->Text:${res.statusText}`);
                    return false;
                }
                return await res.json();
            }catch(error){
                console.error("Fetch failed:", error);
                return false;
            }
        }
        this.CreateRandomID = () =>{
            //ランダムなIDを生成する関数
            return Math.random().toString(32).substring(2);
        }
        this.CssChecker = (str) =>{
            //CSSが正常かどうかチェックする関数
            return CSS.supports('color', str) ? str : 'black'
        }
        this.EscapeHTML = (str) =>{
            //文字列をエスケープ化する関数
            if (str == null) return '';
            return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        }
    }
}