//メディアビューワー停止用
(() => {
    let opd_send_media_info_token = null;
    //カラム側の画像表示を停止させて、表示画像などの情報をOPD側に渡す
    document.addEventListener("click", (e) => {
        const img = e.target.closest('img, div[data-testid="videoComponent"]');
        if (!img) return;

        const root_props = get_props(img.closest('div[aria-labelledby][id]'), "Props");//:not([data-testid="card.wrapper"])
        const media_details = root_props?.children[0]?.props?.children[0]?.props?.mediaDetails;
        
        //TwitterCardなどの場合は、一旦対象外とする
        if(!media_details) return;

        //ビューワー自体の動作を止める
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        //Propsを取得する
        for (let index = 0; index < media_details.length; index++) {
            const media = media_details[index];
            if(img?.src?.match(media.media_url_https?.replaceAll(/.jpg|.png/g, ""))){
                window.parent.document.dispatchEvent(new CustomEvent('opd_send_media_info', {
                    bubbles: true,
                    composed: true,
                    detail: JSON.stringify({ token:opd_send_media_info_token, media_info:media_details, selected_index:index })
                }));
                break;
            }
            /*if(media.type === "video"){
                window.parent.document.dispatchEvent(new CustomEvent('opd_send_media_info', {
                    bubbles: true,
                    composed: true,
                    detail: JSON.stringify({ token:opd_send_media_info_token, media_info:media_details, selected_index:index })
                }));
                break;
            }*/
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
        opd_send_media_info_token = detail.token;
    }, true);
})();