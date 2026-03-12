// メディアビューワー
class OpdExtMediaViewer {
    constructor() {
        this.Preview = (media_info, pre_index) => {
            let current_media_idx = pre_index;
            const media_viewer_div = document.createElement("div");
            const media_viewer_dialog = document.createElement("dialog");
            const mediaHTMLAt = (idx) => {
                const info = media_info[idx];
                if (!info) return "";

                if (["animated_gif","video"].includes(info.type)) {
                    return `
                    <video data-media
                        style="width:auto;height:auto;max-width:calc(100% - 160px);max-height:100%;object-fit:contain;"
                        src="${info.video_info.variants.at(-1).url}"
                        controls
                        autoplay
                        playsinline
                    ></video>`;
                }

                if (info.type === "photo") {
                    return `
                        <img data-media
                            style="width:auto;height:auto;max-width:calc(100% - 160px);max-height:100%;object-fit:contain;"
                            src="${info.media_url_https + "?name=orig"}"
                        />`;
                }

                return "";
            };

            const stopVideo = (elem) => {
                if (!elem || elem.tagName !== "VIDEO") return;
                try {
                    elem.pause();
                    elem.removeAttribute("src");
                    elem.load();
                } catch (error) {}
            };

            const setMedia = (idx) => {
                const current = media_viewer_dialog.querySelector("[data-media]");
                const nextInfo = media_info[idx];
                if (!current || !nextInfo) return;

                stopVideo(current);

                if (["animated_gif","video"].includes(nextInfo.type) && current.tagName === "VIDEO") {
                    current.src = nextInfo.video_info.variants.at(-1).url;
                    current.load();
                    current.play();
                    return;
                }
                if (nextInfo.type === "photo" && current.tagName === "IMG") {
                    current.src = nextInfo.media_url_https + "?name=orig";
                    return;
                }

                const wrapper = document.createElement("div");
                wrapper.innerHTML = mediaHTMLAt(idx);
                const next_elment = wrapper.firstElementChild;
                if (!next_elment) return;

                current.replaceWith(next_elment);
                if (next_elment.tagName === "VIDEO") {
                    next_elment.addEventListener("loadedmetadata", () => {
                        next_elment.volume = 0.2;
                    }, {once: true});
                }
            };


            Object.assign(media_viewer_dialog, {
                id: "opd_media_viewer",
                style: "z-index:999999;border:none;background:none;padding:0;display:flex;flex-direction:column;align-items:center;gap:12px;width:85vw;height:85vh;overflow:hidden;"
            });
            media_viewer_dialog.closedBy = "any";
            media_viewer_dialog.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;align-items:center;">
                <div class="opd_media_viewer_func_btn_circle" style="display:flex;width:100%;justify-content:flex-end;">
                    <button type="button" data-close><span class="media_viewer_icon_close opd_media_viewer_func_btn_icon_color"></span></button>
                </div>

                <div style="display:flex;flex-direction:row;flex:1;min-height:0;overflow:hidden;align-items:center;width:fit-content;">
                    <button type="button" class="opd_media_viewer_func_btn media_switch_btn" data-media-forward><span class="media_viewer_icon_forward opd_media_viewer_func_btn_icon_color"></span></button>
                    ${mediaHTMLAt(current_media_idx)}
                    <button type="button" class="opd_media_viewer_func_btn media_switch_btn" data-media-next><span class="media_viewer_icon_next opd_media_viewer_func_btn_icon_color"></span></button>
                </div>

                <div class="opd_media_viewer_func_btn_circle" style="width:100%;margin-top:10px;display:flex;justify-content:center;">
                    <button type="button" data-media-download><span class="media_viewer_icon_download opd_media_viewer_func_btn_icon_color"></span></button>
                </div>
            </div>
            `;
            media_viewer_div.appendChild(media_viewer_dialog);
            const append_viewer_element = document.body.appendChild(media_viewer_div);

            //Videoの音量設定
            let video_element = append_viewer_element.getElementsByTagName('video')[0];
            if(video_element){
                //音量の大きい動画が急に再生されるとびっくりするので、音量を下げておく
                video_element.volume = 0.2;
            }

            function media_viewer_close(){
                video_element = append_viewer_element.getElementsByTagName('video')[0];
                if(video_element){
                    //稀にビューワーを閉じた後でもVideoが再生されてしまう場合があるので念のため、Videoを止めて消す
                    video_element.pause();
                    video_element.remove();
                }
                media_viewer_div.remove();
            }

            media_viewer_dialog.addEventListener("close", () => media_viewer_close());
            media_viewer_dialog.querySelector("[data-close]")?.addEventListener("click", () => media_viewer_close());

            //背景クリックで閉じやすくする
            media_viewer_dialog.addEventListener("click", (event)=>{
                const tag_name = event.target.tagName;
                const allowed_tag = ["IMG", "VIDEO", "SPAN", "BUTTON"];
                if(!allowed_tag.includes(tag_name)){
                    media_viewer_close();
                }
            })


            this.SkipBtnDisabled(media_viewer_dialog, media_info, current_media_idx);

            media_viewer_dialog.querySelector("[data-media-forward]").addEventListener("click", () => {

                this.SkipBtnDisabled(media_viewer_dialog, media_info, current_media_idx);

                if (current_media_idx === 0) return;

                const current_media_elem = media_viewer_dialog.querySelector("[data-media]");
                const forward_idx = current_media_idx - 1;

                if (["animated_gif","video"].includes(media_info[forward_idx]?.type) ) {
                    current_media_elem.src = media_info[forward_idx].video_info.variants.at(-1).url;
                }
                if (media_info[forward_idx]?.type === "photo") {
                    current_media_elem.src = media_info[forward_idx].media_url_https + '?name=orig';
                }
                current_media_idx -= 1;

                setMedia(current_media_idx);

                this.SkipBtnDisabled(media_viewer_dialog, media_info, current_media_idx);
            });

            media_viewer_dialog.querySelector("[data-media-next]").addEventListener("click", () => {
                const next_idx = current_media_idx + 1;

                if (media_info.length === next_idx) return;

                const current_media_elem = media_viewer_dialog.querySelector("[data-media]");
                if (["animated_gif","video"].includes(media_info[next_idx]?.type) ) {
                    current_media_elem.src = media_info[next_idx].video_info.variants.at(-1).url;
                }
                if (media_info[next_idx]?.type === "photo") {
                    current_media_elem.src = media_info[next_idx].media_url_https + '?name=orig';
                }
                current_media_idx += 1;

                setMedia(current_media_idx);

                this.SkipBtnDisabled(media_viewer_dialog, media_info, current_media_idx);
            });

            media_viewer_dialog.querySelector("[data-media-download]").addEventListener("click", () => {
                this.DownloadMedia(media_info[current_media_idx]);
            })

            media_viewer_dialog.showModal();
        }

        this.SkipBtnDisabled = (dialog_elem, media_info, current_media_idx) => {
            const next_btn = dialog_elem.querySelector("[data-media-next]");
            const prev_btn = dialog_elem.querySelector("[data-media-forward]");
            if (!next_btn || !prev_btn) return;

            if (media_info.length === 1) {
                prev_btn.setAttribute("disabled", "");
                next_btn.setAttribute("disabled", "");
                return;
            }

            prev_btn.removeAttribute("disabled");
            next_btn.removeAttribute("disabled");

            switch (current_media_idx) {
                case 0:
                    prev_btn.setAttribute("disabled", "");
                    break;

                case media_info.length - 1:
                    next_btn.setAttribute("disabled", "");
                    break;
            }
        }
        this.DownloadMedia = async (media) => {
            let media_src = null;
            if (["animated_gif","video"].includes(media?.type)) {
                media_src = media.video_info.variants.at(-1).url;
            }
            if (media?.type === "photo") {
                media_src = media.media_url_https + '?name=orig';
            }
            const res = await fetch(media_src);
            const blob = await res.blob();

            const a = document.createElement("a");
            const objectUrl = URL.createObjectURL(blob);

            a.href = objectUrl;
            a.download = media.id_str ?? "";
            document.body.appendChild(a);
            a.click();

            URL.revokeObjectURL(objectUrl);
            document.body.removeChild(a);
        }
    }
}