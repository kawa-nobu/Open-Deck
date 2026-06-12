// メディアビューワー停止用
class OpdMediaViewerBlocker {
    constructor() {
        this.opd_send_media_info_token = null;
        this.Init = (column_frame) => {
            const column_window = column_frame.contentWindow;
            //ヘルパースクリプト追加
            const helper_script = column_window.document.createElement('script');
            helper_script.src = chrome.runtime.getURL("extensions/media_viewer_block_helper.js");

            this.opd_send_media_info_token = crypto.randomUUID();
            helper_script.addEventListener('load', () => {
                column_window.document.dispatchEvent(new CustomEvent('opd_send_media_info_init', {
                    bubbles: true,
                    composed: true,
                    detail: JSON.stringify({ token: this.opd_send_media_info_token })
                }));
            });

            column_window.document.head.appendChild(helper_script);
        }
    }
}