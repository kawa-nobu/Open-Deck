/* 
/run-opdeck の時点でベースページの読み込みを阻止する。
window.stop()を使うと、onloadイベントがブラウザプロセスへ飛ばなくなり、
ブラウザ側がfavicon更新を破棄して差し替わらないので、
使わない方法を採用した。
faviconはChromiumが初期headロード時、
Firefoxはロード完了後を見るため、二重で設定している。
*/
(() => {
  if (location.pathname !== "/run-opdeck") return;

  //自前のheadとbodyを作成
  const head = document.createElement("head");
  head.dataset.opd = "1";
  const body = document.createElement("body");
  body.dataset.opd = "1";

  //favicon用link作成
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = chrome.runtime.getURL("icon.png");
  link.dataset.opd = "1";
  head.appendChild(link);

  //title作成
  const title = document.createElement("title");
  title.dataset.opd = "1";
  title.textContent = "Open-Deck";
  head.appendChild(title);

  //作成したheadとbodyを差し替える
  document.documentElement.replaceChildren(head, body);

  //差し替え後もパーサーが元のscriptやhead/bodyを挿し込むので、実行・反映前に消すために監視する
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      //追加されたノードをチェックする
      for (const node of mutation.addedNodes) {
        //テキストノードやコメントは対象外とする
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        //元ページのlinkは不要なので消す
        if (node.tagName === "LINK" && node.dataset.opd !== "1") {
          node.remove();
          continue;
        }

        //scriptを除去して元のスクリプト実行を阻止する
        if (node.tagName === "SCRIPT") {
          node.remove();
          continue;
        }

        //OPD範囲外のheadやbodyが存在している場合は消す
        if (
          (node.tagName === "HEAD" || node.tagName === "BODY") &&
          node.dataset.opd !== "1"
        ) {
          node.remove();
        }
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  //監視を続けるとcontent側まで巻き込むため、役目が終わり次第破棄する
  document.addEventListener("DOMContentLoaded", () => observer.disconnect(), {
    once: true,
  });

  //Firefox対策(Firefoxは先読み時点でfaviconを確定する様なので、ロード完了後に作り直して差し替える)
  addEventListener("load", () => {
    const new_icon = link.cloneNode();
    link.remove();
    document.head.appendChild(new_icon);
  }, { once: true });
})();
