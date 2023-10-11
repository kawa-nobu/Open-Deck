if(location.href == "https://twitter.com/run-opdeck"){
    chrome.runtime.sendMessage({message: "dnr_upd"});
    console.log("op");
    chrome.storage.local.get("opd_settings", function(value){
        let ext_update_flag = null;
        let ext_settings = null;
        if(value.opd_settings != undefined){
            if(JSON.parse(value.opd_settings).version != chrome.runtime.getManifest().version){
                ext_update_flag = true;
            }else{
                ext_update_flag = false;
            }
        }
        
        if(value.opd_settings == undefined || ext_update_flag == true){
            settings_init();
            ext_settings = JSON.parse(value.opd_settings);
        }else{
            ext_settings = JSON.parse(value.opd_settings);
        }
        console.log(ext_settings)
        run(ext_settings);
    });
}
function run(settings){
    //カラム要素作成-挿入
    let default_element = {
        main_bar_empty_row:{html:`<div draggable="false" opd_row_type="main_bar_empty_row" id="main_bar_empty_row" class="dsp_row" style="height: calc(100% - 20px);min-width: 110px;"></div>`},
        empty_row:{html:'<div draggable="false" opd_row_type="empty_row" id="row_%row_num%" class="dsp_row dsp_row_emptyrow" style="height: calc(100% - 20px);min-width: 30rem;display: flex;align-items: center;justify-content: center;"><p>左のバーからカラムを追加</p></div>'},
        home:{html:'<div draggable="true" opd_row_type="home" id="row_%row_num%" class="dsp_row" style="height: calc(100% - 20px);min-width: 30rem;"><div style="border: solid #00000073 1px; height: 20px;">≡ Home<input type="button" class="row_close_btn" value="X" style="margin-left: 24rem;vertical-align: text-top;font-size: 0.8rem;"/></div><object data="https://twitter.com/home" type="text/html" style="width: 100%;height: 100%;"></object></div>'},
        notification:{html:'<div draggable="true" opd_row_type="notification" id="row_%row_num%" class="dsp_row" style="height: calc(100% - 20px);min-width: 30rem;"><div style="border: solid #00000073 1px; height: 20px;">≡ Notification<input type="button" class="row_close_btn" value="X" style="margin-left: 21.4rem;vertical-align: text-top;font-size: 0.8rem;"/></div><object data="https://twitter.com/notifications" type="text/html" style="width: 100%;height: 100%;"></object></div>'},
        explore:{html:'<div draggable="true" opd_row_type="explore" id="row_%row_num%" class="dsp_row" style="height: calc(100% - 20px);min-width: 30rem;"><div style="border: solid #00000073 1px; height: 20px;">≡ Explore<input type="button" class="row_close_btn" value="X" style="margin-left: 23.3rem;vertical-align: text-top;font-size: 0.8rem;"/></div><object data="https://twitter.com/explore" type="text/html" style="width: 100%;height: 100%;"></object></div>'},
    };
    let ins_html = document.createElement("div");
    ins_html.id = "opd_main_element";
    ins_html.style = "position: fixed;z-index: 999999;width: 100%;height: 100%;background: white;display: flex;flex-direction: row;overflow-x: scroll;overflow-y: hidden;";
    let settings_html = `<div draggable="false" class="dsp_row" style="height: calc(100% - 20px);min-width: 100px;text-align: center;position: fixed;background-color: white;"><div><p>Open-Deck<br>Prototype<br>v${chrome.runtime.getManifest().version}</p><hr><p>Debug<br><input type="button" id="init_settings" value="init settings"/><br><input type="button" id="dnr_reload" value="dNR_Reload"/><br><input type="button" id="ext_reload" value="Ext_Reload"/></p><hr><p><input type="button" id="add_timeline" value="Add TimeLine"/></p><p><input type="button" id="add_notify" value="Add Notification"/></p><p><input type="button" id="add_explore" value="Add Explore"/></p></div></div>`;
    console.log(settings.row_settings.length)
    for (let index = 0; index < settings.row_settings.length; index++) {
        //console.log(default_element)
        for (let default_index = 0; default_index < Object.keys(default_element).length; default_index++) {
            //console.log(settings.row_settings[index].type+"-"+Object.keys(default_element))
            if(settings.row_settings[index].type == Object.keys(default_element)[default_index]){
                //console.log(default_element[Object.keys(default_element)[default_index]]["html"])
                settings_html += default_element[Object.keys(default_element)[default_index]]["html"].replaceAll("%row_num%", create_random_id());
            }
        }
    }
    ins_html.innerHTML = settings_html;
    console.log(ins_html)
    document.body.insertAdjacentElement("afterbegin", ins_html);
    row_dd();
    row_close();
    //メインバーイベント
    document.getElementById("init_settings").addEventListener("click", function(){
        chrome.storage.local.remove("opd_settings", function(value){
            alert("設定を初期化しました。再読み込みしてください。");
        });
    });
    document.getElementById("dnr_reload").addEventListener("click", function(){
        if(confirm("declarativeNetRequestの再読み込みします")){
            chrome.runtime.sendMessage({message: "dnr_upd"}).then((value)=>{
                if(value == true){
                    location.reload();
                }
            });
        }
    });
    document.getElementById("ext_reload").addEventListener("click", function(){
        if(confirm("拡張機能の再読み込みします")){
            chrome.runtime.sendMessage({message: "ext_reload"});
        }
    });
    document.getElementById("add_timeline").addEventListener("click", function(){
        const new_row = default_element["home"]["html"].replaceAll("%row_num%", create_random_id());
        document.querySelector(".dsp_row_emptyrow").insertAdjacentHTML("beforebegin", new_row);
        document.querySelector(".dsp_row_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
        row_dd();
        row_close();
        row_settings_save();
    });
    document.getElementById("add_notify").addEventListener("click", function(){
        const new_row = default_element["notification"]["html"].replaceAll("%row_num%", create_random_id());
        document.querySelector(".dsp_row_emptyrow").insertAdjacentHTML("beforebegin", new_row);
        document.querySelector(".dsp_row_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
        row_dd();
        row_close();
        row_settings_save();
    });
    document.getElementById("add_explore").addEventListener("click", function(){
        const new_row = default_element["explore"]["html"].replaceAll("%row_num%", create_random_id());
        document.querySelector(".dsp_row_emptyrow").insertAdjacentHTML("beforebegin", new_row);
        document.querySelector(".dsp_row_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
        row_dd();
        row_close();
        row_settings_save();
    });
    //カラム移動
    function row_dd(){
        let row_class = document.querySelectorAll(".dsp_row");
        for (let index = 0; index < row_class.length; index++) {
            row_class[index].addEventListener("dragstart", function(ev){
                ev.dataTransfer.setData('text/plain', ev.target.id);
            });
            row_class[index].addEventListener("dragover", function(ev){
                ev.preventDefault();
                this.style.borderLeft = '5px solid rgba(0, 0, 0, 0.500)';
            });
            row_class[index].addEventListener("dragleave", function(){
                this.style.borderLeft = '';
            });
            row_class[index].addEventListener("drop", function(ev){
                ev.preventDefault();
                const dt_id = ev.dataTransfer.getData('text/plain');
                const dr_elem = document.getElementById(dt_id);
                this.parentNode.insertBefore(dr_elem, this);
                this.style.borderLeft = '';
                row_settings_save();
            })
        }
    }
    //カラム終了
    function row_close(){
        for (let index = 0; index < document.querySelectorAll(".row_close_btn").length; index++) {
            document.querySelectorAll(".row_close_btn")[index].addEventListener("click", function(){
                this.closest("[class='dsp_row']").remove();
                row_dd();
                row_settings_save();
            })
            
        }
    }
    //カラム構成保存
    function row_settings_save(){
        let settings_array = {
            row_settings:[],
            version:chrome.runtime.getManifest().version
        };
        for (let index = 0; index < document.getElementById("opd_main_element").querySelectorAll("div[opd_row_type]").length; index++) {
            settings_array["row_settings"].push({type:document.getElementById("opd_main_element").querySelectorAll("div[opd_row_type]")[index].getAttribute("opd_row_type"), banner:false});
        }
        console.log(settings_array);
        chrome.storage.local.set({'opd_settings': JSON.stringify(settings_array)}, function () {
            console.log(settings_array);
        });
    }
    //ランダムID作成
    function create_random_id(){
        return Math.random().toString(32).substring(2);
    }
    //メインX動作マスク
    function main_dsp(){
        document.title = "Open-Deck(ProtoType)";
        document.querySelector('link[rel="shortcut icon"]').href = chrome.runtime.getURL("icon.png")
        document.getElementById("react-root").style.visibility = "hidden";
        document.getElementById("react-root").style.overflow = "hidden";
    }
    const target_elem = document.getElementById("react-root");
    const observer = new MutationObserver(main_dsp);
    observer.observe(target_elem,{
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true,
        attributeOldValue: true,
        characterDataOldValue: true
    });
}
//設定初期化
function settings_init(){
    const settings = {
        row_settings:[{type:"main_bar_empty_row", banner:false}, {type:"home", banner:true}, {type:"notification", banner:false}, {type:"explore", banner:false}, {type:"empty_row", banner:false}],
        version:chrome.runtime.getManifest().version
    };
    chrome.storage.local.set({'opd_settings': JSON.stringify(settings)}, function () {
        alert("初期設定構築が完了しました。");
        location.reload();
    });
}