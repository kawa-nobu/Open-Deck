// メディアビューワー停止用
class OpdMediaViewerBlocker {
    constructor() {
        this.opd_send_media_info_token = null;
        this.Init = (column_window) => {
            //ヘルパースクリプト追加
            const helper_script = column_window.document.createElement('script');
            helper_script.src = chrome.runtime.getURL("extensions/media_viewer_block_helper.js");
            column_window.document.head.appendChild(helper_script);

            this.opd_send_media_info_token = crypto.randomUUID();
            setTimeout(() => {
                column_window.document.dispatchEvent(new CustomEvent('opd_send_media_info_init', {
                    detail: JSON.stringify({ token:this.opd_send_media_info_token })
                }));
            }, 200);
        }
    }
}