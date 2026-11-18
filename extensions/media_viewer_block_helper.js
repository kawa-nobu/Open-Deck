//メディアビューワー停止用
(() => {
    let opd_send_media_info_token = null;
    const is_new_client = Object.keys(document.querySelector('html').dataset).some(key=>['appEnv', 'appVersion'].includes(key));
    //カラム側の画像表示を停止させて、表示画像などの情報をOPD側に渡す
    /*
    TODO:ツイートページのツイートに画像や動画付きの引用が付いていて、引用のメディアをクリックした際に元のメディアが表示される問題を修正する。
    ※引用を開いた際の判定と引用のメディア情報を抽出する方法を調査する
    */
    document.addEventListener("click", (e) => {
        //Alt(Option)キーが押されている場合はメディアビューワーを使用しないようにする
        if (e.altKey) {
            const target_root = e.target.closest('div[data-testid="cellInnerDiv"]');
            if (target_root) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            
                const target = e.target.closest('a[href]')
                if (target){
                    target.click();
                }
            }
            return;
        }

        //引用の場合に格納される
        let quoted = e.target.closest('div.mx-auto.aspect-video, div[tabindex="0"][role="link"]');

        // 通常のメディア付きツイート
        let img = e.target.closest('img, div[data-testid="videoComponent"]');

        if(!img && is_new_client){
            //新クライアント向けのフォールバック
            img = e.target;
            while(img && !get_props(img, "Fiber")) img = img.parentElement;
        }

        if (!img) return;

        //プレイヤーが動作している場合のPropsを取得する
        let video_wrapper_props = null;
        if(img.getAttribute("data-testid") === "videoComponent"){
            video_wrapper_props = get_props(img.querySelector('div[tabindex="0"]'), "Props");
        }

        //ルートのPropsを取得
        let root_props = get_props(img.closest('div[aria-labelledby][id]'), "Props");//:not([data-testid="card.wrapper"])
        if(quoted){
            root_props = get_props(quoted, "Props");
        }

        //新クライアント向けのフォールバック
        if(!root_props){
            root_props = get_props(img, "Props");
        }

        //プレイヤーが存在している場合の現在再生ソースを取得
        const current_video_source = video_wrapper_props?.children?.props?.playerState;

        let selected_media_url = null;

        //メディアソースの一覧を取得
        let media_details = root_props?.children?.[1]?.props?.children?.[0]?.props?.mediaDetails;
        if(!media_details){
            //新クライアント向けのフォールバック
            //Fiberを走査して最寄りのポストのメディア一覧とクリックされたメディアを取得する
            for(let fiber = get_props(img, "Fiber"); fiber; fiber = fiber.return){
                selected_media_url ??= fiber.memoizedProps?.media?.media_url_https;
                const media_entities = fiber.memoizedProps?.tweet?.media_entities2;
                if(media_entities?.length){
                    //メディア自身の領域のクリックでなければ対象外とする
                    if(selected_media_url) media_details = media_entities;
                    break;
                }
            }
        }

        //引用の場合のメディアソースの一覧を取得
        let media_details_quoted = root_props?.children?.[2]?.props?.tweet?.extended_entities?.media;
        if(quoted){
            media_details_quoted = root_props?.children?.[0]?.[0]?.props?.children?.[1]?.props?.children?.[5]?.props?.children?.props?.mediaDetails;
            
            //小さいサイズ表示になっている引用画像を取得する
            if(!media_details_quoted){
                media_details_quoted = root_props?.children?.[0]?.[0]?.props?.children?.[1]?.props?.children?.[0]?.props?.children?.[1]?.props?.children?.props?.mediaDetails;
            }

            //新クライアント向けのフォールバック
            if(!media_details_quoted){
                media_details ??= root_props?.children?.props?.tweet?.media_entities2;
            }
        }

        //TwitterCardなどの場合は、一旦対象外とする
        if(!media_details && !media_details_quoted) return;

        media_details ??= media_details_quoted;

        //Relay内部データなどの不要なデータを減らす
        media_details = media_details.map(({ __fragments, __fragmentOwner, ...plain_media }) => plain_media);
        
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

        //新クライアントは動画情報などをRelayStoreへ格納しているので、情報をストアから都度取得する
        const relay_environment = get_relay_environment(img);
        if (relay_environment) {
            const source = relay_environment.getStore().getSource();
            media_details = media_details.map((media) => {
                const record = source.get(media.__id);
                const video_info = source.get(record?.video_info?.__ref);
                return { ...media, id_str: record?.id_str, ...(video_info && { video_info: { ...video_info, variants: video_info.variants.__refs.map((ref) => ({ ...source.get(ref) })) } }) };
            });
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
            }else if(current_video_source?.posterImage === media?.media_url_https || (selected_media_url && selected_media_url === media?.media_url_https)){
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
    //RelayStore取得関数
    function get_relay_environment(elem){
        for (let fiber = get_props(elem, "Fiber"); fiber; fiber = fiber.return) {
            const environment = fiber.memoizedProps?.environment;
            if (environment?.getStore) return environment;
        }
    }
    //機能動作用のトークンを設定
    document.addEventListener('opd_send_media_info_init', (e)=>{
        const detail = JSON.parse(e.detail);
        opd_send_media_info_token = detail.token;
    }, true);
})();