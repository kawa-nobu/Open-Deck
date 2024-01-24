window.addEventListener("load", function(){
    document.getElementById("output_profile_btn").addEventListener("click", function(){
        console.log("output");
        chrome.storage.local.get("opd_profile_store", function(value){
            document.getElementById("profile_output_area").value = value.opd_profile_store;
        });
    });
    document.getElementById("input_profile_btn").addEventListener("click", function(){
        console.log("input");
        if(document.getElementById("profile_input_area").value.length != 0){
            if(document.querySelector("#is_ver105").checked){
                if(confirm("入力したデータデータはv1.0.5以前のもので合っている場合は続行してください")){
                    /*chrome.storage.local.set({'opd_profile_store': JSON.stringify(profile)}, function () {
                    });*/
                    const input_data = JSON.parse(document.getElementById("profile_input_area").value);
                    console.log(input_data.row_settings)
                    chrome.storage.local.set({'opd_profile_store': JSON.stringify([{name:"default", profile: input_data.row_settings}])}, function () {
                        chrome.storage.local.get("opd_settings", function(value){
                            let load_setting = JSON.parse(value.opd_settings);
                            load_setting.last_load_profile = 0;
                            chrome.storage.local.set({'opd_settings': JSON.stringify(load_setting)}, function () {
                                alert("読み込み完了しました。Open-Deckの画面を再読み込みしてください。")
                            });
                        });
                        
                    });
                }
            }else{
                chrome.storage.local.set({'opd_profile_store': document.getElementById("profile_input_area").value}, function () {
                    chrome.storage.local.get("opd_settings", function(value){
                        let load_setting = JSON.parse(value.opd_settings);
                        load_setting.last_load_profile = 0;
                        chrome.storage.local.set({'opd_settings': JSON.stringify(load_setting)}, function () {
                            alert("読み込み完了しました。Open-Deckの画面を再読み込みしてください。")
                        });
                    });
                });
            }
        }
    });
});