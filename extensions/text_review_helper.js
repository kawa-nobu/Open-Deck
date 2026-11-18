// 文章校正機能で使用する、カスタムな文字置換イベントを作成する
(() => {
    const is_new_client = Object.keys(document.querySelector('html').dataset).some(key=>['appEnv', 'appVersion'].includes(key));
    let router = null;
    const textarea_hashtags = new Map();
    let in_compose = false;

    //GIF ボタンを消す
    document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_post_css>div[data-media-upload-dropzone] form button:has(svg[data-icon*="icon-gif"]), main button[data-testid="gifSearchButton"]{display:none;}div[data-testid="twc-cc-mask"]{display:none;}</style>`);
    new MutationObserver(function(){
        const back_button = document.querySelector('header button:has(svg[data-icon*="icon-close"]), main button[data-testid="app-bar-back"]');
        if(!back_button) return;
        if(location.pathname === "/intent/tweet" || location.pathname === "/compose/post"){
            back_button.style.display = "none";
        }else{
            back_button.style.display = "block";
        }
    }).observe(document, {childList: true, subtree: true});

    let instance = null;
    //pushを取得
    let push = tryGetPush();

    //pushの存在をチェックし、存在していればその他の機能を初期化する
    if (is_new_client){
        new MutationObserver(intercept).observe(document, { childList: true, subtree: true });
        intercept();
    }else if(push){
        onReady();
    }else{
        const waitObserver = new MutationObserver(() => {
            push = tryGetPush();
            if (push) {
                waitObserver.disconnect();
                onReady();
            }
        });
        waitObserver.observe(document, { childList: true, subtree: true });
    }

    //入力されたタイミングでエディタに入力されたハッシュタグを保持する
    document.addEventListener('input', (ev) => {
        const target = ev.target;
        if (!is_new_client || !target.matches?.('textarea[aria-multiline="true"]')) return;

        //スレッドから削除されたポストの分は破棄する
        for (const element of textarea_hashtags.keys()) {
            if (!element.isConnected) textarea_hashtags.delete(element);
        }
        textarea_hashtags.set(target, [...target.value.matchAll(/#([\p{L}\p{N}_]+)/gu)].map(match => match[1]));
    }, true);

    //新クライアント向けのRouter取得
    function getRouter() {
        const start = document.querySelector('main') ?? document.querySelector('textarea[aria-multiline="true"]');
        let fallback = null;
        for (let fiber = start && getFiber(start); fiber; fiber = fiber.return) {
            const p = fiber.memoizedProps;
            if (p?.router?.navigate && p.router.subscribe) return p.router;
            if (!fallback && p?.value?.history && p.value.navigate && p.value.subscribe) fallback = p.value;
        }
        return fallback;
    }

    function interceptNewClient() {
        if (router) return;

        //投稿画面の時だけ取得を行う
        if (!location.pathname.startsWith('/compose/')) return;

        router = getRouter();
        if (!router) return;

        //ツイート完了後など、投稿画面を離れたら投稿画面に戻す
        in_compose = location.pathname.startsWith('/compose/');
        router.subscribe('onResolved', () => {
            const now = location.pathname.startsWith('/compose/');
            if (in_compose && !now) {
                saveHashtags();
                router.navigate({ to: '/intent/tweet', replace: true });
            }
            in_compose = now;
        });
    }

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

        //新クライアント向けの遷移防止
        if (is_new_client) {
            interceptNewClient();
            return;
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

    //校正周りの処理
    let target_editor_elem = null;
    let opd_paste_token = null;
    document.addEventListener("focusin", (ev) => {
        if(ev.target && (ev.target.isContentEditable || ev.target.matches?.('textarea[aria-multiline="true"]'))){
            target_editor_elem = ev.target;
        }
    });
    const handler = async(e) => {
        //Firefox では detail にオブジェクトを乗せられない様なので、JSON化している
        const detail = JSON.parse(e.detail);
        //貼り付け時のトークンをチェックする
        if(opd_paste_token && opd_paste_token !== detail.token) return;

        //新クライアント向けの入力
        if(target_editor_elem && target_editor_elem.tagName === 'TEXTAREA' && target_editor_elem.isConnected){
            setTextareaText(target_editor_elem, detail.text);
            return;
        }

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
                //ハッシュタグが含まれていると、execCommandでは動作が崩れるのでこうする
                setEditorText(target_editor_elem, detail.text);
            }
        }
    };

    //組み込みエディタからテキストを取得する
    function getEditorText(editor){
        //新クライアントではtextareaが使われているので、そのままvalueを返す
        if(editor?.tagName === 'TEXTAREA') return editor.value;

        //エディタの内部インスタンスを取得する
        const instance = getDraftEditorInstance(editor);

        //エディタの状態を取得して入力されているテキストを取得する
        const editor_state = instance._latestEditorState;
        const content = editor_state.getCurrentContent();
        return content.getPlainText("\n");
    }

    //組み込みエディタからハッシュタグを取得
    function getEditorHashtags(){
        const target_editors = document.querySelectorAll('div[contenteditable="true"][data-testid*="tweetTextarea"], textarea[aria-multiline="true"]');

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
        const hashtags = is_new_client ? [...textarea_hashtags.values()].flat() : getEditorHashtags();
        textarea_hashtags.clear();

        //ハッシュタグがない場合は何もしない
        if(!hashtags.length) return;

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

        const active_editor = hashtag_restore_btn.closest('[data-media-upload-dropzone]')?.querySelector('textarea[aria-multiline="true"]')
            ?? document.querySelector('[data-testid="toolBar"]')?.closest('div:has(.public-DraftEditor-content)')?.querySelector('.public-DraftEditor-content[contenteditable="true"]');

        //現在のテキストを取得して保存されたハッシュタグを付与する
        const editor_text = getEditorText(active_editor)
        const hashtag_text = " " + hashtags.map(tag => "#" + tag).join(" ");

        //ハッシュタグをエディタへ挿入する
        setEditorText(active_editor, editor_text + hashtag_text);
    }

    //保存されたハッシュタグを削除する
    function deleteStorageHashtags(){
        localStorage.removeItem("opd_post_hashtags");

        const hashtag_restore_btn = document.getElementById("opd_hashtag_restore");
        if(!hashtag_restore_btn) return;

        hashtag_restore_btn.setAttribute("disabled", "");
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

    function setEditorText(target_editor_elem, text){
        //新クライアント向けの入力
        if(target_editor_elem?.tagName === 'TEXTAREA'){
            setTextareaText(target_editor_elem, text);
            return true;
        }

        //エディタと内部状態を取得
        const editor = getDraftEditorInstance(target_editor_elem);
        const editor_state = editor?._latestEditorState ?? editor?.props?.editorState;
        const on_change = editor?.props?.onChange;
        if(!editor_state || typeof on_change !== "function") return false;

        //取得した状態からクラスを取得する
        const EditorState  = editor_state.constructor;
        const ContentState = editor_state.getCurrentContent().constructor;

        //新しい状態を作ってエディタのonChangeに渡す
        const new_state = EditorState.moveFocusToEnd(
            EditorState.createWithContent(ContentState.createFromText(text), editor_state.getDecorator())
        );
        on_change(new_state);
        return true;
    }

    //新クライアント向けの書き戻し
    function setTextareaText(textarea, text){
        textarea.focus();
        textarea.select();
        //execCommandを使ってみて、失敗したら別の方法へフォールバックする
        if(!document.execCommand('insertText', false, text) || textarea.value !== text){
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
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

    //ハッシュタグ埋め込み機能のタグ記録を削除する
    window.addEventListener('opd_text_hashtag_restore_tag_delete', deleteStorageHashtags, true);

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

    //push取得
    function tryGetPush(){
        const root = document.querySelector('#react-root > div');
        if (!root) return null;
        return getProps(root)?.children?.props?.children?.props?.history?.push ?? null;
    }

    //pushの取得後に実行
    function onReady(){
        const observer = new MutationObserver(intercept);
        observer.observe(document.querySelector('#react-root'), {
            childList: true, subtree: true
        });
        intercept();
    }
})();