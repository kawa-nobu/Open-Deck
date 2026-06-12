// メディアビューワー停止用
class OpdUtils {
    constructor() {
        this.Init = (column_frame) => {
            const column_window = column_frame.contentWindow;
            //ヘルパースクリプト追加
            const helper_script = column_window.document.createElement('script');
            helper_script.src = chrome.runtime.getURL("extensions/utils_helper.js");
            column_window.document.head.appendChild(helper_script);
        }
    }
}