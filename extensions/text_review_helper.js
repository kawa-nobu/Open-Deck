// 文章校正機能で使用する、カスタムな文字置換イベントを作成する
(() => {
    const isAllowed = (u) => {
        const url = new URL(u, location.href);
        return url.origin === location.origin && url.pathname.startsWith("/compose/post");
    };
    //GIF ボタンを消す
    document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_post_css>main button[data-testid="gifSearchButton"]{display:none;}div[data-testid="twc-cc-mask"]{display:none;}</style>`);
    new MutationObserver(function(){
        const back_button = document.querySelector('main button[data-testid="app-bar-back"]');
        if(!back_button) return;
        if(location.pathname === "/compose/post"){
            back_button.style.display = "none";
        }else{
            back_button.style.display = "block";
        }
    }).observe(document, {childList: true, subtree: true});
    
    (function() {
        //投稿後の遷移メッセージを無効化する
        const native_add_evt = EventTarget.prototype.addEventListener;
        native_add_evt.call(window, 'beforeunload', function (e){
            // 既存イベントをストップさせる
            e.stopImmediatePropagation();
        }, {capture: true});
        
        //以後追加されるイベントを阻止する
        EventTarget.prototype.addEventListener = function (type, listener, options){
            if(String(type).toLowerCase() === 'beforeunload'){
                return;
            }
            return native_add_evt.call(this, type, listener, options);
        };
        
        //投稿後は home に戻ってほしくないので遷移を阻止する
        const originalPushState = history.pushState;
        history.pushState = function(state, title, url) {
            const dest = url ? new URL(url, location.href).href : location.href;
            if (!isAllowed(dest)){
                //home への遷移を阻止
                location.replace(location.href);
                return;
            }
            return originalPushState.apply(this, arguments);
        };
    })();

    //校正周りの処理
    let target_editor_elem = null;
    let opd_paste_token = null;
    document.addEventListener("focusin", (ev) => {
        if(ev.target && ev.target.isContentEditable){
            target_editor_elem = ev.target;
        }
    });
    const handler = async(e) => {
        //Firefox では detail にオブジェクトを乗せられない様なので、JSON化している
        const detail = JSON.parse(e.detail);
        //貼り付け時のトークンをチェックする
        if(opd_paste_token && opd_paste_token !== detail.token) return;

        //X側のテキストエディタの内部関数を利用してテキストを正しく入力させる
        if(target_editor_elem && target_editor_elem.isContentEditable){
            //文字を全て選択する
            text_all_select(target_editor_elem);
            //選択が終わるまで待機
            await new Promise(resolve => setTimeout(resolve, 30));

            //Firefox では　DataTransfer や ClipboardEvent 使えないので動作を分ける
            if (!detail.is_firefox) {
                //ReactPropsを入手する
                const propsKey = Object.getOwnPropertyNames(target_editor_elem).find(k => k.includes('__reactProps$'));
                const props = propsKey ? target_editor_elem[propsKey] : null;
                const editor = props?.children?.props?.editor ??props?.children?.[0]?.props?.editor ?? null;
                
                //校正結果のテキストの DataTransfer を作成
                const dt = new DataTransfer();
                dt.setData('text/plain', detail.text);

                //クリップボードのペーストのイベントを作成する
                const evt = new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dt
                });
                //内部関数を使って校正文章を擬似的にペーストさせる
                editor?._onPaste(evt, editor);
            }else{
                //execCommand は非推奨だが、Firefox では仕方なく使う様にする
                //文字を置換する
                document.execCommand('insertText', false, detail.text);
            }
        }
    };

    async function text_all_select(target){
        //テキスト全選択させる関数
        if(!target && !target.isContentEditable) return false;

        const win = target.ownerDocument.defaultView;
        const doc = target.ownerDocument;

        target.focus();
        const sel = win.getSelection();
        sel.removeAllRanges();

        const range = doc.createRange();
        range.selectNodeContents(target);
        sel.addRange(range);

        return true;
    }

    //テキスト貼り付けの認証トークン受付イベントを作成する
    window.addEventListener('opd_text_review_init', (e)=>{
        const detail = JSON.parse(e.detail);
        opd_paste_token = detail.token;
    }, true);

    //テキストを貼り付けさせるイベントを作成する
    window.addEventListener('opd_text_review_apply', handler, true);
})();