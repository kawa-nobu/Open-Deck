// 文書校正機能で使用
class OpdExtTextReview {
    constructor() {
        this.Init = (column_window) => {
            //初期化
            const observer = new MutationObserver((mutations, obs) => {
                const btnAddTarget = column_window.document.querySelector('[data-testid="toolBar"]');
                if (btnAddTarget) {
                    console.log(btnAddTarget);
                    obs.disconnect();
                    btnAddTarget.insertAdjacentHTML('beforebegin', '<div>AAAA</div>');
                }
            }).observe(column_window.document, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
        this.Review = (text) => {
            //文章校正開始
            console.log(text)
            console.log("OK")
        }
    }
}