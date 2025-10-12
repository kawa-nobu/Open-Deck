// 文書校正機能で使用
class OpdExtTextReview {
    constructor() {
        this.Init = (column_window, icons) => {
            //初期化
            let editable_elem = null;
            let is_textarea_empty = false;
            column_window.document.head.insertAdjacentHTML("beforeend", `<style opd_post_textreview_css>
                .opd_post_functions{
                    margin-left: -8px;
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
                opacity: 0.5
                }
            </style>`);
            column_window.document.addEventListener("focusin", (ev) => {
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
                const btnAddTarget = column_window.document.querySelector('nav[role="navigation"][aria-live="polite"]');
                const function_panel = column_window.document.querySelector('div.opd_post_functions');
                if (btnAddTarget && !function_panel) {
                    //テーマカラー取得&ボタンカラー設定
                    const theme_color = this.CssChecker(getComputedStyle(column_window.document.querySelector('div[data-testid="progressBar-bar"]')).backgroundColor);
                    column_window.document.head.insertAdjacentHTML("beforeend", `<style opd_post_textreview_theme_css>.opd_text_review_btn_icon{background-color:${theme_color};}.opd_text_review_btn:not([opd_text_review_is_empty]):hover{border-radius: 100px;transition-duration: 0.2s;background-color:${theme_color.replace(")", ", 0.1)")};}</style>`);
                    //校正ボタンパネル追加
                    //TODO:今後、他機能追加する際は opd_post_functions 追加処理を別の場所で1回のみ行う実装をする
                    btnAddTarget.insertAdjacentHTML('afterend', '<div class="opd_post_functions"><div id="opd_post_text_review" class="opd_text_review_btn" opd_text_review_is_empty><div class="opd_text_review_btn_icon"></div></div></div>');
                    //校正ボタン動作追加
                    column_window.document.getElementById("opd_post_text_review").addEventListener("click", ()=>{
                        if(editable_elem && !is_textarea_empty){
                            this.Review(this.EscapeHTML(editable_elem.textContent))
                        }
                    });
                }
            }).observe(column_window.document, {
                childList: true,
                subtree: true
            });
        }
        this.Review = (text) => {
            //文章校正開始
            console.log(text)
        }
        this.CssChecker = (str) =>{
            return CSS.supports('color', str) ? str : 'black'
        }
        this.EscapeHTML = (str) =>{
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