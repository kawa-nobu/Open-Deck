const EXTENSION_DOMAIN = new URL(chrome.runtime.getURL('')).hostname;

//インストール時にあらかじめDNRを設定しておく
chrome.runtime.onInstalled.addListener(() => {
    update_dnr();
})

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request.message == "dnr_upd"){
            update_dnr();
            sendResponse(true);
        }
        if(request.message == "text_review"){
            const api_url = "https://opd.kwdev-sys.com/api/opd/text_review/review";
            (async () => {
                try{
                    const res = await fetch(api_url, {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({"text":request.review_text}),
                    });

                    if(!res.ok){
                        console.error(`ReviewFetchError->Code:${res.status}->Text:${res.statusText}`);
                        sendResponse(false);
                    }
                    sendResponse(await res.json());
                }catch(error){
                    console.error("Fetch failed:", error);
                    sendResponse(false);
                }
            })();
        }
        if(request.message == "ext_reload"){
            chrome.runtime.reload();
        }
        return true;
    }
)
//
let access_limit = {
    search:{limit: null, remaining: null, reset_unix_time: null}, 
    time_line:{limit: null, remaining: null, reset_unix_time: null}, 
    recommend_timeline:{limit: null, remaining: null, reset_unix_time: null}
};
function send_content_script(value){
    //chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });//firefoxではsession.setAccessLevel()が未対応なのでsessionは一旦お預け
    //chrome.storage.session.set
    chrome.storage.local.set({api_access_limit: value}, function(){
        console.log("set ok");
      });
    /*chrome.storage.local.set({api_access_limit: value}).then(() => {
        console.log("set ok");
      });*/
}
chrome.webRequest.onHeadersReceived.addListener(function (resp) {
      if(resp.url.search(/SearchTimeline/g) != -1){
        //console.log(resp);
        for (let index = 0; index < resp.responseHeaders.length; index++) {
            switch (resp.responseHeaders[index].name) {
                case "x-rate-limit-remaining":
                    access_limit.search.remaining = resp.responseHeaders[index].value;
                    break;
                case "x-rate-limit-limit":
                    access_limit.search.limit = resp.responseHeaders[index].value;
                    break;
                case "x-rate-limit-reset":
                    access_limit.search.reset_unix_time = resp.responseHeaders[index].value;
                    break;
                default:
                    break;
            }
        }
        //(access_limit);
        send_content_script(access_limit);
      }
      if(resp.url.search(/HomeLatestTimeline/g) != -1){
        //console.log(resp);
        for (let index = 0; index < resp.responseHeaders.length; index++) {
            switch (resp.responseHeaders[index].name) {
                case "x-rate-limit-remaining":
                    access_limit.time_line.remaining = resp.responseHeaders[index].value;
                    break;
                case "x-rate-limit-limit":
                    access_limit.time_line.limit = resp.responseHeaders[index].value;
                    break;
                case "x-rate-limit-reset":
                    access_limit.time_line.reset_unix_time = resp.responseHeaders[index].value;
                    break;
                default:
                    break;
            }
        }
        //console.log(access_limit)
        send_content_script(access_limit);
      }
      if(resp.url.search(/HomeTimeline/g) != -1){
        //console.log(resp);
        for (let index = 0; index < resp.responseHeaders.length; index++) {
            switch (resp.responseHeaders[index].name) {
                case "x-rate-limit-remaining":
                    access_limit.recommend_timeline.remaining = resp.responseHeaders[index].value;
                    break;
                case "x-rate-limit-limit":
                    access_limit.recommend_timeline.limit = resp.responseHeaders[index].value;
                    break;
                case "x-rate-limit-reset":
                    access_limit.recommend_timeline.reset_unix_time = resp.responseHeaders[index].value;
                    break;
                default:
                    break;
            }
        }
        //console.log(access_limit)
        send_content_script(access_limit);
      }
    },{urls: ['*://x.com/i/api/*']},['responseHeaders']
  );

function update_dnr(){
    const dnr_rules = [
        {
            id : 1,
            priority: 1,
            action: {
                type: "modifyHeaders",
                responseHeaders: [
                    {
                        header: "Content-Security-Policy",
                        operation: "remove"
                    },
                    {
                        header: "X-Frame-Options",
                        operation: "remove"
                    }
                ]
            },
            condition : {
                requestDomains: ["x.com", "twitter.com"],
                initiatorDomains: [EXTENSION_DOMAIN, "x.com", "twitter.com"],
                resourceTypes: ["main_frame",
                "sub_frame",
                "stylesheet",
                "script",
                "image",
                "font",
                "object",
                "xmlhttprequest",
                "ping",
                "csp_report",
                "media",
                "websocket",
                "other"]
            }
        },
    ];
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: dnr_rules,
    }, function(){
        console.log("dnr_update_ok");
    });
}