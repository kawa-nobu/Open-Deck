//
console.log("Welcome to Open-Deck!");
console.log("%cOpen-Deck Prototype", "background:#a1f4ff;padding:5px;border-radius:5px", `Version:${chrome.runtime.getManifest().version}`);
//
const url_path = new URL(location.href);
let profile_store;
let last_load_profile;
const ui_icon_define = {
    banner_hide:"icon/banner_hide.svg",
    top_bar_hide:"icon/top_hide.svg",
    column_move:"icon/column_move.svg",
    column_close:"icon/column_close.svg",
    column_settings: "icon/settings.svg",
    column_pin:"icon/pin.svg",
    column_pinned:"icon/pinned.svg",
    column_widesize:"icon/column_w_size.svg",
    column_add_1:"icon/column_add_1st.svg",
    column_add_2:"icon/column_add_2nd.svg",
    add_timeline_column:"icon/tl_column.svg",
    add_notification_column:"icon/notice_column.svg",
    add_explore_column:"icon/exp_column.svg",
    column_single_rack:"icon/single_view.svg",
    column_second_rack:"icon/second_view.svg",
    profile_save:"icon/profile_save.svg",
    profile_delete:"icon/profile_delete.svg"
}
//UNIX時間分秒変換
function unix_time_mmss(input){
    const date = new Date(input * 1000);
    return date.toLocaleTimeString();
}
//ストレージの書き込み監視(主にAPIリミット監視に使う)
let api_limit_obj = null;
let api_limit_dsc_obj = {time_line:"", recommend_timeline:"", search:""};
chrome.storage.onChanged.addListener((changes, namespace) => {
    if(changes.api_access_limit != undefined){
        console.log(changes)
        api_limit_obj = changes.api_access_limit.newValue;
        const api_linit_status_btn = document.querySelector("#api_limit_status");
        if(api_linit_status_btn != null){
            let timeline_limit_percentage = 99999;
            let recommend_timeline_limit_percentage = 99999;
            let search_limit_percentage = 99999;
            if(api_limit_obj.time_line.remaining != null){
                timeline_limit_percentage = api_limit_obj.time_line.remaining / api_limit_obj.time_line.limit * 100;
                api_limit_dsc_obj.time_line = `タイムライン:${api_limit_obj.time_line.remaining}/${api_limit_obj.time_line.limit}-${unix_time_mmss(api_limit_obj.time_line.reset_unix_time)}\r\n`;
            }else{
                //初期状態
            }
            if(api_limit_obj.recommend_timeline.remaining != null){
                recommend_timeline_limit_percentage = api_limit_obj.recommend_timeline.remaining / api_limit_obj.recommend_timeline.limit * 100;
                api_limit_dsc_obj.recommend_timeline = `タイムライン(おすすめ):${api_limit_obj.recommend_timeline.remaining}/${api_limit_obj.recommend_timeline.limit}-${unix_time_mmss(api_limit_obj.recommend_timeline.reset_unix_time)}\r\n`;
            }else{
                //初期状態
            }
            if(api_limit_obj.search.remaining != null){
                search_limit_percentage = api_limit_obj.search.remaining / api_limit_obj.search.limit * 100;
                api_limit_dsc_obj.search = `検索:${api_limit_obj.search.remaining}/${api_limit_obj.search.limit}-${unix_time_mmss(api_limit_obj.search.reset_unix_time)}`;
            }else{
                //初期状態
            }
            api_linit_status_btn.textContent = `${Math.floor(Math.min(timeline_limit_percentage, recommend_timeline_limit_percentage, search_limit_percentage))}%`;
            api_linit_status_btn.title = `API使用状況\r\n${api_limit_dsc_obj.time_line}${api_limit_dsc_obj.recommend_timeline}${api_limit_dsc_obj.search}`;
        }
    }
  });
