/* カラム内で使う細々とした機能を実装する */
(() => {
    console.log("UtilsWorking")
    /* ポスト画面などテキスト入力フォーカス状態を送信するようにする関数 */
    function sendTextFocusState(){
        //フォーカスされた時
        window.addEventListener('focusin', (e) => {
            if (e.target.getAttribute('contenteditable') === 'true' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                window.parent.dispatchEvent(new CustomEvent('opd_post_focus', {detail: JSON.stringify(true)}));
            }
        });
        //フォーカスが外れた時
        window.addEventListener('focusout', (e) => {
            window.parent.dispatchEvent(new CustomEvent('opd_post_focus', {detail: JSON.stringify(false)}));
        });
    }

    sendTextFocusState();
})();