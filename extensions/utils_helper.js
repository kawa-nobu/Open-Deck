/* カラム内で使う細々とした機能を実装する */
(() => {
    console.log("UtilsWorking")

    //新クライアント環境判定フラグ
    const isNewClient = !!window.__TSR_ROUTER__ || !document.getElementById('react-root');

    /* ポスト画面などテキスト入力フォーカス状態を送信するようにする関数 */
    function sendTextFocusState() {
        //フォーカスされた時
        window.addEventListener('focusin', (e) => {
            if (e.target.getAttribute('contenteditable') === 'true' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                window.parent.dispatchEvent(new CustomEvent('opd_post_focus', { detail: JSON.stringify(true) }));
            }
        });
        //フォーカスが外れた時
        window.addEventListener('focusout', (e) => {
            window.parent.dispatchEvent(new CustomEvent('opd_post_focus', { detail: JSON.stringify(false) }));
        });
    }

    /* カラム内の履歴を親や他のカラムから独立させる関数 */
    function isolateHistory() {
        //pushStateの差し替え後もreplaceStateを使えるように退避しておく
        const nativeReplaceState = History.prototype.replaceState.bind(history);
        const backHistory = [];
        const forwardHistory = [];

        //現在の位置をsaveToへ保持して、takeFromの最後の位置へ移動する
        const moveHistory = (saveTo, takeFrom) => {
            const target = takeFrom.pop();
            if (!target) return;

            saveTo.push({ state: history.state, url: location.href });
            nativeReplaceState(target.state, "", target.url);

            //ページ側に履歴の移動を通知する
            dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
        };

        //呼び出し時はブラウザの履歴を増やさずにURLだけ置き換えて、戻り先は自前で保持しておく
        history.pushState = (state, title, url) => {
            backHistory.push({ state: history.state, url: location.href });

            //新しく遷移したら進む先の履歴を消しておく
            forwardHistory.length = 0;

            nativeReplaceState(state, title, url);
        };

        //戻る操作時、今の位置を進む先に保存して戻り先へ移動する
        history.back = () => moveHistory(forwardHistory, backHistory);

        //進む操作時、今の位置を戻り先に保存して進む先へ移動する
        history.forward = () => moveHistory(backHistory, forwardHistory);

        //ポスト画面などで使用されるgo()を自前の履歴操作に割り当てる
        history.go = (delta = 0) => {
            //0が指定されている時は再読込する
            if (delta === 0) return location.reload();

            //0以外の場合は、負の数ならその数だけ戻り、正の数ならその数だけ進む
            for (let index = 0; index < Math.abs(delta); index++) {
                delta < 0 ? history.back() : history.forward();
            }
        };

        //マウスの戻るや進むボタンでブラウザ自体の履歴を動かさないようにする
        addEventListener("mousedown", (e) => (e.button === 3 || e.button === 4) && e.preventDefault(), true);

        //マウスの戻るや進むボタンを自前の履歴操作に割り当てる
        addEventListener("mouseup", (e) => {
            if (e.button !== 3 && e.button !== 4) return;

            e.preventDefault();
            e.button === 3 ? history.back() : history.forward();
        }, true);
    }

    //新クライアントでは、戻る操作時に他のカラムの画面も戻ってしまうことがあるので履歴周りのAPIを独立させる
    if (isNewClient) isolateHistory();

    sendTextFocusState();
})();