const EXTENSION_DOMAIN = new URL(chrome.runtime.getURL('')).hostname;

//インストール時にあらかじめDNRを設定しておく
chrome.runtime.onInstalled.addListener(() => {
    (async () => {
        await update_dnr();
    })();
})

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request.message == "dnr_upd"){
            (async () => {
                try {
                    await update_dnr();
                    console.log("dnr_update_ok");
                    sendResponse(true);
                } catch(e) {
                    console.error("dnr update failed->", e);
                    sendResponse(false);
                }
            })();
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
                        return;
                    }
                    sendResponse(await res.json());
                }catch(error){
                    console.error("Fetch failed:", error);
                    sendResponse(false);
                    return;
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
    let category = null;
    if(resp.url.includes("SearchTimeline")){
        category = "search";
    }else if(resp.url.includes("HomeLatestTimeline")){
        category = "time_line";
    }else if(resp.url.includes("HomeTimeline")){
        category = "recommend_timeline";
    }

    if (!category) return;

    for(const header of resp.responseHeaders){
        switch (header.name) {
            case "x-rate-limit-remaining":
                access_limit[category].remaining = header.value;
                break;
            case "x-rate-limit-limit":
                access_limit[category].limit = header.value;
                break;
            case "x-rate-limit-reset":
                access_limit[category].reset_unix_time = header.value;
                break;
        }
    }

    send_content_script(access_limit);
}, { urls: [
    '*://x.com/i/api/graphql/*/SearchTimeline*',
    '*://x.com/i/api/graphql/*/HomeLatestTimeline*',
    '*://x.com/i/api/graphql/*/HomeTimeline*'
] }, ['responseHeaders']);


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
                resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "script", "stylesheet"]
            }
        },
    ];
    
    return chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: dnr_rules,
    });
}