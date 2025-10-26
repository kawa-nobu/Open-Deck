//自動更新機能用
(() => {
    let path_old = null;
    let opd_reload_token = null;
    let reload_func = null;
    // URLで画面の遷移を監視する
    new MutationObserver(function(){
        const path_search = `${location.pathname}${location.search}`;
        if(path_old === path_search){
            return;
        }
        //sectionの要素を取得する
        const section = document.querySelector('section[role="region"]');
        if(!section) return;
        //Propsを取得する
        const props = get_props(section, "Props");
        const refresh = props?.children[1]?.props.children[2]?._owner.memoizedProps?.onRefresh;
        if (!refresh){
            // 関数が存在しない場合、無意味な関数を設定しておく
            reload_func = ()=>{};
            return;
        };
        reload_func = refresh;
        path_old = path_search;
    }).observe(document, {childList: true, subtree: true});
    //ReactProps取得関数
    function get_props(elem, type){
        const prop_type = type === "Props" ? type : "Fiber";
        const propsKey = Object.getOwnPropertyNames(elem).find(k => k.includes(`__react${prop_type}$`));
        return propsKey ? elem[propsKey] : null;
    }
    //機能動作用のトークンを設定
    window.addEventListener('opd_column_reload_init', (e)=>{
        const detail = JSON.parse(e.detail);
        opd_reload_token = detail.token;
    }, true);
    //自動更新イベントを追加する
    window.addEventListener('opd_column_reload', (e) => {
        const detail = JSON.parse(e.detail);
        if(opd_reload_token && opd_reload_token !== detail.token) return;
        reload_func();
    }, true);
})();