const url_path = new URL(location.href);
let profile_store;
let last_load_profile;
if(location.href == "https://twitter.com/run-opdeck"){
    //testmode
    if(url_path.pathname == "/opd_run_testmode.html"){
        init();
        /*chrome.runtime.sendMessage({message: "ext_page_load_dnr"}).then((value)=>{
            init();
        });*/
    }else{
        if(navigator.brave != undefined){
            init();
        }else{
            chrome.runtime.sendMessage({message: "dnr_upd"}).then((value)=>{
                init();
            });
        }
    }
    //chrome.runtime.sendMessage({message: "dnr_upd"});
    function init(){
        console.log("Welcome to Open-Deck!");
        chrome.storage.local.get("opd_settings", function(value){
            if(value.opd_settings == undefined){
                last_load_profile = 0;
                settings_init();
            }else{
                last_load_profile = JSON.parse(value.opd_settings).last_load_profile;
                console.log(last_load_profile);
            }
            
            chrome.storage.local.get("opd_profile_store", function(store_value){
                console.log(store_value)
                console.log(JSON.parse(store_value.opd_profile_store))
                profile_store = JSON.parse(store_value.opd_profile_store);
                //RUN
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
                    //settings_init();
                    //ext_settings = JSON.parse(value.opd_settings);
                    ext_settings = {row_settings:profile_store[last_load_profile].profile};
                }else{
                    //ext_settings = JSON.parse(value.opd_settings);
                    ext_settings = {row_settings:profile_store[last_load_profile].profile};
                }
                console.log(ext_settings);
                run(ext_settings);
            });
        });
    }
}
function run(settings){
    console.log(settings)
    let profile_list_html;
    let profile_list_btn_html = "";
    //プロファイルリスト初期化
    for (let index = 0; index < profile_store.length; index++) {
        profile_list_btn_html += `<input type="button" id="userProfile-${index}" value="P${index}"><br>`;
    }
    profile_list_html = `<div><p>Now:${last_load_profile}</p><div id="profile_btn_list">${profile_list_btn_html}</div></div>`;
    //console.log(profile_list_btn_html)
    //CSSタグ追加
    document.querySelector("head").insertAdjacentHTML("afterbegin", `<style second_row_css></style><style opd_default_css>html{overflow-y:hidden !important}#main_rack_element{position: fixed;left:110px;height:100vh;max-width:calc(100vw - 110px);width:calc(100vw - 110px);overflow:scroll hidden;}/*#main_rack_element section:first-child{margin-left:110px}*/</style>`)
    //カラム要素作成-挿入
    let default_element_bar = `&nbsp;<select class="opd_tw_view_mode" row_tw_view_mode_val="%row_tw_view_mode%"><option value="0">All</option><option value="1">Text</option><option value="2">Media</option></select><input type="button" class="row_width_btn" value="W" style="vertical-align: text-top;font-size: 0.8rem;"/>&nbsp;<span>Banner<input class="opd_banner" type="checkbox" %row_banner_ch%></span>&nbsp;<span>Top<input class="opd_top_bar" type="checkbox" %row_top_bar_ch%></span>`;
    let default_element = {
        main_bar_empty_row:{html:`<!--<section draggable="false" class="dsp_row"><div opd_row_type="main_bar_empty_row" opd_row_width="%row_width_num%" id="main_bar_empty_row" style="height:100%;min-width: 110px;"></div></section>-->`},
        empty_row:{html:`<section draggable="false" id="row_%row_num%" class="dsp_row dsp_row_emptyrow"><div opd_row_type="empty_row" opd_row_width="%row_width_num%" style="height: 100%;min-width: 30rem;display: flex;align-items: center;justify-content: center;"><p>左のバーからカラムを追加</p></div></section>`},
        second_empty_row:{html:`<section draggable="false" id="row_%row_num%" class="dsp_row dsp_row_second_emptyrow"><div opd_row_type="second_empty_row" opd_row_width="%row_width_num%" style="height:100%;min-width: 30rem;display: flex;align-items: center;justify-content: center;"><p>2段目<br>1段目のカラムが配置できます</p></div></section>`},
        home:{html:`<section draggable="true" id="row_%row_num%" class="dsp_row"><div opd_row_type="home" opd_row_width="%row_width_num%" style="height: 100%;width: %row_width_num%rem;min-width: 1rem;"><div class="column_bar" style="border: solid #00000073 1px; height: 20px;">≡ Home${default_element_bar}<input type="button" class="row_close_btn" value="X" style="margin-left: 9.5rem;vertical-align: text-top;font-size: 0.8rem;"/></div><iframe allow="fullscreen" src="https://twitter.com/home" type="text/html" style="width: 100%;height: 100%;"></iframe></div></section>`},
        notification:{html:`<section draggable="true" id="row_%row_num%" class="dsp_row"><div opd_row_type="notification" opd_row_width="%row_width_num%" style="height: 100%;width: %row_width_num%rem;min-width: 1rem;"><div class="column_bar" style="border: solid #00000073 1px; height: 20px;">≡ Notification${default_element_bar}<input type="button" class="row_close_btn" value="X" style="margin-left: 6.8rem;vertical-align: text-top;font-size: 0.8rem;"/></div><iframe allow="fullscreen" src="https://twitter.com/notifications" type="text/html" style="width: 100%;height: 100%;"></iframe></div></section>`},
        explore:{html:`<section draggable="true" id="row_%row_num%" class="dsp_row"><div opd_row_type="explore" opd_row_width="%row_width_num%" opd_explore_path="%row_save_path%" opd_pinned_path="%row_pinned_save_path%" style="height: 100%;width: %row_width_num%rem;min-width: 1rem;"><div class="column_bar" style="border: solid #00000073 1px; height: 20px;">≡ Explore${default_element_bar}<span>Pin<input class="opd_pinned_btn" type="checkbox" %row_pinned_ch%></span><input type="button" class="row_close_btn" value="X" style="margin-left: 5.9rem;vertical-align: text-top;font-size: 0.8rem;"/></div><iframe allow="fullscreen" src="https://twitter.com%row_save_path%" type="text/html" style="width: 100%;height: 100%;"></iframe></div></section>`},
    };
    let ins_html = document.createElement("div");
    ins_html.id = "opd_main_element";
    ins_html.style = "position: fixed;z-index: 999999;top:0;width: 100%;height: 100%;background: white;display: flex;flex-direction: row;overflow: hidden;";
    let side_bar = `<section class="dsp_row" style="position:fixed;z-index:999;height:98%;"><div draggable="false" opd_row_type="dsp_row" opd_row_width="%row_width_num%" style="height:100%;min-width: 100px;text-align: center;background-color: white;"><div><p style="margin-top:0;padding-top:1em;">Open-Deck<br>Prototype<br>v${chrome.runtime.getManifest().version}</p><hr><p>Debug<br><input type="button" id="init_settings" value="init settings"/><br><input type="button" id="profile_load_save" value="Profile Load"/><br><input type="button" id="dnr_reload" value="dNR_Reload"/><br><input type="button" id="ext_reload" value="Ext_Reload"/></p><hr><p><input type="button" id="add_timeline" value="Add TimeLine"/></p><p><input type="button" id="add_notify" value="Add Notification"/></p><p><input type="button" id="add_explore" value="Add Explore"/><hr><input type="button" id="second_rack" value="Second Rack"/><hr><input type="button" id="profile_save" value="Profile_Save"/><br><input type="button" id="profile_delete" value="Profile_Delete"/><br>${profile_list_html}</p></div></div></section><section draggable="false" class="dsp_row"><div opd_row_type="main_bar_empty_row" id="main_bar_empty_row" style="height:100%;min-width: 110px;"></div></section>`;
    let main_row_html = ``;
    let second_row_html = ``;
    //設定2段
    let first_row_end = false;
    let second_row_end = false;
    let second_rack_mode = false;
    //カラム横幅
    let row_width_init = "30";
    //スクロール検出用
    let scroll_block = true;
    //
    //console.log(settings.row_settings.length)
    for (let index = 0; index < settings.row_settings.length; index++) {
        //console.log(default_element)
        for (let default_index = 0; default_index < Object.keys(default_element).length; default_index++) {
            //console.log(settings.row_settings[index].type+"-"+Object.keys(default_element))
            if(settings.row_settings[index].type == Object.keys(default_element)[default_index]){
                //console.log(default_element[Object.keys(default_element)[default_index]]["html"])
                let banner_checked = "";
                let init_top_visible_checked = "";
                let init_pinned_checked = "";
                let init_pinned_path = "";
                let init_row_save_path = settings.row_settings[index].row_save_path;
                let tw_view_type = settings.row_settings[index].tw_view_mode;
                if(settings.row_settings[index].banner == true){
                    banner_checked = "checked";
                }
                //トップ検索など
                if(settings.row_settings[index].top_visible == true){
                    init_top_visible_checked = "checked";
                }
                //カラム横幅
                if(settings.row_settings[index].row_width != null){
                    row_width_init = settings.row_settings[index].row_width;
                }
                //Exproleピン止め
                if(settings.row_settings[index].type == "explore"){
                    if(settings.row_settings[index].row_pinned_path != ""){
                        init_pinned_checked = "checked";
                        init_pinned_path = settings.row_settings[index].row_pinned_path;
                        init_row_save_path = settings.row_settings[index].row_pinned_path;
                        //%row_pinned_ch%
                    }else{
                        init_row_save_path = settings.row_settings[index].row_save_path;
                    }
                }
                //一段目終了検出にもかかわらず設定が存在していた場合2段目の変数に保存
                if(first_row_end == true){
                    second_row_html += default_element[Object.keys(default_element)[default_index]]["html"].replaceAll("%row_save_path%", init_row_save_path).replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", banner_checked).replace("%row_top_bar_ch%", init_top_visible_checked).replace("%row_tw_view_mode%", tw_view_type).replace("%row_pinned_ch%", init_pinned_checked).replaceAll("%row_pinned_save_path%", init_pinned_path).replaceAll("%row_width_num%", row_width_init);
                }else{
                    main_row_html += default_element[Object.keys(default_element)[default_index]]["html"].replaceAll("%row_save_path%", init_row_save_path).replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", banner_checked).replace("%row_top_bar_ch%", init_top_visible_checked).replace("%row_tw_view_mode%", tw_view_type).replace("%row_pinned_ch%", init_pinned_checked).replaceAll("%row_pinned_save_path%", init_pinned_path).replaceAll("%row_width_num%", row_width_init);
                }
                //一段目読込終了検出
                if(first_row_end == false && settings.row_settings[index].type == "empty_row"){
                    first_row_end = true;
                }
                //二段目読込終了検出
                if(second_row_end == false && settings.row_settings[index].type == "second_empty_row"){
                    second_row_end = true;
                }
            }
        }
    }
    //初期挿入HTML作成
    ins_html.innerHTML = `${side_bar}<div id="main_rack_element" style=""><div id="first_rack_element" style="height: 100%;display:flex;flex-direction:row;">${main_row_html}</div><div id="second_rack_element" style="display:flex;flex-direction:row;">${second_row_html}</div></div>`;
    //HTML挿入
    document.body.insertAdjacentElement("afterbegin", ins_html);
    //2段目が存在する場合の処理
    if(first_row_end == true && second_row_end == true){
        second_rack_mode = true;
        document.querySelector("#first_rack_element").style.height = "50vh";
        document.querySelector("#second_rack_element").style.height = "50vh";
        /*or (let index = 0; index < document.querySelectorAll('.dsp_row[draggable="true"]').length; index++) {
            document.querySelectorAll('.dsp_row[draggable="true"]')[index].style.height = "calc(100% - 25px)";
        }*/
        document.querySelector("style[second_row_css]").textContent = `.dsp_row[draggable="true"]{height:calc(100% - 25px)}`;
        document.querySelector("#second_rack").value = "Single Rack";
    }
    //
    create_profile_list_btn();
    row_dd();
    row_close();
    append_object_css();
    //プロファイルリスト切替イベント作成関数
    function create_profile_list_btn(){
        //プロファイルリスト切替イベント初期化
        for (let index = 0; index < profile_store.length; index++) {
            document.querySelector(`#userProfile-${index}`).addEventListener("click",function(){
                if(confirm(`プロファイル「${index}」を読み込みますか?`)){
                    document.querySelector("#opd_main_element").remove();
                    last_load_profile = index;
                    chrome.storage.local.get("opd_settings", function(value){
                        let load_setting = JSON.parse(value.opd_settings);
                        load_setting.last_load_profile = index;
                        chrome.storage.local.set({'opd_settings': JSON.stringify(load_setting)}, function () {
                        });
                    });
                    const row_settings = {row_settings:profile_store[index].profile};
                    console.log(row_settings)
                    run(row_settings, profile_store);
                }
            })
        }
    }
    //CSS適用(追加/変更の時に呼び出し)
    function append_object_css(){
        let row_object = document.querySelectorAll('.dsp_row:not([opd_row_type="dsp_row"], [opd_row_type="empty_row"], [opd_row_type="main_bar_empty_row"]) iframe');
        for (let index = 0; index < row_object.length; index++) {
            //バナー/表示モード変更
            row_object[index].addEventListener("load", function(){
                //console.log(this)
                let opd_row_div = this.closest("div[opd_row_type]");
                let opd_row_banner_checkbox = opd_row_div.querySelector(".opd_banner");
                let opd_row_top_visible_checkbox = opd_row_div.querySelector(".opd_top_bar");
                let opd_row_tw_view_mode_opt = opd_row_div.querySelector(".opd_tw_view_mode");
                //バナー表示設定読み込み適用
                /*if(opd_row_banner_checkbox.checked == true){
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                }else{
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css>header[role="banner"]{content-visibility:hidden; }</style>`);
                }*/
                //バナー表示ロード
                if(this.contentWindow.document.querySelector('head style[opd_banner_css]') == null){
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                }
                if(opd_row_banner_checkbox.checked != true){
                    //console.log(this)
                    this.contentWindow.document.querySelector('head style[opd_banner_css]').textContent = `header[role="banner"]{display:none};`;
                }else{
                    //console.log("else")
                    this.contentWindow.document.querySelector('head style[opd_banner_css]').textContent = ``;
                }
                //トップ検索欄等削除適用
                if(this.contentWindow.document.querySelector('head style[opd_top_visible_css]') == null){
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_top_visible_css></style>`);
                }
                if(opd_row_top_visible_checkbox.checked != true){
                    if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "explore"){
                        this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(form[role="search"]){display:none;};`;
                    }else{
                        if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "home"){
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(h2[role="heading"]){display:none;} div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(div[role="progressbar"]){display:none;}`;
                        }else{
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(h2[role="heading"]){display:none;};`;
                        }
                    }
                }else{
                    //console.log("else")
                    this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = ``;
                }

                //ツイート表示項目設定読み込み適用
                if(this.contentWindow.document.querySelector("head style[opd_tw_view_mode_css]") == null){
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
            })
            //各カラム読み込み後の動作(init)
            row_object[index].addEventListener("load", function(){
                //console.log(this)
                let opd_row_div = this.closest("div[opd_row_type]");
                let opd_row_width_btn = opd_row_div.querySelector(".row_width_btn");
                let opd_row_banner_checkbox = opd_row_div.querySelector(".opd_banner");
                let opd_row_top_visible_checkbox = opd_row_div.querySelector(".opd_top_bar");
                let opd_row_pinned_checkbox = opd_row_div.querySelector(".opd_pinned_btn");
                let opd_row_tw_view_mode_opt = opd_row_div.querySelector(".opd_tw_view_mode");
                //バナー表示設定読み込み適用
                /*if(opd_row_banner_checkbox.checked == true){
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                }else{
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css>header[role="banner"]{content-visibility:hidden; }</style>`);
                }*/
                if(this.contentWindow.document.querySelector('head style[opd_banner_css]') == null){
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                }
                if(opd_row_banner_checkbox.checked != true){
                    //console.log(this)
                    this.contentWindow.document.querySelector('head style[opd_banner_css]').textContent = `header[role="banner"]{display:none};`;
                }else{
                    //console.log("else")
                    this.contentWindow.document.querySelector('head style[opd_banner_css]').textContent = ``;
                }

                //トップ検索欄等削除適用
                if(this.contentWindow.document.querySelector('head style[opd_top_visible_css]') == null){
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_top_visible_css></style>`);
                }
                if(opd_row_top_visible_checkbox.checked != true){
                    console.log("home_notcheck")
                    if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "explore"){
                        this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(form[role="search"]){display:none;};`;
                    }else{
                        if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "home"){
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(h2[role="heading"]){display:none;} div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(div[role="progressbar"]){display:none;}`;
                        }else{
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(h2[role="heading"]){display:none;};`;
                        }
                    }
                }else{
                    //console.log("else")
                    this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = ``;
                }
                
                //ツイート表示項目設定読み込み適用
                if(this.contentWindow.document.querySelector("head style[opd_tw_view_mode_css]") == null){
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_tw_view_mode_css></style>`);
                }
                opd_row_tw_view_mode_opt.value = opd_row_tw_view_mode_opt.getAttribute("row_tw_view_mode_val")
                switch (opd_row_tw_view_mode_opt.getAttribute("row_tw_view_mode_val")) {
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

                //カラム横幅設定イベント
                opd_row_width_btn.addEventListener("click", function(){
                    const now_width = this.closest("div[opd_row_type]").getAttribute("opd_row_width");
                    let setting_width = prompt("カラム横幅のremを半角数字で入力\r\n目安 小:15 中:20 大:30 初期値:30\r\n1以下は入力できません\r\n試作版の仕様により数値次第でカラム操作項目等が隠れます", now_width);
                    console.log(setting_width);
                    if(setting_width != null){
                        const setting_width_num = Number(setting_width);
                        if(setting_width_num != NaN && setting_width_num > 0){
                            this.closest("div[opd_row_type]").setAttribute("opd_row_width", setting_width_num);
                            this.closest("div[opd_row_type]").style.width = `${setting_width_num}rem`;
                            row_settings_save("", last_load_profile);
                        }else{
                            alert("正しい値を入力してください");
                        }
                    }
                });
                //console.log(opd_row_div.querySelector(".opd_banner").checked)
                //バナーチェックイベント
                opd_row_banner_checkbox.addEventListener("change", function(){
                    row_settings_save("", last_load_profile);
                    //console.log(this.closest("div[opd_row_type]").querySelector("iframe"))
                    let banner_mode_target_object = this.closest("div[opd_row_type]").querySelector("iframe");
                    //console.log(banner_mode_target_object.contentWindow.document.querySelector('head style[opd_banner_css]'))
                    if(banner_mode_target_object.contentWindow.document.querySelector('head style[opd_banner_css]') == null){
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

                //トップ検索欄等削除イベント
                opd_row_top_visible_checkbox.addEventListener("change", function(){
                    row_settings_save("", last_load_profile);
                    let topvisible_mode_target_object = this.closest("div[opd_row_type]").querySelector("iframe");
                    //console.log(topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]'))
                    if(topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]') == null){
                        topvisible_mode_target_object.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_top_visible_css></style>`);
                    }
                    if(this.checked != true){
                        //console.log(this)
                        //topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(form[role="search"]), div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(h2[role="heading"]){display:none;};`;
                        if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "explore"){
                            topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(form[role="search"]){display:none;};`;
                        }else{
                            console.log(this.closest("div[opd_row_type]").getAttribute("opd_row_type"))
                            if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "home"){
                                topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(h2[role="heading"]){display:none;} div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(div[role="progressbar"]){display:none;}`;
                            }else{
                                topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(h2[role="heading"]){display:none;};`;
                            }
                        }
                    }else{
                        //console.log("else")
                        topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = ``;
                    }
                });
                
                //Exproleピン止め
                if(opd_row_pinned_checkbox != null){
                    opd_row_pinned_checkbox.addEventListener("click", function(){
                        if(this.checked){
                            if(confirm("この場所でピン止めしますか?")){
                                const now_path = this.closest("div[opd_row_type]").getAttribute("opd_explore_path");
                                this.closest("div[opd_row_type]").setAttribute("opd_pinned_path",now_path);
                                row_settings_save("", last_load_profile);
                            }else{
                                this.checked = false;
                            }
                        }else{
                            if(confirm("ピン止めを解除します")){
                                this.closest("div[opd_row_type]").setAttribute("opd_pinned_path","");
                                row_settings_save("", last_load_profile);
                                this.checked = false;
                            }else{
                                this.checked = true;
                            }
                        }
                    });
                }
                //ツイート表示モードイベント
                opd_row_tw_view_mode_opt.addEventListener("change", function(){
                    row_settings_save("", last_load_profile);
                    //console.log(this.closest("div[opd_row_type]").querySelector("iframe"))
                    let tw_view_mode_target_object = this.closest("div[opd_row_type]").querySelector("iframe");
                    //console.log(this.value)
                    if(tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]') == null){
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
            }, {once: true})
            //exploreURL検出処理
            const opd_row_mutate = row_object[index].closest("div[opd_row_type]");
            if(opd_row_mutate.getAttribute("opd_row_type") == 'explore'){
                mutate_url(opd_row_mutate);
            }
        }
    }
    //URL監視
    function mutate_url(element){
        let exp_object = element.querySelector("iframe");
        exp_object.addEventListener("load", function(){
            let exp_old_url = exp_object.contentWindow.location.href;
                    let exp_observer = new MutationObserver(function(){
                        if(exp_old_url != exp_object.contentWindow.location.href){
                            let exp_url = new URL(exp_object.contentWindow.location.href);
                            console.log(`${exp_url.pathname}${exp_url.search}`);
                            element.setAttribute("opd_explore_path", `${exp_url.pathname}${exp_url.search}`);
                            row_settings_save("", last_load_profile);
                            exp_old_url = exp_object.contentWindow.location.href;
                        }
                    });
                    exp_observer.observe(exp_object.contentWindow.document, {childList: true, subtree: true});
        })
    }
    //メインバーイベント
    document.getElementById("init_settings").addEventListener("click", function(){
        chrome.storage.local.remove("opd_settings", function(value){
            alert("設定を初期化しました。再読み込みしてください。");
        });
    });
    //画像付きを開いた時の自動スクロール阻止
    document.querySelector("#main_rack_element").addEventListener("scrollend", function(){
        document.querySelector("#main_rack_element").scrollTop = 0;
    })
    //二段表示
    document.getElementById("second_rack").addEventListener("click", function(){
        if(second_rack_mode == false){
            //document.querySelector("#main_rack_element").style.height = "50vh";
            document.querySelector("#first_rack_element").style.height = "50vh";
            document.querySelector("#second_rack_element").style.height = "50vh";
            const second_rack_empty_html = `<section draggable="false" id="row_%row_num%" class="dsp_row dsp_row_second_emptyrow"><div opd_row_type="second_empty_row" style="height: calc(100% - 20px);min-width: 30rem;display: flex;align-items: center;justify-content: center;"><p>2段目<br>1段目のカラムが配置できます</p></div></section>`;
            const second_rack_default_html = second_rack_empty_html.replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_tw_view_mode%", "0");
            document.querySelector("#second_rack_element").insertAdjacentHTML("beforeend", second_rack_default_html);
            /*for (let index = 0; index < document.querySelectorAll('.dsp_row[draggable="true"]').length; index++) {
                document.querySelectorAll('.dsp_row[draggable="true"]')[index].style.height = "calc(100% - 25px)";
            }*/
            document.querySelector("style[second_row_css]").textContent = `.dsp_row[draggable="true"]{height:calc(100% - 25px)}`;
            //document.querySelector(".dsp_row_second_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
            append_object_css();
            row_dd();
            row_close();
            row_settings_save("", last_load_profile);
            second_rack_mode = true;
            document.querySelector("#second_rack").value = "Single Rack";
        }else{
            if(confirm("1段表示にします。\r\n2段目のカラムは全て閉じられます")){
                document.querySelector("#second_rack_element").textContent = "";
                document.querySelector("style[second_row_css]").textContent = ``;
                document.querySelector("#first_rack_element").style.height = "100vh";
                document.querySelector("#second_rack_element").style.height = "0";
                document.querySelector("#second_rack_element").style.height = "0";
                append_object_css();
                //row_dd();
                row_settings_save("", last_load_profile);
                second_rack_mode = false;
                document.querySelector("#second_rack").value = "Second Rack";
            }
        }
        
    });
    //プロファイルローダー
    document.getElementById("profile_load_save").addEventListener("click", function(){
        window.open(chrome.runtime.getURL("profile_debug.html"), "OPD-Profile-Loader", 'width=720, height=600');
    });
    //
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
    //タイムラインカラム追加
    document.getElementById("add_timeline").addEventListener("click", function(){
        const new_row = default_element["home"]["html"].replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_top_bar_ch%", "checked").replace("%row_tw_view_mode%", "0").replaceAll("%row_width_num%", "30");
        document.querySelector(".dsp_row_emptyrow").insertAdjacentHTML("beforebegin", new_row);
        document.querySelector(".dsp_row_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
        append_object_css();
        row_dd();
        row_close();
        row_settings_save("", last_load_profile);
    });
    //通知カラム追加
    document.getElementById("add_notify").addEventListener("click", function(){
        const new_row = default_element["notification"]["html"].replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_top_bar_ch%", "checked").replace("%row_tw_view_mode%", "0").replaceAll("%row_width_num%", "30");
        document.querySelector(".dsp_row_emptyrow").insertAdjacentHTML("beforebegin", new_row);
        document.querySelector(".dsp_row_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
        append_object_css();
        row_dd();
        row_close();
        row_settings_save("", last_load_profile);
    });
    //Explore(ユニバーサル)カラム追加
    document.getElementById("add_explore").addEventListener("click", function(){
        const new_row = default_element["explore"]["html"].replaceAll("%row_save_path%", "/explore").replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_top_bar_ch%", "checked").replace("%row_tw_view_mode%", "0").replaceAll("%row_pinned_save_path%", "").replaceAll("%row_width_num%", "30");
        document.querySelector(".dsp_row_emptyrow").insertAdjacentHTML("beforebegin", new_row);
        document.querySelector(".dsp_row_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
        append_object_css();
        row_dd();
        row_close();
        row_settings_save("", last_load_profile);
    });
    //プロファイル保存ボタン
    document.getElementById("profile_save").addEventListener("click", function(){
        if(confirm("現在の構成でプロファイルを作成します")){
            let profile = row_settings_save("profile_out");
            const save_object = {name:"user_profile", profile:profile.row_settings};
            console.log(profile)
            profile_store.push(save_object);
            console.log(profile_store)
            chrome.storage.local.set({'opd_profile_store': JSON.stringify(profile_store)}, function () {
                let profile_list_btn_html = "";
                //プロファイルリスト初期化
                for (let index = 0; index < profile_store.length; index++) {
                    profile_list_btn_html += `<input type="button" id="userProfile-${index}" value="P${index}"><br>`;
                }
                document.querySelector("#profile_btn_list").innerHTML = profile_list_btn_html;
                create_profile_list_btn();
            });
        }
    });
    //プロファイル削除ボタン
    document.getElementById("profile_delete").addEventListener("click", function(){
        const delete_num = Number(prompt("削除するプロファイル番号を半角入力"));
        if(last_load_profile != delete_num){
            if(confirm(`プロファイル${delete_num}を削除しますか?\r\n※削除後、残ったプロファイル番号は0から再度割り振られます。`)){
                profile_store.splice(delete_num, 1);
                console.log(profile_store)
                chrome.storage.local.set({'opd_profile_store': JSON.stringify(profile_store)}, function () {
                    let profile_list_btn_html = "";
                    //プロファイルリスト初期化
                    for (let index = 0; index < profile_store.length; index++) {
                        profile_list_btn_html += `<input type="button" id="userProfile-${index}" value="P${index}"><br>`;
                    }
                    document.querySelector("#profile_btn_list").innerHTML = profile_list_btn_html;
                    create_profile_list_btn();
                });
            }
        }else{
            alert("表示中のプロファイルは削除できません")
        }
    });
    //カラム移動
    function row_dd(){
        let row_class = document.querySelectorAll(".dsp_row");
        let row_copy_source = null;
        for (let index = 0; index < row_class.length; index++) {
            row_class[index].addEventListener("dragstart", function(ev){
                row_copy_source = this;
                ev.dataTransfer.setData('text/html', ev.target.id);
            });
            row_class[index].addEventListener("dragover", function(ev){
                ev.preventDefault();
                this.style.borderLeft = '15px solid rgba(0, 0, 0, 0.500)';
            });
            row_class[index].addEventListener("dragleave", function(){
                this.style.borderLeft = '';
            });
            row_class[index].addEventListener("drop", function(ev){
                ev.preventDefault();
                //移動時初期表示設定
                //bn_twview_mode(this.querySelector("iframe"));
                //exploreのURLセット
                //console.log(row_class[index])
                //移動セット
                const dt_id = ev.dataTransfer.getData('text/html');
                const dr_elem = document.getElementById(dt_id);
                console.log(dr_elem);
                if(dr_elem.querySelector("div").getAttribute("opd_row_type") == 'explore'){
                    // && dr_elem.querySelector("div").querySelector("iframe").src != `https://twitter.com${dr_elem.querySelector("div").getAttribute("opd_explore_path")}`
                    console.log(dr_elem.querySelector("div").getAttribute("opd_explore_path"))
                    
                    console.log(dr_elem.querySelector("div").getAttribute("opd_pinned_path"))
                    if(dr_elem.querySelector("div").getAttribute("opd_pinned_path") != ""){
                        console.log("Pinned")
                        dr_elem.querySelector("div").querySelector("iframe").src = `https://twitter.com${dr_elem.querySelector("div").getAttribute("opd_pinned_path")}`;
                    }else{
                        console.log("Exp_save")
                        dr_elem.querySelector("div").querySelector("iframe").src = `https://twitter.com${dr_elem.querySelector("div").getAttribute("opd_explore_path")}`;
                    }
                }
                this.parentNode.insertBefore(dr_elem, this);
                this.style.borderLeft = '';
                //append_object_css();
                //row_dd();
                row_settings_save("", last_load_profile);
            })
        }
    }
    //カラム終了
    function row_close(){
        for (let index = 0; index < document.querySelectorAll(".row_close_btn").length; index++) {
            document.querySelectorAll(".row_close_btn")[index].addEventListener("click", function(){
                this.closest("[class='dsp_row']").remove();
                append_object_css();
                //row_dd();
                row_settings_save("", last_load_profile);
            })
        }
    }
    //カラム構成保存
    function row_settings_save(mode, profile_num){
        let settings_array = {
            row_settings:[],
            version:chrome.runtime.getManifest().version
        };
        for (let index = 0; index < document.querySelectorAll("#opd_main_element div[opd_row_type]").length; index++) {
            let banner_checked = null;
            let top_visible_checked = null;
            let tw_view_type = null;
            let row_open_path = null;
            let row_pinned_save_path = null;
            let row_width_value = null;
            if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].querySelector(".opd_banner")?.checked == true){
                banner_checked = true;
            }else{
                banner_checked = false;
            }
            //トップ検索欄等 
            if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].querySelector(".opd_top_bar")?.checked == true){
                top_visible_checked = true;
            }else{
                top_visible_checked = false;
            }
            //
            if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].querySelector(".opd_tw_view_mode")?.value != undefined){
                tw_view_type = document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].querySelector(".opd_tw_view_mode").value;
            }else{
                tw_view_type = "0";
            }
            //横幅設定
            if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_width") != "null"){
                console.log(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_width"))
                row_width_value = document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_width");
            }
            //exploreの処理
            if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_type") == 'explore'){
                //console.log(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_explore_path"));
                row_open_path = document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_explore_path");
                //ピン止め
                row_pinned_save_path = document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_pinned_path");
            }else{
                row_open_path = "";
                row_pinned_save_path = "";
            }
            settings_array["row_settings"].push({type:document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_type"), banner:banner_checked, top_visible:top_visible_checked, tw_view_mode:tw_view_type, row_save_path:row_open_path, row_pinned_path:row_pinned_save_path, row_width:row_width_value});
        }
        if(mode == "profile_out"){
            return settings_array;
        }else{
            //console.log(settings_array);
            /*chrome.storage.local.set({'opd_settings': JSON.stringify(settings_array)}, function () {
                console.log(settings_array);
            });*/
            const save_object = {name:"user_profile", profile:settings_array.row_settings};
            //profile_store.push(save_object);
            Object.assign(profile_store[profile_num], save_object);
            console.log(profile_store);
            chrome.storage.local.set({'opd_profile_store': JSON.stringify(profile_store)}, function () {
                console.log(settings_array);
            });
        }
    }
    //ランダムID作成
    function create_random_id(){
        return Math.random().toString(32).substring(2);
    }
    //メインX動作マスク
    function main_dsp(){
        document.getElementById("react-root").style.visibility = "hidden";
        document.getElementById("react-root").style.overflow = "hidden";
    }
    const target_elem = document.getElementById("react-root");
    const observer = new MutationObserver(main_dsp);
    observer.observe(target_elem,{
        childList: true,
        characterData: true,
        subtree: false
    });
    //title変更監視
    const head_observer = new MutationObserver(function(){
        document.title = "Open-Deck(ProtoType)";
        document.querySelector('link[rel="shortcut icon"]').href = chrome.runtime.getURL("icon.png");
    }).observe(document.querySelector("head"),{
        childList: true,
        characterData: true,
        subtree: false
    })
}
//設定初期化
function settings_init(){
    const profile_store_default = [{type:"main_bar_empty_row", banner:false, top_visible:true, tw_view_mode:"0", row_save_path:"", row_pinned_path:"", row_width:null}, {type:"home", banner:true, top_visible:true, tw_view_mode:"0", row_save_path:"", row_pinned_path:"", row_width:null}, {type:"notification", banner:false, top_visible:true, tw_view_mode:"0", row_save_path:"", row_pinned_path:"", row_width:null}, {type:"explore", banner:false, top_visible:true, tw_view_mode:"0", exp_type:"", row_save_path:"/explore", row_pinned_path:"", row_width:null}, {type:"empty_row", banner:false, top_visible:true, tw_view_mode:"0", row_save_path:"", row_pinned_path:"", row_width:null}];
    const settings = {
        last_load_profile:0,
        //row_settings:[{type:"main_bar_empty_row", banner:false, top_visible:true, tw_view_mode:"0", row_save_path:"", row_pinned_path:"", row_width:null}, {type:"home", banner:true, top_visible:true, tw_view_mode:"0", row_save_path:"", row_pinned_path:"", row_width:null}, {type:"notification", banner:false, top_visible:true, tw_view_mode:"0", row_save_path:"", row_pinned_path:"", row_width:null}, {type:"explore", banner:false, top_visible:true, tw_view_mode:"0", exp_type:"", row_save_path:"/explore", row_pinned_path:"", row_width:null}, {type:"empty_row", banner:false, top_visible:true, tw_view_mode:"0", row_save_path:"", row_pinned_path:"", row_width:null}],
        version:chrome.runtime.getManifest().version
    };
    let profile = [{name:"default", profile: profile_store_default}];
    console.log(profile);
    chrome.storage.local.set({'opd_profile_store': JSON.stringify(profile)}, function () {
        chrome.storage.local.set({'opd_settings': JSON.stringify(settings)}, function () {
            alert("初期設定構築が完了しました。\r\nようこそ！Open-Deck試作版へ！");
            location.reload();
        });
    });
}