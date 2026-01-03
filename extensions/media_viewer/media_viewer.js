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
                        style="display:block;max-width:95vw;max-height:80vh;object-fit:contain;"
                        src="${info.video_info.variants.at(-1).url}"
                        controls
                        autoplay
                        playsinline
                    ></video>`;
                }

                if (info.type === "photo") {
                    return `
                        <img data-media
                            style="display:block;max-width:95vw;max-height:80vh;object-fit:contain;"
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
                    current.load?.();
                    current.play?.().catch(() => { });
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
            };


            Object.assign(media_viewer_dialog, {
                id: "opd_media_viewer",
                style: "z-index:999999;border:none;background:none;padding:0;" +
                "display:flex;flex-direction:column;align-items:center;gap:12px;" +
                "max-width:95vw;max-height:95vh;"
            });
            media_viewer_dialog.closedBy = "any";
            media_viewer_dialog.innerHTML = `
            <div class="opd_media_viewer_func_btn_circle" style="display:flex;width:100%;justify-content:flex-end;">
                <button type="button" data-close><span class="media_viewer_icon_close opd_ui_icon_color"></span></button>
            </div>

            <div style="display: flex;flex-direction: row;">
                <button type="button" class="opd_media_viewer_func_btn" style="width: 80px;border-radius: 10px 0 0 10px;" data-media-forward><span class="media_viewer_icon_forward opd_ui_icon_color"></span></button>
                ${mediaHTMLAt(current_media_idx)}
                <button type="button" class="opd_media_viewer_func_btn" style="width: 80px;border-radius: 0 10px 10px 0;" data-media-next><span class="media_viewer_icon_next opd_ui_icon_color"></span></button>
            </div>

            <div class="opd_media_viewer_func_btn_circle" style="width:100%;display:flex;justify-content:center;">
                <button type="button" data-media-download><span class="media_viewer_icon_download opd_ui_icon_color"></span></button>
            </div>
            `;
            media_viewer_div.appendChild(media_viewer_dialog);
            document.body.appendChild(media_viewer_div);
            media_viewer_dialog.addEventListener("close", () => media_viewer_div.remove());
            media_viewer_dialog.querySelector("[data-close]")?.addEventListener("click", () => media_viewer_div.remove());


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