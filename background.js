chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request.message == "dnr_upd"){
            chrome.declarativeNetRequest.updateEnabledRulesets(({disableRulesetIds: ["ruleset_1"]})).then((val)=>{
                chrome.declarativeNetRequest.updateEnabledRulesets(({enableRulesetIds: ["ruleset_1"]})).then((value)=>{
                    console.log("dnr_update_ok");
                    sendResponse(true);
                })
            })
        }
        if(request.message == "ext_reload"){
            chrome.runtime.reload();
        }
        return true;
    }
);