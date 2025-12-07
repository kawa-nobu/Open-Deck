//メディアビューワー停止用
(() => {
    //カラム側の画像表示を停止させて、表示画像などの情報をOPD側に渡す
    document.addEventListener("click", (e) => {
        const img = e.target.closest('img, div[data-testid="videoComponent"]');
        if (!img) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        //Propsを取得する
        const data_testid = img.getAttribute('data-testid');
        if(data_testid === 'videoComponent'){
            console.log(get_props(img, "Props"))
        }
        if(data_testid !== 'videoComponent' && img.tagName === 'IMG'){
            console.log(get_props(img.closest('a'), "Props"))
        }
    }, true);
    //ReactProps取得関数
    function get_props(elem, type){
        const prop_type = type === "Props" ? type : "Fiber";
        const propsKey = Object.getOwnPropertyNames(elem).find(k => k.includes(`__react${prop_type}$`));
        return propsKey ? elem[propsKey] : null;
    }
    //機能動作用のトークンを設定
    window.addEventListener('opd_send_media_info_init', (e)=>{
        const detail = JSON.parse(e.detail);
        opd_reload_token = detail.token;
    }, true);
    //自動更新イベントを追加する
    window.addEventListener('opd_send_media_info', (e) => {
        const detail = JSON.parse(e.detail);
        if(opd_reload_token && opd_reload_token !== detail.token) return;
        reload_func();
    }, true);
})();