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
        console.log(ext_settings);
        run(ext_settings);
    });
}
function run(settings){
    //カラム要素作成-挿入
    let default_element_bar = `&nbsp;<select class="opd_tw_view_mode" row_tw_view_mode_val="%row_tw_view_mode%"><option value="0">All</option><option value="1">Text</option><option value="2">Media</option></select>&nbsp;<span>Banner<input class="opd_banner" type="checkbox" %row_banner_ch%></span>`;
    let default_element = {
        main_bar_empty_row:{html:`<div draggable="false" opd_row_type="main_bar_empty_row" id="main_bar_empty_row" class="dsp_row" style="height: calc(100% - 20px);min-width: 110px;"></div>`},
        empty_row:{html:`<div draggable="false" opd_row_type="empty_row" id="row_%row_num%" class="dsp_row dsp_row_emptyrow" style="height: calc(100% - 20px);min-width: 30rem;display: flex;align-items: center;justify-content: center;"><p>左のバーからカラムを追加</p></div>`},
        home:{html:`<div draggable="true" opd_row_type="home" id="row_%row_num%" class="dsp_row" style="height: calc(100% - 20px);min-width: 30rem;"><div style="border: solid #00000073 1px; height: 20px;">≡ Home${default_element_bar}<input type="button" class="row_close_btn" value="X" style="margin-left: 14.4rem;vertical-align: text-top;font-size: 0.8rem;"/></div><object data="https://twitter.com/home" type="text/html" style="width: 100%;height: 100%;"></object></div>`},
        notification:{html:`<div draggable="true" opd_row_type="notification" id="row_%row_num%" class="dsp_row" style="height: calc(100% - 20px);min-width: 30rem;"><div style="border: solid #00000073 1px; height: 20px;">≡ Notification${default_element_bar}<input type="button" class="row_close_btn" value="X" style="margin-left: 11.8rem;vertical-align: text-top;font-size: 0.8rem;"/></div><object data="https://twitter.com/notifications" type="text/html" style="width: 100%;height: 100%;"></object></div>`},
        explore:{html:`<div draggable="true" opd_row_type="explore" opd_explore_path="%row_save_path%" id="row_%row_num%" class="dsp_row" style="height: calc(100% - 20px);min-width: 30rem;"><div style="border: solid #00000073 1px; height: 20px;">≡ Explore${default_element_bar}<input type="button" class="row_close_btn" value="X" style="margin-left: 13.6rem;vertical-align: text-top;font-size: 0.8rem;"/></div><object data="https://twitter.com%row_save_path%" type="text/html" style="width: 100%;height: 100%;"></object></div>`},
    };
    let ins_html = document.createElement("div");
    ins_html.id = "opd_main_element";
    ins_html.style = "position: fixed;z-index: 999999;width: 100%;height: 100%;background: white;display: flex;flex-direction: row;overflow-x: scroll;overflow-y: hidden;";
    let settings_html = `<div draggable="false" opd_row_type="dsp_row" class="dsp_row" style="height: calc(100% - 20px);min-width: 100px;text-align: center;position: fixed;background-color: white;"><div><p>Open-Deck<br>Prototype<br>v${chrome.runtime.getManifest().version}</p><hr><p>Debug<br><input type="button" id="init_settings" value="init settings"/><br><input type="button" id="dnr_reload" value="dNR_Reload"/><br><input type="button" id="ext_reload" value="Ext_Reload"/></p><hr><p><input type="button" id="add_timeline" value="Add TimeLine"/></p><p><input type="button" id="add_notify" value="Add Notification"/></p><p><input type="button" id="add_explore" value="Add Explore"/></p></div></div>`;
    console.log(settings.row_settings.length)
    for (let index = 0; index < settings.row_settings.length; index++) {
        //console.log(default_element)
        for (let default_index = 0; default_index < Object.keys(default_element).length; default_index++) {
            //console.log(settings.row_settings[index].type+"-"+Object.keys(default_element))
            if(settings.row_settings[index].type == Object.keys(default_element)[default_index]){
                //console.log(default_element[Object.keys(default_element)[default_index]]["html"])
                let banner_checked = "";
                let init_row_save_path = settings.row_settings[index].row_save_path;
                let tw_view_type = settings.row_settings[index].tw_view_mode;
                if(settings.row_settings[index].banner == true){
                    banner_checked = "checked";
                }
                settings_html += default_element[Object.keys(default_element)[default_index]]["html"].replaceAll("%row_save_path%", init_row_save_path).replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", banner_checked).replace("%row_tw_view_mode%", tw_view_type);
            }
        }
    }
    ins_html.innerHTML = settings_html;
    document.body.insertAdjacentElement("afterbegin", ins_html);
    row_dd();
    row_close();
    append_object_css();
    //CSS適用(追加/変更の時に呼び出し)
    function append_object_css(){
        let row_object = document.querySelectorAll('.dsp_row:not([opd_row_type="dsp_row"], [opd_row_type="empty_row"], [opd_row_type="main_bar_empty_row"]) object');
        for (let index = 0; index < row_object.length; index++) {
            //各カラム読み込み後の動作
            row_object[index].addEventListener("load", function(){
                let opd_row_div = this.closest("div[opd_row_type]");
                let opd_row_banner_checkbox = opd_row_div.querySelector(".opd_banner");
                let opd_row_tw_view_mode_opt = opd_row_div.querySelector(".opd_tw_view_mode");
                //バナー表示設定読み込み適用
                if(opd_row_banner_checkbox.checked == true){
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                }else{
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css>header[role="banner"]{content-visibility:hidden; }</style>`);
                }
                //ツイート表示項目設定読み込み適用
                if(this.contentWindow.document.querySelector("head style[opd_tw_view_mode_css]")?.textcontent == undefined){
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_tw_view_mode_css></style>`);
                }
                switch (opd_row_tw_view_mode_opt.value) {
                    case "0":
                        this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                        break;
                    case "1":
                        this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:has(div[aria-labelledby]){content-visibility:hidden; }`;
                        break;
                    case "2":
                        this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:not(:has(div[aria-labelledby])){content-visibility:hidden; }`;
                        break;
                    default:
                        this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                        break;
                }
                //console.log(opd_row_div.querySelector(".opd_banner").checked)
                //バナーチェックイベント
                opd_row_banner_checkbox.addEventListener("change", function(){
                    row_settings_save();
                    //console.log(this.closest("div[opd_row_type]").querySelector("object"))
                    let banner_mode_target_object = this.closest("div[opd_row_type]").querySelector("object");
                    if(banner_mode_target_object.contentWindow.document.querySelector('head style[opd_banner_css]')?.textcontent == undefined){
                        banner_mode_target_object.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                    }
                    if(this.checked != true){
                        //console.log(this)
                        banner_mode_target_object.contentWindow.document.querySelector('head style[opd_banner_css]').textContent = `header[role="banner"]{display:none};`;
                    }else{
                        //console.log("else")
                        banner_mode_target_object.contentWindow.document.querySelector('head style[opd_banner_css]').textContent = ``;
                    }
                });
                //ツイート表示モードイベント
                opd_row_tw_view_mode_opt.addEventListener("change", function(){
                    row_settings_save();
                    //console.log(this.closest("div[opd_row_type]").querySelector("object"))
                    let tw_view_mode_target_object = this.closest("div[opd_row_type]").querySelector("object");
                    //console.log(this.value)
                    if(tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]')?.textcontent == undefined){
                        tw_view_mode_target_object.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_tw_view_mode_css></style>`);
                    }
                    switch (this.value) {
                        case "0":
                            tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                            break;
                        case "1":
                            tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:has(div[aria-labelledby]){content-visibility:hidden; }`;
                            break;
                        case "2":
                            tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:not(:has(div[aria-labelledby])){content-visibility:hidden; }`;
                            break;
                        default:
                            tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                            break;
                    }
                })
                //explore内容検出/保存
                if(opd_row_div.getAttribute("opd_row_type") == 'explore'){
                    let exp_object = opd_row_div.querySelector("object");
                    let exp_old_url = exp_object.contentWindow.location.href;
                    let exp_observer = new MutationObserver(function(){
                        if(exp_old_url != exp_object.contentWindow.location.href){
                            let exp_url = new URL(exp_object.contentWindow.location.href);
                            //console.log(`${exp_url.pathname}${exp_url.search}`);
                            opd_row_div.setAttribute("opd_explore_path", `${exp_url.pathname}${exp_url.search}`);
                            row_settings_save();
                            exp_old_url = exp_object.contentWindow.location.href;
                        }
                    });
                    exp_observer.observe(exp_object.contentWindow.document, {childList: true, subtree: true});
                }
            })
        }
    }
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
        const new_row = default_element["home"]["html"].replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_tw_view_mode%", "0");;
        document.querySelector(".dsp_row_emptyrow").insertAdjacentHTML("beforebegin", new_row);
        document.querySelector(".dsp_row_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
        append_object_css();
        row_dd();
        row_close();
        row_settings_save();
    });
    document.getElementById("add_notify").addEventListener("click", function(){
        const new_row = default_element["notification"]["html"].replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_tw_view_mode%", "0");;
        document.querySelector(".dsp_row_emptyrow").insertAdjacentHTML("beforebegin", new_row);
        document.querySelector(".dsp_row_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
        append_object_css();
        row_dd();
        row_close();
        row_settings_save();
    });
    document.getElementById("add_explore").addEventListener("click", function(){
        const new_row = default_element["explore"]["html"].replaceAll("%row_save_path%", "/explore").replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_tw_view_mode%", "0");
        document.querySelector(".dsp_row_emptyrow").insertAdjacentHTML("beforebegin", new_row);
        document.querySelector(".dsp_row_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
        append_object_css();
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
                append_object_css();
                row_dd();
                row_settings_save();
            })
        }
    }
    //カラム終了
    function row_close(){
        for (let index = 0; index < document.querySelectorAll(".row_close_btn").length; index++) {
            document.querySelectorAll(".row_close_btn")[index].addEventListener("click", function(){
                this.closest("[class='dsp_row']").remove();
                append_object_css();
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
        for (let index = 0; index < document.querySelectorAll("#opd_main_element div[opd_row_type]").length; index++) {
            let banner_checked = null;
            let tw_view_type = null;
            let row_open_path = null;
            if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].querySelector(".opd_banner")?.checked == true){
                banner_checked = true;
            }else{
                banner_checked = false;
            }
            if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].querySelector(".opd_tw_view_mode")?.value != undefined){
                tw_view_type = document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].querySelector(".opd_tw_view_mode").value;
            }else{
                tw_view_type = "0";
            }
            //exploreの処理
            if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_type") == 'explore'){
                //console.log(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_explore_path"));
                row_open_path = document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_explore_path");
            }else{
                row_open_path = "";
            }
            settings_array["row_settings"].push({type:document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_type"), banner:banner_checked, tw_view_mode:tw_view_type, row_save_path:row_open_path});
        }
        //console.log(settings_array);
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
        row_settings:[{type:"main_bar_empty_row", banner:false, tw_view_mode:"0", row_save_path:""}, {type:"home", banner:true, tw_view_mode:"0", row_save_path:""}, {type:"notification", banner:false, tw_view_mode:"0", row_save_path:""}, {type:"explore", banner:false, tw_view_mode:"0", exp_type:"", row_save_path:"/explore"}, {type:"empty_row", banner:false, tw_view_mode:"0", row_save_path:""}],
        version:chrome.runtime.getManifest().version
    };
    chrome.storage.local.set({'opd_settings': JSON.stringify(settings)}, function () {
        alert("初期設定構築が完了しました。");
        location.reload();
    });
}