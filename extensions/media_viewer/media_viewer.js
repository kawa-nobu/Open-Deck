// メディアビューワー
class OpdExtMediaViewer {
    constructor() {
        this.Preview = (media_info, pre_index) => {
            //console.log(media_info, pre_index)
            const media_viewer_div = document.createElement("div");
            const media_viewer_dialog = document.createElement("dialog");
            let media_elem = null;
            console.log(media_info[pre_index])
            if(media_info[pre_index].type === "video"){
                media_elem = `
                <video data-media
                    style="display:block;max-width:95vw;max-height:80vh;object-fit:contain;"
                    src="${media_info[pre_index].video_info.variants.at(-1).url}"
                    controls
                    autoplay
                >`;
            }
            if(media_info[pre_index].type === "photo"){
                media_elem = `
                <img data-media
                    style="display:block;max-width:95vw;max-height:80vh;object-fit:contain;"
                    src="${media_info[pre_index].media_url_https}"
                >`;
            }
            Object.assign(media_viewer_dialog, {
                id: "opd_media_viewer",
                style: "z-index:999999;border:none;background:none;padding:0;" +
                "display:flex;flex-direction:column;align-items:center;gap:12px;" +
                "max-width:95vw;max-height:90vh;"
            });
            media_viewer_dialog.closedBy = "any";
            media_viewer_dialog.innerHTML = `
            <div style="display:flex;width:100%;justify-content:flex-end;">
                <button type="button" data-close>Close</button>
            </div>

            ${media_elem}

            <div style="width:100%;display:flex;justify-content:center;">
                <button type="button">Download</button>
            </div>
  `;
            media_viewer_div.appendChild(media_viewer_dialog);
            document.body.appendChild(media_viewer_div);
            media_viewer_dialog.addEventListener("close", () => media_viewer_div.remove());
            media_viewer_dialog.querySelector("[data-close]").addEventListener("click", () => media_viewer_dialog.close());
            media_viewer_dialog.showModal();
        }
    }
}