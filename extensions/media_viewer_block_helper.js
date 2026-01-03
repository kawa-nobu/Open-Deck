//メディアビューワー停止用
(() => {
    let opd_send_media_info_token = null;
    //カラム側の画像表示を停止させて、表示画像などの情報をOPD側に渡す
    /*
    TODO:ツイートページのツイートに画像や動画付きの引用が付いていて、引用のメディアをクリックした際に元のメディアが表示される問題を修正する。
    ※引用を開いた際の判定と引用のメディア情報を抽出する方法を調査する
    */
    document.addEventListener("click", (e) => {
        const img = e.target.closest('img, div[data-testid="videoComponent"]');
        let video_wraper_props = null;
        if (!img) return;

        if(img.getAttribute("data-testid") === "videoComponent"){
            video_wraper_props = get_props(img.querySelector('div[tabindex="0"]'), "Props");
        }

        const root_props = get_props(img.closest('div[aria-labelledby][id]'), "Props");//:not([data-testid="card.wrapper"])
        const current_video_source = video_wraper_props?.children?.props?.playerState;

        let media_details = root_props?.children[0]?.props?.children[0]?.props?.mediaDetails;
        let media_details_quoted = root_props?.children[2]?.props?.tweet?.extended_entities?.media;
        //TwitterCardなどの場合は、一旦対象外とする
        if(!media_details && !media_details_quoted) return;

        media_details ??= media_details_quoted;
        
        //ビューワー自体の動作を止める
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        //動画をミュートにする
        const video_elem = img.querySelector("video");
        if(video_elem){
            video_elem.pause();
            video_elem.muted = true;
        }

        //画像の現在値とメディア情報を送信する
        let is_send = false;
        for (let index = 0; index < media_details.length; index++) {
            const media = media_details[index];
            if(img?.src?.match(media.media_url_https?.replaceAll(/.jpg|.png/g, ""))){
                window.parent.document.dispatchEvent(new CustomEvent('opd_send_media_info', {
                    bubbles: true,
                    composed: true,
                    detail: JSON.stringify({ token:opd_send_media_info_token, media_info:media_details, selected_index:index })
                }));
                is_send = true;
                break;
            }else if(current_video_source?.posterImage === media?.media_url_https){
                window.parent.document.dispatchEvent(new CustomEvent('opd_send_media_info', {
                    bubbles: true,
                    composed: true,
                    detail: JSON.stringify({ token:opd_send_media_info_token, media_info:media_details, selected_index:index })
                }));
                is_send = true;
                break;
            }
        }
        //現在値が取得できなかった場合は0で送信する
        if(!is_send){
            window.parent.document.dispatchEvent(new CustomEvent('opd_send_media_info', {
                bubbles: true,
                composed: true,
                detail: JSON.stringify({ token:opd_send_media_info_token, media_info:media_details, selected_index:0 })
            }));
        }
    }, true);
    //ReactProps取得関数
    function get_props(elem, type){
        if (!elem) return;
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