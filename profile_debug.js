window.addEventListener("load", function(){
    document.getElementById("output_profile_btn").addEventListener("click", function(){
        console.log("output");
        chrome.storage.local.get("opd_settings", function(value){
            document.getElementById("profile_output_area").value = value.opd_settings;
        });
    });
    document.getElementById("input_profile_btn").addEventListener("click", function(){
        console.log("input");
        if(document.getElementById("profile_input_area").value.length != 0){
            chrome.storage.local.set({'opd_settings': document.getElementById("profile_input_area").value}, function () {
                alert("読み込み完了しました。Open-Deckの画面を再読み込みしてください。")
            });
        }
    });
});