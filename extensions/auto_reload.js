// 自動更新機能で使用
class OpdExtAutoReload {
    constructor() {
        this.opd_reload_token = null;
        this.Init = (column_frame) => {
            const column_window = column_frame.contentWindow;
            //ヘルパースクリプト追加
            const helper_script = column_window.document.createElement('script');
            helper_script.src = chrome.runtime.getURL("extensions/auto_reload_helper.js");
            column_window.document.head.appendChild(helper_script);

            this.opd_reload_token = crypto.randomUUID();
            setTimeout(() => {
                column_window.document.dispatchEvent(new CustomEvent('opd_column_reload_init', {
                    detail: JSON.stringify({ token:this.opd_reload_token })
                }));
            }, 10);
        }
        this.Reload = (column_window)=>{
            if (!this.opd_reload_token) return false;
            column_window.document.dispatchEvent(new CustomEvent('opd_column_reload', {
                bubbles: true,
                composed: true,
                detail: JSON.stringify({ token:this.opd_reload_token })
            }));
        }
    }
}