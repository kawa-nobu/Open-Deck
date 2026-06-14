// 文章校正機能で使用する、カスタムな文字置換イベントを作成する
(() => {
    //GIF ボタンを消す
    document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_post_css>main button[data-testid="gifSearchButton"]{display:none;}div[data-testid="twc-cc-mask"]{display:none;}</style>`);
    new MutationObserver(function(){
        const back_button = document.querySelector('main button[data-testid="app-bar-back"]');
        if(!back_button) return;
        if(location.pathname === "/intent/tweet"){
            back_button.style.display = "none";
        }else{
            back_button.style.display = "block";
        }
    }).observe(document, {childList: true, subtree: true});

    //homeへの遷移を内部で変更させる処理
    const push = getProps(document.querySelector('#react-root > div'))?.children.props.children.props.history.push;
    if (!push) return console.error('push is not found');

    let instance = null;

    function intercept() {
        //ハッシュタグ埋め込み機能の状態を制御する
        const hashtag_restore_btn = document.getElementById("opd_hashtag_restore");
        if (hashtag_restore_btn && hashtag_restore_btn.dataset.opd_hashtag_init !== "1"){
            hashtag_restore_btn.dataset.opd_hashtag_init = "1";

            //ハッシュタグを取得する
            const ls_hashtags = localStorage.getItem("opd_post_hashtags");
            const hashtags = ls_hashtags ? JSON.parse(ls_hashtags) : [];

            //ハッシュタグがあれば有効化、無ければ無効化
            if(hashtags.length){
                hashtag_restore_btn.removeAttribute("disabled");
            }else{
                hashtag_restore_btn.setAttribute("disabled", "");
            }
        }

        //投稿後の画面遷移問題を解消する
        const target_element = document.querySelector('button[data-testid="unsentButton"]')?.closest("div");
        if (!target_element) return;

        let fiber = getFiber(target_element);

        if (!fiber) return;

        while (fiber) {
            if (fiber.stateNode?._handleCloseComposer) {
                // インスタンスが変わってなければスキップ
                if (fiber.stateNode === instance) return;

                //変わっていれば再び注入する
                instance = fiber.stateNode;

                //クローズ処理を再びツイート画面へ遷移するように上書きする
                instance._handleCloseComposer = () => {
                    saveHashtags();
                    push("/compose/post");
                };
                return;
            }
            //returnで走査する
            fiber = fiber.return;
        }
    }

    //常に状態を監視する
    const observer = new MutationObserver(intercept);
    observer.observe(document.querySelector('#react-root'), { childList: true, subtree: true });

    //初期実行
    intercept();

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

    //組み込みエディタからテキストを取得する
    function getEditorText(editor){
        //エディタの内部インスタンスを取得する
        const instance = getDraftEditorInstance(editor);

        //エディタの状態を取得して入力されているテキストを取得する
        const editor_state = instance._latestEditorState;
        const content = editor_state.getCurrentContent();
        return content.getPlainText("\n");
    }

    //組み込みエディタからハッシュタグを取得
    function getEditorHashtags(){
        const target_editors = document.querySelectorAll('div[contenteditable="true"][data-testid*="tweetTextarea"]');

        //複数ツイートも考慮してすべてのエディタからハッシュタグを取得して返す
        const tags = [];
        target_editors.forEach((editor)=>{
            //エディタのテキストを取得する
            const text = getEditorText(editor);
            //入力されているハッシュタグを抽出して追加する
            const editor_tags = [...text.matchAll(/#([\p{L}\p{N}_]+)/gu)].map(m => m[1])
            tags.push(...editor_tags);
        });
        return tags;
    }

    //ハッシュタグをローカルストレージに保存させる
    //TODO:ハッシュタグをOpen-Deck側のストレージで保持するようにする
    function saveHashtags(){
        const hashtags = getEditorHashtags();
        localStorage.setItem("opd_post_hashtags", JSON.stringify(hashtags));
    }

    //保存されたハッシュタグをテキストエディタへ挿入する
    const restoreHashtags = async(e) => {
        const hashtag_restore_btn = document.getElementById("opd_hashtag_restore");
        //無効の場合は何もしない
        if(!hashtag_restore_btn || hashtag_restore_btn.hasAttribute("disabled")) return;

        const detail = JSON.parse(e.detail);

        const ls_hashtags = localStorage.getItem("opd_post_hashtags");
        if(!ls_hashtags) return;

        const hashtags = JSON.parse(ls_hashtags);

        const active_editor = document.querySelector('[data-testid="toolBar"]')?.closest('div:has(.public-DraftEditor-content)')?.querySelector('.public-DraftEditor-content[contenteditable="true"]');

        //現在のテキストを取得して保存されたハッシュタグを付与する
        const editor_text = getEditorText(active_editor)
        const hashtag_text = " " + hashtags.map(tag => "#" + tag).join(" ");

        //ハッシュタグをエディタへ挿入する
        setEditorText(active_editor, editor_text + hashtag_text, detail.is_firefox);
    }

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

    async function setEditorText(target_editor_elem, text, is_firefox){
    //X側のテキストエディタの内部関数を利用してテキストを正しく入力させる
    if(target_editor_elem && target_editor_elem.isContentEditable){
        //文字を全て選択する
        text_all_select(target_editor_elem);
        //選択が終わるまで待機
        await new Promise(resolve => setTimeout(resolve, 30));

        //Firefox では DataTransfer や ClipboardEvent 使えないので動作を分ける
        if (!is_firefox) {
            //ReactPropsを入手する
            const propsKey = Object.getOwnPropertyNames(target_editor_elem).find(k => k.includes('__reactProps$'));
            const props = propsKey ? target_editor_elem[propsKey] : null;
            const editor = props?.children?.props?.editor ?? props?.children?.[0]?.props?.editor ?? null;

            //テキストの DataTransfer を作成
            const dt = new DataTransfer();
            dt.setData('text/plain', text);

            //クリップボードのペーストのイベントを作成する
            const evt = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dt
            });
            //内部関数を使って擬似的にペーストさせる
            editor?._onPaste(evt, editor);
        }else{
            //execCommand は非推奨だが、Firefox では仕方なく使う
            document.execCommand('insertText', false, text);
        }
    }
}

    //テキスト貼り付けの認証トークン受付イベントを作成する
    window.addEventListener('opd_text_review_init', (e)=>{
        const detail = JSON.parse(e.detail);
        opd_paste_token = detail.token;
    }, true);

    //テキストを貼り付けさせるイベントを作成する
    window.addEventListener('opd_text_review_apply', handler, true);

    //ハッシュタグ埋め込み機能のイベントを作成する
    window.addEventListener('opd_text_hashtag_restore', restoreHashtags, true);

    //ReactProps取得
    function getProps(elem){
        const propsKey = Object.getOwnPropertyNames(elem).find(k => k.includes(`__reactProps$`));
        return propsKey ? elem[propsKey] : null;
    }

    //ReactFiber取得
    function getFiber(elem) {
        const fiberKey = Object.getOwnPropertyNames(elem).find(k => k.includes('__reactFiber$'));
        return fiberKey ? elem[fiberKey] : null;
    }

    //組み込みエディタ取得
    function getDraftEditorInstance(text_area){
        let target_element = text_area;
        while (target_element) {
            const props = getProps(target_element);
            const editor = props?.children?.props?.editor ?? props?.children?.[0]?.props?.editor;
            if (editor) {
                return editor;
            }
            target_element = target_element.parentElement;
        }
    }
})();