//
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
        //console.log("Welcome to Open-Deck!");
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
        profile_list_btn_html += `<div class="dsp_btn_parent" title="プロファイルを切り替える" id="userProfile-${index}"><div class="dsp_btn_change_profile_btn">P${index}</div></div>`;//<div class="profile_list"><input type="button" id="userProfile-${index}" value="P${index}"></div>
    }
    profile_list_html = `<div class="profile_val_now" title="使用中のプロファイル">${last_load_profile}</div><div class="dsp_profile_list"><div id="profile_btn_list">${profile_list_btn_html}</div>`;
    //console.log(profile_list_btn_html)
    //CSSタグ追加
    document.querySelector("head").insertAdjacentHTML("afterbegin", `<style second_row_css></style>
    <style opd_default_css>
    html{
        overflow-y:hidden !important;
    }
    .main_bar_functions{
        display: flex;
        justify-content: center;
        flex-direction: column;
        align-items: center;
        margin-top: 0.5rem;
    }
    .main_bar_functions hr{
        width: 80%;
        margin: 0;
    }
    .opd_debug_menu{
        display: none;
    }
    #opd_main_element{
        background: #e4e4e4 !important;
    }
    div[opd_row_type="dsp_row"]{
        overflow-x: scroll;
        scrollbar-width: none;
    }
    #main_bar_empty_row{
        background-color: white;
    }
    #api_limit_status{
        border-radius: 100px;
        width: 50px;
    }
    #api_limit_status:hover{
        background-color: #d5d5d5;
        cursor: help;
    }
    .opd_ui_logo_parent{
        overflow: hidden;
        display: flex;
        width: 50px;
        align-content: center;
        justify-content: center;
        align-items: center;
        flex-direction: column;
    }
    .opd_ui_logo{
        background-size: cover;
        background-repeat: no-repeat;
        background-image: url(${chrome.runtime.getURL("icon.png")});
        height: 50px;
        width: 50px;
    }
    .profile_val_now{
        border-radius: 100px;
        width: 55px;
    }
    .profile_val_now:hover{
        background-color: #d5d5d5;
    }
    #main_rack_element{
        position: fixed;
        left:60px;
        height:100vh;
        max-width:calc(100vw - 60px);
        width:calc(100vw - 60px);
        overflow:scroll hidden;
    }
    #first_rack_element{
        /*overflow: hidden;*/
    }
    #second_rack_element{
        /*overflow: hidden;*/
    }
    .dsp_row_emptyrow p{
        text-align: center;
    }
    .dsp_row_second_emptyrow p{
        text-align: center;
    }
    .dsp_btn_parent{
        overflow: hidden;
        border-radius: 100px;
        display: flex;
        width: 50px;
        height: 50px;
        align-content: center;
        justify-content: center;
        align-items: center;
    }
    .dsp_btn_parent:hover{
        background: #d5d5d5;
        cursor: pointer;
    }
    .dsp_btn_add_tl_img{
        filter: brightness(0) saturate(100%) invert(11%) sepia(16%) saturate(13%) hue-rotate(322deg) brightness(107%) contrast(80%);
        background-size: cover;
        background-repeat: no-repeat;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.add_timeline_column)});
        height: 69%;
        width: 69%;
    }
    .dsp_btn_add_ntfc_img{
        filter: brightness(0) saturate(100%) invert(11%) sepia(16%) saturate(13%) hue-rotate(322deg) brightness(107%) contrast(80%);
        background-size: cover;
        background-repeat: no-repeat;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.add_notification_column)});
        height: 69%;
        width: 69%;
    }
    .dsp_btn_add_explr_img{
        filter: brightness(0) saturate(100%) invert(11%) sepia(16%) saturate(13%) hue-rotate(322deg) brightness(107%) contrast(80%);
        background-size: cover;
        background-repeat: no-repeat;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.add_explore_column)});
        height: 69%;
        width: 69%;
    }
    .dsp_btn_second_rack_img{
        filter: brightness(0) saturate(100%) invert(11%) sepia(16%) saturate(13%) hue-rotate(322deg) brightness(107%) contrast(80%);
        background-size: cover;
        background-repeat: no-repeat;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_second_rack)});
        height: 69%;
        width: 69%;
    }
    .dsp_btn_profile_add_img{
        filter: brightness(0) saturate(100%) invert(11%) sepia(16%) saturate(13%) hue-rotate(322deg) brightness(107%) contrast(80%);
        background-size: cover;
        background-repeat: no-repeat;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.profile_save)});
        height: 69%;
        width: 69%;
    }
    .dsp_btn_profile_delete_img{
        filter: brightness(0) saturate(100%) invert(11%) sepia(16%) saturate(13%) hue-rotate(322deg) brightness(107%) contrast(80%);
        background-size: cover;
        background-repeat: no-repeat;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.profile_delete)});
        height: 69%;
        width: 69%;
    }
    .dsp_btn_change_profile_btn{
        display: flex;
        font-size: 1.2rem;
        justify-content: center;
        align-items: center;
        height: 69%;
        width: 69%;
    }
    .dsp_profile_list{
        max-height: 1000px;
        overflow-y: scroll;
        scrollbar-width: none;
    }
    .dsp_row_draggable_true{
        border-left: solid 3px #0000002e;
        border-right: solid 3px #0000002e;
        border-bottom: solid 3px #0000002e;
        /*overflow: hidden;*/
        background-color: white;
        border-radius: 6px 6px;
    }
    .dsp_row_draggable_true div[opd_row_type]{
        display: flex;
        flex-direction: column;
    }
    .dsp_row iframe{
        border: 0;
    }
    .dsp_row_btn{
        width: 20px;
        min-width: 20px;
        border-radius: 2px;
        overflow: hidden;
        margin-right: 5px;
    }
    .dsp_row_btn:hover{
        background: #d5d5d5;
        cursor: pointer;
    }
    .column_bar{
        display: flex;
        flex-direction: row;
        width: 100%;
        min-height: 20px;
        overflow: hidden;
        border-top: solid #a0a0a073 1px !important;
        border-bottom: solid #a0a0a073 1px !important;
        border-radius: 4px 4px 0 0;
    }
    .dsp_row_title{
        width: auto;
        background-color: white;
        margin-right: 5px;
    }
    .dsp_row_move_icon_parent{
        max-height: 20px;
        display: flex;
        flex-direction: row;
        align-items: center;
    }
    .dsp_row_move_icon{
        display: block;
        filter: brightness(0) saturate(100%) invert(61%) sepia(13%) saturate(13%) hue-rotate(335deg) brightness(89%) contrast(79%);
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_move)});
        background-size: cover;
        width: 15px;
        height: 15px;   
    }
    .dsp_row_settings_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_settings)});
        background-size: cover;
        width: 20px;
        height: 20px;    
    }
    .dsp_row_settings_btn:hover{
        cursor: pointer;
    }
    .dsp_row_settings_btn input{
        display: none;
    }
    .dsp_row_close_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_close)});
        background-size: 15px;
        background-repeat: no-repeat;
        background-position: center;
        width: 20px;
        height: 20px;    
    }
    .dsp_row_close_btn:hover{
        cursor: pointer;
    }
    .dsp_row_close_btn input{
        display: none;
    }

    .dsp_row_banner_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.banner_hide)});
        transform: rotate(180deg);
        background-size: cover;
        width: 20px;
        height: 20px;
    }
    input:checked + .dsp_row_banner_btn{
        transform: rotate(0deg);
    }
    .dsp_row_btn input{
        opacity: 0;
        position: absolute;
        z-index: 10;
        margin: 0;
        width: 20px;
        height: 20px;
        cursor: pointer;
    }
    .dsp_row_top_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.top_bar_hide)});
        transform: rotate(180deg);
        background-size: cover;
        width: 20px;
        height: 20px;
        cursor: pointer;  
    }
    input:checked + .dsp_row_top_btn{
        transform: rotate(0deg);
    }
    .dsp_row_top_btn input{
        opacity: 0;
        position: absolute;
        z-index: 10;
        margin: 0;
        width: 20px;
        height: 20px;
    }
    .dsp_row_close_btn_wrap{
        display: flex;
        width: 100%;
        justify-content: flex-end;
    }
    .dsp_row_close_btn input{
        display: none;
    }

    .dsp_row_pin_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_pin)});
        background-size: cover;
        width: 20px;
        height: 20px;    
    }
    input:checked + .dsp_row_pin_btn{
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_pinned)});
    }
    .dsp_row_pin_btn input{
        opacity: 0;
        position: absolute;
        z-index: 10;
        margin: 0;
        width: 20px;
        height: 20px;
    }

    .dsp_row_settings_panel{
        display: none;
        position: relative;
        width: inherit;
        height: auto;
        background: #efefefeb;
        border: 1px solid #a9a9a9eb;
        flex-direction: column;
    }
    .dsp_row_settings_panel h2{
        /*margin: 0 0 0.2rem;*/
        margin: 0;
    }
    .dsp_row_settings_panel_content{
        margin-left: 0.5rem;
    }
    .dsp_row_settings_panel_content h2{
        font-size: 1.2rem;
    }
    .opd_row_settings_input_text{
        width: 5rem;
        margin-right: 0.2rem;
    }
    .dsp_row_settings_list{
        background: white;
        border-radius: 5px;
        margin: 0 0.5rem 0.5rem 0;
        padding: 0.5rem;
    }
    .dsp_row_settings_content_div{
        margin-bottom: 0.1rem;
        display: flex;
        justify-content: space-between;
    }
    .opd_ui_icon_color{
        filter: brightness(0) saturate(100%) invert(11%) sepia(16%) saturate(13%) hue-rotate(322deg) brightness(107%) contrast(80%);
    }
    /*#main_rack_element section:first-child{
        margin-left:110px
    }*/
    @media (prefers-color-scheme: dark) {
        .dsp_row_draggable_false, #first_rack_element, #second_rack_element, #second_rack_element, #main_bar_empty_row{
            background-color: black !important;
        }
        .dsp_row_draggable_true, .dsp_row_title{
            background-color: #2e2e2e !important;
        }
        .dsp_btn_add_tl_img, .dsp_btn_add_ntfc_img, .dsp_btn_add_explr_img, .dsp_btn_second_rack_img, .dsp_btn_profile_add_img, .dsp_btn_profile_delete_img, .dsp_row_move_icon, .opd_ui_icon_color{
            filter: brightness(0) saturate(100%) invert(48%) sepia(0%) saturate(93%) hue-rotate(266deg) brightness(93%) contrast(86%);
        }
        #api_limit_status:hover {
            background: #555555;
        }
        .dsp_btn_parent:hover{
            background: #555555;
        }
        .dsp_row_btn:hover {
            background: #555555;
        }
        .profile_val_now:hover {
            background: #555555;
        }
        .dsp_row_settings_panel {
            background: #2e2e2e;
            border: 1px solid #5d5d5d;
        }
        .dsp_row_settings_list {
            background: #474747
        }
    }
    </style>`);
    //カラム要素作成-挿入
    let default_element_bar = `<span class="dsp_row_btn"><label class="dsp_row_settings_btn opd_ui_icon_color" title="カラム設定"><input class="opd_settings_btn" type="button" value="S"></label></span><span class="dsp_row_btn"><input class="opd_banner" type="checkbox" title="バナー表示切り替え" %row_banner_ch%><label class="dsp_row_banner_btn opd_ui_icon_color"></label></span><span class="dsp_row_btn"><input class="opd_top_bar" type="checkbox" title="トップ表示切り替え" %row_top_bar_ch%><label class="dsp_row_top_btn opd_ui_icon_color"></label></span>`;
    let row_settings_panel = `<div class="dsp_row_settings_panel"><div class="dsp_row_settings_panel_content"><h2>設定</h2><div class="dsp_row_settings_list"><div class="dsp_row_settings_content_div">表示モード<span><select class="opd_tw_view_mode" row_tw_view_mode_val="%row_tw_view_mode%"><option value="0">すべて</option><option value="1">テキストのみ</option><option value="2">画像・動画付のみ</option></select></span></div><div class="dsp_row_settings_content_div">カラム幅<span><select class="opd_row_size_preset"><option value="0">小</option><option value="1">中</option><option value="2">大</option><option value="3">カスタム</option></select></span></div><div class="dsp_row_settings_content_div">カラム幅カスタム<span><input type="button" class="row_width_btn" value="カスタム設定" style="vertical-align: text-top;font-size: 0.8rem;"/></span></div><div class="dsp_row_settings_content_div">自動更新<span><input class="opd_a_reload_bar" type="checkbox" %row_auto_reload_ch%></span></div><div class="dsp_row_settings_content_div">自動更新間隔<span><input class="opd_row_settings_input_text opd_a_reload_time_setting" type="number" value="%row_auto_reload_time%">秒</span></div></div></div></div>` ;
    let row_settings_panel_no_auto = `<div class="dsp_row_settings_panel"><div class="dsp_row_settings_panel_content"><h2>設定</h2><div class="dsp_row_settings_list"><div class="dsp_row_settings_content_div">表示モード<span><select class="opd_tw_view_mode" row_tw_view_mode_val="%row_tw_view_mode%"><option value="0">すべて</option><option value="1">テキストのみ</option><option value="2">画像・動画付のみ</option></select></span></div><div class="dsp_row_settings_content_div">カラム幅<span><select class="opd_row_size_preset"><option value="0">小</option><option value="1">中</option><option value="2">大</option><option value="3">カスタム</option></select></span></div><div class="dsp_row_settings_content_div">カラム幅カスタム<span><input type="button" class="row_width_btn" value="カスタム設定" style="vertical-align: text-top;font-size: 0.8rem;"/></span></div></div></div></div>` ;
    let default_element = {
        /*main_bar_empty_row:{html:`<!--<section draggable="false" class="dsp_row"><div opd_row_type="main_bar_empty_row" opd_row_width="%row_width_num%" id="main_bar_empty_row" style="height:100%;min-width: 70px;"></div></section>-->`},*/
        empty_row:{html:`<section draggable="false" id="row_%row_num%" class="dsp_row_draggable_false dsp_row dsp_row_emptyrow"><div opd_row_type="empty_row" opd_row_width="%row_width_num%" style="height: 100%;min-width: 30rem;display: flex;align-items: center;justify-content: center;"><div><img src="${chrome.runtime.getURL(ui_icon_define.column_add_1)}" style="filter: brightness(0) saturate(100%) invert(61%) sepia(13%) saturate(13%) hue-rotate(335deg) brightness(89%) contrast(79%);"><p>左のバーからカラムを追加</p></div></div></section>`},
        second_empty_row:{html:`<section draggable="false" id="row_%row_num%" class="dsp_row_draggable_false dsp_row dsp_row_second_emptyrow"><div opd_row_type="second_empty_row" opd_row_width="%row_width_num%" style="height:100%;min-width: 30rem;overflow: hidden;display: flex;align-items: center;justify-content: center;"><div><img src="${chrome.runtime.getURL(ui_icon_define.column_add_2)}" style="filter: brightness(0) saturate(100%) invert(61%) sepia(13%) saturate(13%) hue-rotate(335deg) brightness(89%) contrast(79%);"><p>1段目のカラムが配置できます</p></div></div></section>`},
        home:{html:`<section draggable="true" id="row_%row_num%" class="dsp_row_draggable_true dsp_row"><div opd_row_type="home" opd_row_width="%row_width_num%" style="height: 100%;width: %row_width_num%rem;min-width: 1rem;"><div class="column_bar" style="height: 20px;"><span class="dsp_row_title"><div class="dsp_row_move_icon_parent"><span class="dsp_row_move_icon"></span><span>Home</span></div></span>${default_element_bar}<div class="dsp_row_close_btn_wrap"><span class="dsp_row_btn"><label class="dsp_row_close_btn opd_ui_icon_color" title="カラムを閉じる"><input type="button" class="row_close_btn" value="X"/></label></span></div></div>${row_settings_panel}<iframe allow="fullscreen" src="https://twitter.com/home" type="text/html" style="width: 100%;height: 100%;"></iframe></div></section>`},
        notification:{html:`<section draggable="true" id="row_%row_num%" class="dsp_row_draggable_true dsp_row"><div opd_row_type="notification" opd_row_width="%row_width_num%" style="height: 100%;width: %row_width_num%rem;min-width: 1rem;"><div class="column_bar" style="height: 20px;"><span class="dsp_row_title"><div class="dsp_row_move_icon_parent"><span class="dsp_row_move_icon"></span><span>Notification</span></div></span>${default_element_bar}<div class="dsp_row_close_btn_wrap"><span class="dsp_row_btn"><label class="dsp_row_close_btn opd_ui_icon_color" title="カラムを閉じる"><input type="button" class="row_close_btn" value="X"/></label></span></div></div>${row_settings_panel_no_auto}<iframe allow="fullscreen" src="https://twitter.com/notifications" type="text/html" style="width: 100%;height: 100%;"></iframe></div></section>`},
        explore:{html:`<section draggable="true" id="row_%row_num%" class="dsp_row_draggable_true dsp_row"><div opd_row_type="explore" opd_row_width="%row_width_num%" opd_explore_path="%row_save_path%" opd_explore_title="%row_save_title%" opd_pinned_path="%row_pinned_save_path%" style="height: 100%;width: %row_width_num%rem;min-width: 1rem;"><div class="column_bar" style="height: 20px;"><span class="dsp_row_title"><div class="dsp_row_move_icon_parent"><span class="dsp_row_move_icon"></span><span>Explore</span></div></span>${default_element_bar}<span class="dsp_row_btn"><input class="opd_pinned_btn" type="checkbox" title="ピン止め切り替え" %row_pinned_ch%><label class="dsp_row_pin_btn opd_ui_icon_color"></label></span><div class="dsp_row_close_btn_wrap"><span class="dsp_row_btn"><label class="dsp_row_close_btn opd_ui_icon_color" title="カラムを閉じる"><input type="button" class="row_close_btn" value="X"/></label></span></div></div>${row_settings_panel}<iframe allow="fullscreen" src="https://twitter.com%row_save_path%" type="text/html" style="width: 100%;height: 100%;"></iframe></div></section>`},
    };
    let ins_html = document.createElement("div");
    ins_html.id = "opd_main_element";
    ins_html.style = "position: fixed;z-index: 999999;top:0;width: 100%;height: 100%;background: white;display: flex;flex-direction: row;overflow: hidden;";
    let side_bar = `<section class="dsp_row" style="position:fixed;z-index:999;height:98%;"><div draggable="false" class="dsp_row_draggable_false" opd_row_type="dsp_row" opd_row_width="%row_width_num%" style="height:100%;min-width: 60px;max-width: 60px;text-align: center;background-color: white;"><div class="main_bar_functions"><div class="opd_ui_logo_parent" title="Open-Deck\r\nPrototype\r\nv${chrome.runtime.getManifest().version}"><div class="opd_ui_logo"></div><span>${chrome.runtime.getManifest().version}</span></div><hr><p class="opd_debug_menu">Debug<br><input type="button" id="init_settings" value="初期化" /><br><input type="button" id="profile_load_save" value="プロファイルローダー" /><br><input type="button" id="dnr_reload" value="dNR_Reload" /><br><input type="button" id="ext_reload" value="拡張機能再読み込み" /><br><div id="api_limit_status">API</div><hr><div class="dsp_btn_parent" id="add_timeline" title="タイムラインカラム追加"><div class="dsp_btn_add_tl_img"></div></div><div class="dsp_btn_parent" id="add_notify" title="通知カラム追加"><div class="dsp_btn_add_ntfc_img"></div></div><div class="dsp_btn_parent" id="add_explore" title="Explore(ユニバーサル)カラム追加"><div class="dsp_btn_add_explr_img"></div></div><hr><div class="dsp_btn_parent" title="カラム段切り替え" id="second_rack"><div class="dsp_btn_second_rack_img"></div></div><hr><div class="dsp_btn_parent" title="プロファイル保存" id="profile_save"><div class="dsp_btn_profile_add_img"></div></div><div class="dsp_btn_parent" title="プロファイル削除" id="profile_delete"><div class="dsp_btn_profile_delete_img"></div></div>${profile_list_html}</p></div></div></section><section draggable="false" class="dsp_row_draggable_false dsp_row"><div opd_row_type="main_bar_empty_row" id="main_bar_empty_row" style="height:100%;min-width: 60px;max-width: 60px;"></div></section>`;
    //let side_bar = `<section class="dsp_row" style="position:fixed;z-index:999;height:98%;"><div draggable="false" opd_row_type="dsp_row" opd_row_width="%row_width_num%" style="height:100%;min-width: 100px;text-align: center;background-color: white;"><div><p style="margin-top:0;padding-top:1em;">Open-Deck<br>Prototype<br>v${chrome.runtime.getManifest().version}</p><hr><p>Debug<br><input type="button" id="init_settings" value="init settings"/><br><input type="button" id="profile_load_save" value="Profile Load"/><br><input type="button" id="dnr_reload" value="dNR_Reload"/><br><input type="button" id="ext_reload" value="Ext_Reload"/></p><hr><p><input type="button" id="add_timeline" value="Add TimeLine"/> <div class="dsp_btn_parent"><div class="dsp_btn_add_tl_img"></div></div><div class="dsp_btn_parent"><div class="dsp_btn_add_ntfc_img"></div></div><div class="dsp_btn_parent"><div class="dsp_btn_add_explr_img"></div></div> </p><p><input type="button" id="add_notify" value="Add Notification"/></p><p><input type="button" id="add_explore" value="Add Explore"/><hr><input type="button" id="second_rack" value="Second Rack"/><hr><input type="button" id="profile_save" value="Profile_Save"/><br><input type="button" id="profile_delete" value="Profile_Delete"/><br>${profile_list_html}</p></div></div></section><section draggable="false" class="dsp_row"><div opd_row_type="main_bar_empty_row" id="main_bar_empty_row" style="height:100%;min-width: 110px;"></div></section>`;
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
                let init_auto_reload_checked = "";
                let init_row_save_path = settings.row_settings[index].row_save_path;
                let init_row_save_title = settings.row_settings[index].row_save_title;
                let tw_view_type = settings.row_settings[index].tw_view_mode;
                let auto_reload_time = settings.row_settings[index].auto_reload_time / 1000;
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
                //自動更新
                if(settings.row_settings[index].type == "explore" || settings.row_settings[index].type == "home"){
                    if(settings.row_settings[index].auto_reload){
                        init_auto_reload_checked = "checked";
                        //%row_pinned_ch%
                    }else{
                    }
                }
                //一段目終了検出にもかかわらず設定が存在していた場合2段目の変数に保存
                if(first_row_end == true){
                    second_row_html += default_element[Object.keys(default_element)[default_index]]["html"].replaceAll("%row_save_path%", init_row_save_path).replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", banner_checked).replace("%row_top_bar_ch%", init_top_visible_checked).replace("%row_tw_view_mode%", tw_view_type).replace("%row_pinned_ch%", init_pinned_checked).replaceAll("%row_pinned_save_path%", init_pinned_path).replaceAll("%row_save_title%", init_row_save_title).replaceAll("%row_width_num%", row_width_init).replaceAll("%row_auto_reload_ch%", init_auto_reload_checked).replaceAll("%row_auto_reload_time%", auto_reload_time);
                }else{
                    main_row_html += default_element[Object.keys(default_element)[default_index]]["html"].replaceAll("%row_save_path%", init_row_save_path).replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", banner_checked).replace("%row_top_bar_ch%", init_top_visible_checked).replace("%row_tw_view_mode%", tw_view_type).replace("%row_pinned_ch%", init_pinned_checked).replaceAll("%row_pinned_save_path%", init_pinned_path).replaceAll("%row_save_title%", init_row_save_title).replaceAll("%row_width_num%", row_width_init).replaceAll("%row_auto_reload_ch%", init_auto_reload_checked).replaceAll("%row_auto_reload_time%", auto_reload_time);
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
    //APIリミット表示用
    document.querySelector("#api_limit_status").addEventListener("click", function(){
        if(api_limit_obj != null){
            alert(`現在のAPIリミット状況\r\n回数(使用回数/総使用可能数)-完全回復時間\r\n${api_limit_dsc_obj.time_line}${api_limit_dsc_obj.recommend_timeline}${api_limit_dsc_obj.search}`);
        }
    });
    //デバッグメニュー表示
    let debug_menu_click_counter = 0;
    document.querySelector(".opd_ui_logo").addEventListener("click", function(){
        if(debug_menu_click_counter >= 7){
            alert("デバッグメニューが利用できます!");
            document.querySelector(".opd_debug_menu").style.display = "block";
        }else{
            debug_menu_click_counter += 1;
        }
    });
    //2段目が存在する場合の処理
    if(first_row_end == true && second_row_end == true){
        second_rack_mode = true;
        document.querySelector("#first_rack_element").style.height = "50vh";
        document.querySelector("#second_rack_element").style.height = "50vh";
        /*for (let index = 0; index < document.querySelectorAll('.dsp_row[draggable="true"]').length; index++) {
            document.querySelectorAll('.dsp_row[draggable="true"]')[index].style.height = "calc(100% - 25px)";
        }*/

        //document.querySelector("style[second_row_css]").textContent = `#second_rack_element .dsp_row[draggable="true"]{height:calc(100% - 25px)}`;

        document.querySelector("#second_rack").value = "Single Rack";
        document.querySelector(".dsp_btn_second_rack_img").style.backgroundImage = `url(${chrome.runtime.getURL(ui_icon_define.column_single_rack)})`;
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
                //console.log(profile_store[index].profile)
                const preload_array = profile_store[index].profile;
                let preload_desc_array = new Array(); 
                let preload_desc_count = 0;
                for (let preload_index = 0; preload_index < preload_array.length; preload_index++) {
                    switch (preload_array[preload_index].type) {
                        case "dsp_row":
                            preload_desc_count = 0;
                            break;
                        case "main_bar_empty_row":
                            preload_desc_count = 0;
                            break;
                        case "empty_row":
                            preload_desc_array.push("<!-1段目終了-!>");
                            preload_desc_count = 0;
                            break;
                        case "second_empty_row":
                            preload_desc_array.push("<!-2段目終了-!>");
                            preload_desc_count = 0;
                            break;
                        case "home":
                            preload_desc_array.push(`${preload_desc_count}-タイムラインカラム`);
                            break;
                        case "notification":
                            preload_desc_array.push(`${preload_desc_count}-通知カラム`);
                            break;
                        case "explore":
                            preload_desc_array.push(`${preload_desc_count}-[${preload_array[preload_index].row_save_title}]-ユニバーサル(Explore)カラム`);
                            break;
                        default:
                            preload_desc_count = 0;
                            break;
                    }
                    preload_desc_count += 1;
                }
                //console.log(preload_desc_array)
                if(confirm(`プロファイル「${index}」を読み込みますか?\r\nカラム構成\r\n${preload_desc_array.join("\r\n")}`)){
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
                        //div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(form[role="search"]){display:none;}
                        this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1)div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1)`;
                    }else{
                        if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "home"){
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){display:none;} div[role="progressbar"] + div{display:none;}`;
                        }else{
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){display:none;}`;
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
                let opd_row_width_select = opd_row_div.querySelector(".opd_row_size_preset");
                let opd_row_banner_checkbox = opd_row_div.querySelector(".opd_banner");
                let opd_row_top_visible_checkbox = opd_row_div.querySelector(".opd_top_bar");
                let opd_row_pinned_checkbox = opd_row_div.querySelector(".opd_pinned_btn");
                let opd_row_auto_reload_checkbox = opd_row_div.querySelector(".opd_a_reload_bar");
                let opd_row_auto_reload_time_reload = opd_row_div.querySelector(".opd_a_reload_time_setting");
                let opd_row_tw_view_mode_opt = opd_row_div.querySelector(".opd_tw_view_mode");
                //設定パネルイベント
                opd_row_div.querySelector(".opd_settings_btn").addEventListener("click", function(){
                    const settings_panel = this.closest("div[opd_row_type]").querySelector(".dsp_row_settings_panel");
                    if(settings_panel.getAttribute("open") == null){
                        settings_panel.setAttribute("open", "");
                        settings_panel.style.display = "flex";
                    }else{
                        settings_panel.removeAttribute("open");
                        settings_panel.style.display = "none";
                    }
                })
                //設定パネル&ホバー時動作
                opd_row_div.querySelector(".dsp_row_settings_panel").addEventListener("mouseover", function(){
                    opd_row_div.closest(".dsp_row").setAttribute("draggable", "false");
                });
                opd_row_div.querySelector(".dsp_row_settings_panel").addEventListener("mouseleave", function(){
                    opd_row_div.closest(".dsp_row").setAttribute("draggable", "true");
                });
                //設定パネルカラム幅設定
                if(opd_row_width_select != null){
                    switch (opd_row_div.getAttribute("opd_row_width")){
                        case '15':
                            opd_row_width_select.value = 0;
                            break;
                        case '20':
                            opd_row_width_select.value = 1;
                            break;
                        case '30':
                            opd_row_width_select.value = 2;
                            break;
                        default:
                            opd_row_width_select.value = 3;
                            break;
                    }
                    opd_row_width_select.addEventListener("change", function(){
                        let preset_rem = null;
                        switch (this.value){
                            case '0':
                                preset_rem = 15;
                                break;
                            case '1':
                                preset_rem = 20;
                                break;
                            case '2':
                                preset_rem = 30;
                                break;
                            default:
                                preset_rem = 30;
                                break;
                        }
                        this.closest("div[opd_row_type]").setAttribute("opd_row_width", preset_rem);
                        this.closest("div[opd_row_type]").style.width = `${preset_rem}rem`;
                        row_settings_save("", last_load_profile);
                    })
                }
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
                        this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){display:none;}`;
                    }else{
                        if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "home"){
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){display:none;} div[role="progressbar"] + div{display:none;}`;
                        }else{
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){display:none;};`;
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
                //自動更新初期適用
                let reload_test = 0;
                let auto_reload_int = null;//チェックボックスイベントにも再利用
                if(opd_row_auto_reload_checkbox != null){
                    const auto_reload_target_elem = this;
                    console.log(opd_row_auto_reload_checkbox)
                    opd_row_auto_reload_time_reload.addEventListener("change", function(){
                        const auto_reload_time = auto_reload_target_elem.closest('div[opd_row_type]').querySelector(".opd_a_reload_time_setting");
                        if(Number(auto_reload_time.value) >= 1){
                            alert(`自動更新の秒数を${auto_reload_time.value}秒に設定しました`);
                            row_settings_save("", last_load_profile);
                        }else{
                            alert(`1秒以上の秒数を入力してください`);
                            auto_reload_time.value = '10';
                            row_settings_save("", last_load_profile);
                        }
                    });
                    //初期チェック動作
                    if(opd_row_auto_reload_checkbox.checked){
                        console.log("init update!")
                        const auto_reload_time_input = auto_reload_target_elem.closest('div[opd_row_type]').querySelector(".opd_a_reload_time_setting");
                        const auto_reload_load_time = Number(auto_reload_time_input.value) * 1000;
                        auto_reload_time_input.disabled = true;
                        auto_reload_int = setInterval(function(){
                            console.log("update!")
                            //console.log(auto_reload_target_elem.contentWindow)
                            if(auto_reload_target_elem.contentWindow.location.pathname == "/home"){
                                auto_reload_target_elem.contentWindow.document.querySelector('[aria-selected="true"]').click();
                            };
                            if(auto_reload_target_elem.contentWindow.location.pathname == "/search"){
                                reload_test += 1;
                                console.log(reload_test);
                                auto_reload_target_elem.contentWindow.scrollTo(0, 300);
                                setTimeout(function(){
                                    auto_reload_target_elem.contentWindow.scrollTo(0, 0);
                                }, 10);
                            };
                        }, auto_reload_load_time);
                    }
                }

                //カラム横幅設定イベント
                opd_row_width_btn.addEventListener("click", function(){
                    const now_width = this.closest("div[opd_row_type]").getAttribute("opd_row_width");
                    let row_width_preset  = this.closest("div[opd_row_type]").querySelector(".opd_row_size_preset");
                    let setting_width = prompt("カラム横幅のremを半角数字で入力\r\n目安 小:15 中:20 大:30 初期値:30\r\n11以下は入力できません", now_width);
                    console.log(setting_width);
                    if(setting_width != null){
                        const setting_width_num = Number(setting_width);
                        if(setting_width_num != NaN && setting_width_num > 11){
                            this.closest("div[opd_row_type]").setAttribute("opd_row_width", setting_width_num);
                            this.closest("div[opd_row_type]").style.width = `${setting_width_num}rem`;
                            row_settings_save("", last_load_profile);
                            switch (setting_width_num){
                                case 15:
                                    row_width_preset.value = 0;
                                    break;
                                case 20:
                                    row_width_preset.value = 1;
                                    break;
                                case 30:
                                    row_width_preset.value = 2;
                                    break;
                                default:
                                    row_width_preset.value = 3;
                                    break;
                            }
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
                        banner_mode_target_object.contentWindow.document.querySelector('head style[opd_banner_css]').textContent = `header[role="banner"]{visibility: hidden; width: 0;};`;
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
                            topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){display:none;}`;
                        }else{
                            console.log(this.closest("div[opd_row_type]").getAttribute("opd_row_type"))
                            if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "home"){
                                topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){visibility: hidden; height: 0;} div[aria-label="ホームタイムライン"] * +div:first-of-type [data-testid="cellInnerDiv"]{} div[role="progressbar"] + div{display:none;}`;
                            }else{
                                topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){visibility: hidden; height: 0;};`;
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
                //自動更新モードイベント
                if(opd_row_auto_reload_checkbox != null){
                    opd_row_auto_reload_checkbox.addEventListener("click", function(){
                        let auto_reload_target_object = this.closest("div[opd_row_type]").querySelector("iframe");
                        const auto_reload_time_input = this.closest("div[opd_row_type]").querySelector(".opd_a_reload_time_setting");
                        const auto_reload_time = Number(auto_reload_time_input.value) * 1000;
                        if(this.checked){
                            auto_reload_time_input.disabled = true;
                            auto_reload_int = setInterval(function(){
                                console.log("update!")
                                //console.log(auto_reload_target_object.contentWindow)
                                if(auto_reload_target_object.contentWindow.location.pathname == "/home"){
                                    auto_reload_target_object.contentWindow.document.querySelector('[aria-selected="true"]').click();
                                };
                                if(auto_reload_target_object.contentWindow.location.pathname == "/search"){
                                    auto_reload_target_object.contentWindow.scrollTo(0, 300);
                                    setTimeout(function(){
                                        auto_reload_target_object.contentWindow.scrollTo(0, 0);
                                    }, 10);
                                };
                            }, auto_reload_time);
                            console.log(auto_reload_time)
                            row_settings_save("", last_load_profile);
                        }else{
                            auto_reload_time_input.disabled = false;
                            console.log("update stop!")
                            clearInterval(auto_reload_int);
                            row_settings_save("", last_load_profile);
                        }
                    });
                }
                /*if(this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "explore" || this.closest("div[opd_row_type]").getAttribute("opd_row_type") == "home"){
                    
                }*/
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
    //URL, ページタイトル監視
    function mutate_url(element){
        let exp_object = element.querySelector("iframe");
        exp_object.addEventListener("load", function(){
            let exp_old_url = exp_object.contentWindow.location.href;
                    let exp_observer = new MutationObserver(function(){
                        if(exp_old_url != exp_object.contentWindow.location.href){
                            let exp_url = new URL(exp_object.contentWindow.location.href);
                            let exp_title = exp_object.contentWindow.document.title.replace(" / X", "");
                            console.log(`${exp_url.pathname}${exp_url.search}`);
                            element.setAttribute("opd_explore_path", `${exp_url.pathname}${exp_url.search}`);
                            exp_old_url = exp_object.contentWindow.location.href;
                            element.setAttribute("opd_explore_title", exp_title);
                            console.log(exp_title);
                            row_settings_save("", last_load_profile);
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
            console.log(default_element.second_empty_row)
            //const second_rack_empty_html = `<section draggable="false" id="row_%row_num%" class="dsp_row dsp_row_second_emptyrow"><div opd_row_type="second_empty_row" style="height: calc(100% - 20px);min-width: 30rem;display: flex;align-items: center;justify-content: center;"><p>2段目<br>1段目のカラムが配置できます</p></div></section>`;
            const second_rack_default_html = default_element.second_empty_row.html.replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_tw_view_mode%", "0");
            document.querySelector("#second_rack_element").insertAdjacentHTML("beforeend", second_rack_default_html);
            /*for (let index = 0; index < document.querySelectorAll('.dsp_row[draggable="true"]').length; index++) {
                document.querySelectorAll('.dsp_row[draggable="true"]')[index].style.height = "calc(100% - 25px)";
            }*/
            //document.querySelector("style[second_row_css]").textContent = `.dsp_row[draggable="true"]{height:calc(100% - 25px)}`;
            //document.querySelector(".dsp_row_second_emptyrow").scrollIntoView({behavior: "smooth",inline: "end"});
            append_object_css();
            row_dd();
            row_close();
            row_settings_save("", last_load_profile);
            second_rack_mode = true;
            document.querySelector("#second_rack").value = "Single Rack";
            document.querySelector(".dsp_btn_second_rack_img").style.backgroundImage = `url(${chrome.runtime.getURL(ui_icon_define.column_single_rack)})`;
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
                document.querySelector(".dsp_btn_second_rack_img").style.backgroundImage = `url(${chrome.runtime.getURL(ui_icon_define.column_second_rack)})`;
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
        const new_row = default_element["home"]["html"].replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_top_bar_ch%", "checked").replace("%row_tw_view_mode%", "0").replaceAll("%row_width_num%", "30").replaceAll("%row_auto_reload_ch%", "").replaceAll("%row_auto_reload_time%", "10000");
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
        const new_row = default_element["explore"]["html"].replaceAll("%row_save_path%", "/explore").replaceAll("%row_num%", create_random_id()).replace("%row_banner_ch%", "").replace("%row_top_bar_ch%", "checked").replace("%row_tw_view_mode%", "0").replaceAll("%row_pinned_save_path%", "").replaceAll("%row_width_num%", "30").replaceAll("%row_auto_reload_ch%", "").replaceAll("%row_auto_reload_time%", "10000");
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
                    profile_list_btn_html += `<div class="dsp_btn_parent" id="userProfile-${index}"><div class="dsp_btn_change_profile_btn">P${index}</div></div>`;
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
                        profile_list_btn_html += `<div class="dsp_btn_parent" id="userProfile-${index}"><div class="dsp_btn_change_profile_btn">P${index}</div></div>`;
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
                console.log(this)
                row_copy_source = this;
                ev.dataTransfer.setData('text/html', ev.target.id);
            });
            row_class[index].addEventListener("dragover", function(ev){
                ev.preventDefault();
                this.style.borderLeft = '15px solid #2e2e2e';
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
                if(dr_elem != null){
                    if(dr_elem?.querySelector("div")?.getAttribute("opd_row_type") == 'explore'){
                        // && dr_elem.querySelector("div").querySelector("iframe").src != `https://twitter.com${dr_elem.querySelector("div").getAttribute("opd_explore_path")}`
                        //console.log(dr_elem.querySelector("div").getAttribute("opd_explore_path"))
                        //console.log(dr_elem.querySelector("div").getAttribute("opd_pinned_path"))
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
                }else{
                    this.style.borderLeft = '';
                }
                
            })
        }
    }
    //カラム終了
    function row_close(){
        for (let index = 0; index < document.querySelectorAll(".row_close_btn").length; index++) {
            document.querySelectorAll(".row_close_btn")[index].addEventListener("click", function(){
                this.closest(".dsp_row").remove();
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
            let row_page_title = null;
            let row_width_value = null;
            let row_auto_reload = null;
            let row_auto_reload_time = 10000;
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
                //タイトル
                row_page_title = document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_explore_title");
            }else{
                row_open_path = "";
                row_pinned_save_path = "";
            }
            //自動更新
            if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_type") == 'explore' || document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_type") == 'home'){
                if(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].querySelector(".opd_a_reload_bar")?.checked == true){
                    row_auto_reload = true;
                }else{
                    row_auto_reload = false;
                }
                const row_setting_time = Number(document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].querySelector(".opd_a_reload_time_setting").value) * 1000;
                console.log(row_setting_time)
                if(row_setting_time >= 1000){
                    
                    row_auto_reload_time = row_setting_time;
                }else{
                    row_auto_reload_time = 10000;
                }
            }
            settings_array["row_settings"].push({type:document.querySelectorAll("#opd_main_element div[opd_row_type]")[index].getAttribute("opd_row_type"), banner:banner_checked, top_visible:top_visible_checked, tw_view_mode:tw_view_type, row_save_path:row_open_path, row_save_title:row_page_title, row_pinned_path:row_pinned_save_path, auto_reload:row_auto_reload, auto_reload_time:row_auto_reload_time, row_width:row_width_value});
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
    const profile_store_default = [{type:"main_bar_empty_row", banner:false, top_visible:true, tw_view_mode:"0", row_save_path:"", row_save_title:"", row_pinned_path:"", auto_reload:false, auto_reload_time:10000, row_width:null}, {type:"home", banner:true, top_visible:true, tw_view_mode:"0", row_save_path:"", row_save_title:"", row_pinned_path:"", auto_reload:false, auto_reload_time:10000, row_width:null}, {type:"notification", banner:false, top_visible:true, tw_view_mode:"0", row_save_path:"", auto_reload:false, auto_reload_time:10000, row_pinned_path:"", row_save_title:"", row_width:null}, {type:"explore", banner:false, top_visible:true, tw_view_mode:"0", exp_type:"", row_save_path:"/explore", row_save_title:"", row_pinned_path:"", auto_reload:false, auto_reload_time:10000, row_width:null}, {type:"empty_row", banner:false, top_visible:true, tw_view_mode:"0", row_save_path:"", row_save_title:"", row_pinned_path:"", auto_reload:false, auto_reload_time:10000, row_width:null}];
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