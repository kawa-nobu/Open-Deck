//メディアビューワー停止用
(() => {
    let opd_send_media_info_token = null;
    let is_alt_pressed = false;
    //カラム側の画像表示を停止させて、表示画像などの情報をOPD側に渡す
    /*
    TODO:ツイートページのツイートに画像や動画付きの引用が付いていて、引用のメディアをクリックした際に元のメディアが表示される問題を修正する。
    ※引用を開いた際の判定と引用のメディア情報を抽出する方法を調査する
    */
    document.addEventListener("click", (e) => {
        //Alt(Option)キーが押されている場合はメディアビューワーを使用しないようにする
        if(is_alt_pressed) return;

        //引用の場合に格納される
        const quoted = e.target.closest('div[tabindex="0"][role="link"]');
        // 通常のメディア付きツイート
        const img = e.target.closest('img, div[data-testid="videoComponent"]');
        if (!img) return;

        //プレイヤーが動作している場合のPropsを取得する
        let video_wrapper_props = null;
        if(img.getAttribute("data-testid") === "videoComponent"){
            video_wrapper_props = get_props(img.querySelector('div[tabindex="0"]'), "Props");
        }

        //ルートのPropsを取得
        let root_props = get_props(img.closest('div[aria-labelledby][id]'), "Props");//:not([data-testid="card.wrapper"])
        if(quoted){
            root_props = get_props(quoted, "Props")
        }

        //プレイヤーが存在している場合の現在再生ソースを取得
        const current_video_source = video_wrapper_props?.children?.props?.playerState;

        //メディアソースの一覧を取得
        let media_details = root_props?.children[0]?.props?.children[0]?.props?.mediaDetails;

        //引用の場合のメディアソースの一覧を取得
        let media_details_quoted = root_props?.children[2]?.props?.tweet?.extended_entities?.media;
        if(quoted){
            media_details_quoted = root_props?.children[0]?.[0]?.props?.children[1]?.props?.children[4]?.props?.children?.props?.mediaDetails
        }

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
    document.addEventListener('opd_send_media_info_init', (e)=>{
        const detail = JSON.parse(e.detail);
        opd_send_media_info_token = detail.token;
    }, true);
    /*ショートカットキーとしてAlt(Option)キーの動作を設定*/
    document.addEventListener('opd_media_viewer_shotcut', (e)=>{
        //カラムが非アクティブの場合
        const detail = JSON.parse(e.detail);

        if(detail.token !== opd_send_media_info_token) return;

        is_alt_pressed = detail.keys.alt;
    }, true);
    //カラムがアクティブの場合
    document.addEventListener('keydown', (event) => {
        console.log("shift_down")
        if (event.key === 'Alt') is_alt_pressed = true;
    });
    document.addEventListener('keyup', (event) => {
        console.log("shift_up")
        if (event.key === 'Alt') is_alt_pressed = false;
    });
})();