console.log("Welcome to Open-Deck!");
const manifest = chrome.runtime.getManifest();
//試作版の場合は true にする
const is_prototype = false;
if(is_prototype){
    console.log("%cOpen-Deck Prototype", "background:#a1f4ff;padding:5px;border-radius:5px", `Version:${manifest.version}`);
}else{
    console.log("%cOpen-Deck", "background:#a1f4ff;padding:5px;border-radius:5px", `Version:${manifest.version}`);
}
//
const url_path = new URL(location.href);
const i18n_message = chrome.i18n.getMessage;
let is_shift_pressed = false;
let profile_store;
let last_load_profile = 0;
let is_removed_default_style = false;
let media_viewer_token = [];
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
    add_post_column:"icon/post.svg",
    add_timeline_column:"icon/tl_column.svg",
    add_notification_column:"icon/notice_column.svg",
    add_explore_column:"icon/exp_column.svg",
    column_single_rack:"icon/single_view.svg",
    column_second_rack:"icon/second_view.svg",
    profile_save:"icon/profile_save.svg",
    profile_delete:"icon/profile_delete.svg",
    text_review:"icon/text_review.svg",
    forward:"icon/forward.svg",
    next:"icon/next.svg",
    download:"icon/download.svg"
}
//UNIX時間分秒変換
function unix_time_mmss(input){
    const date = new Date(input * 1000);
    return date.toLocaleTimeString();
}
//ショートカットキー用に shift キーが押されていることを検出
document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') is_shift_pressed = true;
});
document.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') is_shift_pressed = false;
});
//ストレージの書き込み監視(主にAPIリミット監視に使う)
let api_limit_obj = null;
let api_limit_dsc_obj = {time_line:"", recommend_timeline:"", search:""};
chrome.storage.onChanged.addListener((changes, namespace) => {
    if(changes.api_access_limit != undefined){
        //console.log(changes)
        api_limit_obj = changes.api_access_limit.newValue;
        const api_linit_status_btn = document.querySelector("#api_limit_status");
        if(api_linit_status_btn != null){
            let timeline_limit_percentage = 99999;
            let recommend_timeline_limit_percentage = 99999;
            let search_limit_percentage = 99999;
            if(api_limit_obj.time_line.remaining != null){
                timeline_limit_percentage = api_limit_obj.time_line.remaining / api_limit_obj.time_line.limit * 100;
                api_limit_dsc_obj.time_line = `${i18n_message("label_api_timeline")}${api_limit_obj.time_line.remaining}/${api_limit_obj.time_line.limit}-${unix_time_mmss(api_limit_obj.time_line.reset_unix_time)}\r\n`;
            }else{
                //初期状態
            }
            if(api_limit_obj.recommend_timeline.remaining != null){
                recommend_timeline_limit_percentage = api_limit_obj.recommend_timeline.remaining / api_limit_obj.recommend_timeline.limit * 100;
                api_limit_dsc_obj.recommend_timeline = `${i18n_message("label_api_recommend_timeline")}${api_limit_obj.recommend_timeline.remaining}/${api_limit_obj.recommend_timeline.limit}-${unix_time_mmss(api_limit_obj.recommend_timeline.reset_unix_time)}\r\n`;
            }else{
                //初期状態
            }
            if(api_limit_obj.search.remaining != null){
                search_limit_percentage = api_limit_obj.search.remaining / api_limit_obj.search.limit * 100;
                api_limit_dsc_obj.search = `${i18n_message("label_api_search")}${api_limit_obj.search.remaining}/${api_limit_obj.search.limit}-${unix_time_mmss(api_limit_obj.search.reset_unix_time)}`;
            }else{
                //初期状態
            }
            api_linit_status_btn.textContent = `${Math.floor(Math.min(timeline_limit_percentage, recommend_timeline_limit_percentage, search_limit_percentage))}%`;
            api_linit_status_btn.title = `${i18n_message("msg_api_limit_status_title", [`${api_limit_dsc_obj.time_line}${api_limit_dsc_obj.recommend_timeline}${api_limit_dsc_obj.search}`])}`;
        }
    }
  });
//
if(location.href == "https://twitter.com/run-opdeck" || location.href == "https://x.com/run-opdeck"){
    //testmode
    if(url_path.pathname == "/run-opdeck_test.html"){
        //init();
        console.log("testmode")
        chrome.runtime.sendMessage({message: "dnr_upd_internal_dsp"}).then((value)=>{
            init();
        });
    }else{
        if(navigator.brave != undefined){
            chrome.runtime.sendMessage({message: "dnr_upd"}).then((value)=>{
                init();
            });
            //init();
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
                if(JSON.parse(value.opd_settings).last_load_profile == undefined){
                    if(confirm(i18n_message("msg_profile_data_broken_confirm"))){
                        chrome.storage.local.remove("opd_settings", function(){
                            alert(i18n_message("msg_profile_init_completed"));
                        });
                    }else{
                        last_load_profile = 0;
                    }
                }else{
                    last_load_profile = JSON.parse(value.opd_settings).last_load_profile;
                }
                //console.log(last_load_profile);
            }
            
            chrome.storage.local.get("opd_profile_store", function(store_value){
                //console.log(store_value)
                //console.log(JSON.parse(store_value.opd_profile_store))
                profile_store = JSON.parse(store_value.opd_profile_store);
                //RUN
                let ext_update_flag = null;
                let ext_settings = null;
                if(value.opd_settings != undefined){
                    if(JSON.parse(value.opd_settings).version != manifest.version){
                        ext_update_flag = true;
                    }else{
                        ext_update_flag = false;
                    }
                }
                if(value.opd_settings == undefined || ext_update_flag == true){
                    //settings_init();
                    //ext_settings = JSON.parse(value.opd_settings);
                    if(profile_store[last_load_profile]?.profile == undefined){
                        let recovery_setting = JSON.parse(value.opd_settings);
                        recovery_setting.last_load_profile = 0;
                        chrome.storage.local.set({'opd_settings': JSON.stringify(recovery_setting)}, function(){
                            alert(i18n_message("msg_settings_auto_repair"));
                            last_load_profile = 0;
                            window.reload();
                        });
                    }
                    ext_settings = {column_settings:profile_store[last_load_profile].profile};
                }else{
                    //ext_settings = JSON.parse(value.opd_settings);
                    if(profile_store[last_load_profile]?.profile == undefined){
                        let recovery_setting = JSON.parse(value.opd_settings);
                        recovery_setting.last_load_profile = 0;
                        chrome.storage.local.set({'opd_settings': JSON.stringify(recovery_setting)}, function(){
                            alert(i18n_message("msg_settings_auto_repair"));
                            last_load_profile = 0;
                            window.reload();
                        });
                    }
                    ext_settings = {column_settings:profile_store[last_load_profile].profile};
                }
                //console.log(ext_settings);
                run(ext_settings);
            });
        });
    }
}
function run(settings){
    //console.log(settings)
    let profile_list_html;
    let profile_list_btn_html = "";
    //プロファイルリスト初期化
    for (let index = 0; index < profile_store.length; index++) {
        profile_list_btn_html += `<div class="dsp_btn_parent" title="${i18n_message("ui_profile_switch_title")}" id="userProfile-${index}"><div class="dsp_btn_change_profile_btn">P${index}</div></div>`;//<div class="profile_list"><input type="button" id="userProfile-${index}" value="P${index}"></div>
    }
    profile_list_html = `<div class="profile_val_now" title="${i18n_message("ui_profile_current_title")}">${last_load_profile}</div><div class="dsp_profile_list"><div id="profile_btn_list">${profile_list_btn_html}</div>`;
    //console.log(profile_list_btn_html)
    //画像表示パネル
    const media_viewer = new OpdExtMediaViewer();
    document.addEventListener('opd_send_media_info', (e) => {
        const detail = JSON.parse(e.detail);
        console.log(detail)
        console.log(media_viewer_token)
        for (let index = 0; index < media_viewer_token.length; index++) {
            const token = media_viewer_token[index];
            if(detail.token === token){
                media_viewer.Preview(detail.media_info, detail.selected_index);
                break;
            }
        }
    });
    //CSSタグ追加
    document.querySelector("head").insertAdjacentHTML("afterbegin", `<style second_column_css></style>
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
    .opd_version_span{
        cursor: pointer;
    }
    .opd_debug_menu{
        display: none;
    }
    #opd_main_element{
        background: #e4e4e4 !important;
    }
    div[opd_column_type="dsp_column"]{
        overflow-x: scroll;
        scrollbar-width: none;
    }
    #main_bar_empty_column{
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
        background-image: url(${chrome.runtime.getURL("icon/logo_icon.svg")});
        height: 50px;
        width: 50px;
        cursor: pointer;
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
    .dsp_column_emptycolumn p{
        text-align: center;
    }
    .dsp_column_second_emptycolumn p{
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
    .dsp_btn_add_post_img{
        filter: brightness(0) saturate(100%) invert(11%) sepia(16%) saturate(13%) hue-rotate(322deg) brightness(107%) contrast(80%);
        background-size: cover;
        background-repeat: no-repeat;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.add_post_column)});
        height: 69%;
        width: 69%;
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
    .dsp_column_draggable_true{
        border-left: solid 3px #0000002e;
        border-right: solid 3px #0000002e;
        border-bottom: solid 3px #0000002e;
        /*overflow: hidden;*/
        background-color: white;
        border-radius: 6px 6px;
    }
    .dsp_column_draggable_true div[opd_column_type]{
        display: flex;
        flex-direction: column;
    }
    .dsp_column iframe{
        border: 0;
    }
    .dsp_column_btn{
        width: 20px;
        min-width: 20px;
        border-radius: 2px;
        overflow: hidden;
        margin-right: 5px;
    }
    .dsp_column_btn:hover{
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
    .dsp_column_title{
        width: auto;
        background-color: white;
        margin-right: 5px;
    }
    .dsp_column_move_icon_parent{
        max-height: 20px;
        display: flex;
        flex-direction: row;
        align-items: center;
    }
    .dsp_column_move_icon{
        display: block;
        filter: brightness(0) saturate(100%) invert(61%) sepia(13%) saturate(13%) hue-rotate(335deg) brightness(89%) contrast(79%);
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_move)});
        background-size: cover;
        width: 15px;
        height: 15px;   
    }
    .dsp_column_settings_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_settings)});
        background-size: cover;
        width: 20px;
        height: 20px;    
    }
    .dsp_column_settings_btn:hover{
        cursor: pointer;
    }
    .dsp_column_settings_btn input{
        display: none;
    }
    .dsp_column_close_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_close)});
        background-size: 15px;
        background-repeat: no-repeat;
        background-position: center;
        width: 20px;
        height: 20px;    
    }
    .dsp_column_close_btn:hover{
        cursor: pointer;
    }
    .dsp_column_close_btn input{
        display: none;
    }

    .dsp_column_banner_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.banner_hide)});
        transform: rotate(180deg);
        background-size: cover;
        width: 20px;
        height: 20px;
    }
    input:checked + .dsp_column_banner_btn{
        transform: rotate(0deg);
    }
    .dsp_column_btn input{
        opacity: 0;
        position: absolute;
        z-index: 10;
        margin: 0;
        width: 20px;
        height: 20px;
        cursor: pointer;
    }
    .dsp_column_top_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.top_bar_hide)});
        transform: rotate(180deg);
        background-size: cover;
        width: 20px;
        height: 20px;
        cursor: pointer;  
    }
    input:checked + .dsp_column_top_btn{
        transform: rotate(0deg);
    }
    .dsp_column_top_btn input{
        opacity: 0;
        position: absolute;
        z-index: 10;
        margin: 0;
        width: 20px;
        height: 20px;
    }
    .dsp_column_close_btn_wrap{
        display: flex;
        width: 100%;
        justify-content: flex-end;
    }
    .dsp_column_close_btn input{
        display: none;
    }

    .dsp_column_pin_btn{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_pin)});
        background-size: cover;
        width: 20px;
        height: 20px;    
    }
    input:checked + .dsp_column_pin_btn{
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_pinned)});
    }
    .dsp_column_pin_btn input{
        opacity: 0;
        position: absolute;
        z-index: 10;
        margin: 0;
        width: 20px;
        height: 20px;
    }

    .dsp_column_settings_panel{
        display: none;
        position: relative;
        width: inherit;
        height: auto;
        background: #efefefeb;
        border: 1px solid #a9a9a9eb;
        flex-direction: column;
    }
    .dsp_column_settings_panel h2{
        /*margin: 0 0 0.2rem;*/
        margin: 0;
    }
    .dsp_column_settings_panel_content{
        margin-left: 0.5rem;
    }
    .dsp_column_settings_panel_content h2{
        font-size: 1.2rem;
    }
    .opd_column_settings_input_text{
        width: 5rem;
        margin-right: 0.2rem;
    }
    .dsp_column_settings_list{
        background: white;
        border-radius: 5px;
        margin: 0 0.5rem 0.5rem 0;
        padding: 0.5rem;
    }
    .dsp_column_settings_content_div{
        margin-bottom: 0.1rem;
        display: flex;
        justify-content: space-between;
    }
    .dsp_column_settings_panel_close_btn_wrap{
        display: flex;
        flex-direction: row;
        justify-content: center;
        margin: 0 0.5rem 0.5rem 0;
    }
    .opd_ui_icon_color{
        filter: brightness(0) saturate(100%) invert(11%) sepia(16%) saturate(13%) hue-rotate(322deg) brightness(107%) contrast(80%);
    }
    /*#main_rack_element section:first-child{
        margin-left:110px
    }*/
    @media (prefers-color-scheme: dark) {
        #main_rack_element{
            background-color: black !important;
        }
        .dsp_column_draggable_false, #first_rack_element, #second_rack_element, #second_rack_element, #main_bar_empty_column{
            background-color: black !important;
        }
        .dsp_column_draggable_true, .dsp_column_title{
            background-color: #2e2e2e !important;
        }
        .dsp_btn_add_post_img, .dsp_btn_add_tl_img, .dsp_btn_add_ntfc_img, .dsp_btn_add_explr_img, .dsp_btn_second_rack_img, .dsp_btn_profile_add_img, .dsp_btn_profile_delete_img, .dsp_column_move_icon, .opd_ui_icon_color{
            filter: brightness(0) saturate(100%) invert(48%) sepia(0%) saturate(93%) hue-rotate(266deg) brightness(93%) contrast(86%);
        }
        #api_limit_status:hover {
            background: #555555;
        }
        .dsp_btn_parent:hover{
            background: #555555;
        }
        .dsp_column_btn:hover {
            background: #555555;
        }
        .profile_val_now:hover {
            background: #555555;
        }
        .dsp_column_settings_panel {
            background: #2e2e2e;
            border: 1px solid #5d5d5d;
        }
        .dsp_column_settings_list {
            background: #474747
        }
        
    }
    /*ダークモード検出時*/
    #opd_main_element[opd-dsp-theme="dark"]{
        
    }
    #opd_main_element[opd-dsp-theme="dark"] #main_rack_element{
        background-color: black !important;
    }
    #opd_main_element[opd-dsp-theme="dark"] .dsp_column_draggable_false, #opd_main_element[opd-dsp-theme="dark"] #first_rack_element, #opd_main_element[opd-dsp-theme="dark"] #second_rack_element, #opd_main_element[opd-dsp-theme="dark"] #second_rack_element, #opd_main_element[opd-dsp-theme="dark"] #main_bar_empty_column{
        background-color: black !important;
    }
    #opd_main_element[opd-dsp-theme="dark"] .dsp_column_draggable_true, #opd_main_element[opd-dsp-theme="dark"] .dsp_column_title{
        background-color: #2e2e2e !important;
    }
    #opd_main_element[opd-dsp-theme="dark"] .dsp_btn_add_post_img, #opd_main_element[opd-dsp-theme="dark"] .dsp_btn_add_tl_img, #opd_main_element[opd-dsp-theme="dark"] .dsp_btn_add_ntfc_img, #opd_main_element[opd-dsp-theme="dark"] .dsp_btn_add_explr_img, #opd_main_element[opd-dsp-theme="dark"] .dsp_btn_second_rack_img, #opd_main_element[opd-dsp-theme="dark"] .dsp_btn_profile_add_img, #opd_main_element[opd-dsp-theme="dark"] .dsp_btn_profile_delete_img, #opd_main_element[opd-dsp-theme="dark"] .dsp_column_move_icon, #opd_main_element[opd-dsp-theme="dark"] .opd_ui_icon_color{
        filter: brightness(0) saturate(100%) invert(48%) sepia(0%) saturate(93%) hue-rotate(266deg) brightness(93%) contrast(86%);
    }
    #opd_main_element[opd-dsp-theme="dark"] #api_limit_status:hover {
        background: #555555;
    }
    #opd_main_element[opd-dsp-theme="dark"] .dsp_btn_parent:hover{
        background: #555555;
    }
    #opd_main_element[opd-dsp-theme="dark"] .dsp_column_btn:hover {
        background: #555555;
    }
    #opd_main_element[opd-dsp-theme="dark"] .profile_val_now:hover {
        background: #555555;
    }
    #opd_main_element[opd-dsp-theme="dark"] .dsp_column_settings_panel {
        background: #2e2e2e;
        border: 1px solid #5d5d5d;
    }
    #opd_main_element[opd-dsp-theme="dark"] .dsp_column_settings_list {
        background: #474747
    }
    /* メディアビューワー */
    ::backdrop {
        background: #474747;
        opacity: 0.75;
    }
    #opd_media_viewer:focus {
        outline: none;
    }
    .opd_media_viewer_func_btn{
        border: 0;
        background: #00000000;
        cursor: pointer;
        outline: none;
    }
    .opd_media_viewer_func_btn_circle button{
        border: 0;
        background: #00000000;
        cursor: pointer;
        outline: none;
        border-radius: 10px;
    }
    button[disabled].opd_media_viewer_func_btn{
        visibility: hidden;
    }
    .opd_media_viewer_func_btn:hover{
        background: #5555558a;
    }
    .opd_media_viewer_func_btn_circle button:hover{
        background: #5555558a;
    }
    .media_viewer_icon_close{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.column_close)});
        background-size: 20px;
        background-repeat: no-repeat;
        background-position: center;
        width: 20px;
        height: 20px;
        padding: 5px;
    }
    .media_viewer_icon_forward{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.forward)});
        background-size: 20px;
        background-repeat: no-repeat;
        background-position: center;
        width: 30px;
        height: 30px;
        padding: 5px;
    }
    .media_viewer_icon_next{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.next)});
        background-size: 20px;
        background-repeat: no-repeat;
        background-position: center;
        width: 30px;
        height: 30px;
        padding: 5px;
    }
    .media_viewer_icon_download{
        display: block;
        background-image: url(${chrome.runtime.getURL(ui_icon_define.download)});
        background-size: 20px;
        background-repeat: no-repeat;
        background-position: center;
        width: 30px;
        height: 30px;
        padding: 5px;
    }
    </style>`);
    //カラム要素作成-挿入
    let default_element_bar = `<span class="dsp_column_btn"><label class="dsp_column_settings_btn opd_ui_icon_color" title="${i18n_message("ui_column_settings_title")}"><input class="opd_settings_btn" type="button" value="S"></label></span><span class="dsp_column_btn"><input class="opd_banner" type="checkbox" title="${i18n_message("ui_column_banner_toggle_title")}" %column_banner_ch%><label class="dsp_column_banner_btn opd_ui_icon_color"></label></span><span class="dsp_column_btn"><input class="opd_top_bar" type="checkbox" title="${i18n_message("ui_column_top_toggle_title")}" %column_top_bar_ch%><label class="dsp_column_top_btn opd_ui_icon_color"></label></span>`;
    let post_element_bar = `<span class="dsp_column_btn"><label class="dsp_column_settings_btn opd_ui_icon_color" title="${i18n_message("ui_column_settings_title")}"><input class="opd_settings_btn" type="button" value="S"></label></span>`;
    let othersns_default_element_bar = `<span class="dsp_column_btn"><label class="dsp_column_settings_btn opd_ui_icon_color" title="${i18n_message("ui_column_settings_title")}"><input class="opd_settings_btn" type="button" value="S"></label></span>`;
    let column_settings_panel = `<div class="dsp_column_settings_panel"><div class="dsp_column_settings_panel_content"><h2>${i18n_message("ui_settings_header")}</h2><div class="dsp_column_settings_list"><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_view_mode_label")}<span><select class="opd_tw_view_mode" column_tw_view_mode_val="%column_tw_view_mode%"><option value="0">${i18n_message("ui_settings_view_mode_all")}</option><option value="1">${i18n_message("ui_settings_view_mode_text_only")}</option><option value="2">${i18n_message("ui_settings_view_mode_media_only")}</option></select></span></div><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_column_width_label")}<span><select class="opd_column_size_preset"><option value="0">${i18n_message("ui_settings_column_width_small")}</option><option value="1">${i18n_message("ui_settings_column_width_medium")}</option><option value="2">${i18n_message("ui_settings_column_width_large")}</option><option value="3">${i18n_message("ui_settings_column_width_custom")}</option></select></span></div><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_column_width_custom_label")}<span><input type="button" class="column_width_btn" value="${i18n_message("ui_settings_column_width_custom_button")}" style="vertical-align: text-top;font-size: 0.8rem;"/></span></div><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_auto_reload_label")}<span><input class="opd_a_reload_bar" type="checkbox" %column_auto_reload_ch%></span></div><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_auto_reload_interval_label")}<span><input class="opd_column_settings_input_text opd_a_reload_time_setting" type="number" value="%column_auto_reload_time%">${i18n_message("ui_settings_seconds_suffix")}</span></div></div><div class="dsp_column_settings_panel_close_btn_wrap"><input type="button" class="dsp_column_settings_panel_close_btn" value="${i18n_message("ui_settings_close_button")}" style="vertical-align: text-top;font-size: 0.8rem;"/></div></div></div>` ;
    let column_settings_panel_no_auto = `<div class="dsp_column_settings_panel"><div class="dsp_column_settings_panel_content"><h2>${i18n_message("ui_settings_header")}</h2><div class="dsp_column_settings_list"><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_view_mode_label")}<span><select class="opd_tw_view_mode" column_tw_view_mode_val="%column_tw_view_mode%"><option value="0">${i18n_message("ui_settings_view_mode_all")}</option><option value="1">${i18n_message("ui_settings_view_mode_text_only")}</option><option value="2">${i18n_message("ui_settings_view_mode_media_only")}</option></select></span></div><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_column_width_label")}<span><select class="opd_column_size_preset"><option value="0">${i18n_message("ui_settings_column_width_small")}</option><option value="1">${i18n_message("ui_settings_column_width_medium")}</option><option value="2">${i18n_message("ui_settings_column_width_large")}</option><option value="3">${i18n_message("ui_settings_column_width_custom")}</option></select></span></div><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_column_width_custom_label")}<span><input type="button" class="column_width_btn" value="${i18n_message("ui_settings_column_width_custom_button")}" style="vertical-align: text-top;font-size: 0.8rem;"/></span></div></div><div class="dsp_column_settings_panel_close_btn_wrap"><input type="button" class="dsp_column_settings_panel_close_btn" value="${i18n_message("ui_settings_close_button")}" style="vertical-align: text-top;font-size: 0.8rem;"/></div></div></div>` ;
    let column_settings_panel_othersns = `<div class="dsp_column_settings_panel"><div class="dsp_column_settings_panel_content"><h2>${i18n_message("ui_settings_header")}</h2><div class="dsp_column_settings_list"><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_column_width_label")}<span><select class="opd_column_size_preset"><option value="0">${i18n_message("ui_settings_column_width_small")}</option><option value="1">${i18n_message("ui_settings_column_width_medium")}</option><option value="2">${i18n_message("ui_settings_column_width_large")}</option><option value="3">${i18n_message("ui_settings_column_width_custom")}</option></select></span></div><div class="dsp_column_settings_content_div">${i18n_message("ui_settings_column_width_custom_label")}<span><input type="button" class="column_width_btn" value="${i18n_message("ui_settings_column_width_custom_button")}" style="vertical-align: text-top;font-size: 0.8rem;"/></span></div></div><div class="dsp_column_settings_panel_close_btn_wrap"><input type="button" class="dsp_column_settings_panel_close_btn" value="${i18n_message("ui_settings_close_button")}" style="vertical-align: text-top;font-size: 0.8rem;"/></div></div></div>` ;
    let default_element = {
        /*main_bar_empty_column:{html:`<!--<section draggable="false" class="dsp_column"><div opd_column_type="main_bar_empty_column" opd_column_width="%column_width_num%" id="main_bar_empty_column" style="height:100%;min-width: 70px;"></div></section>-->`},*/
        empty_column:{html:`<section draggable="false" id="column_%column_num%" class="dsp_column_draggable_false dsp_column dsp_column_emptycolumn"><div opd_column_type="empty_column" opd_column_width="%column_width_num%" style="height: 100%;min-width: 30rem;display: flex;align-items: center;justify-content: center;"><div><img src="${chrome.runtime.getURL(ui_icon_define.column_add_1)}" style="filter: brightness(0) saturate(100%) invert(61%) sepia(13%) saturate(13%) hue-rotate(335deg) brightness(89%) contrast(79%);"><p>${i18n_message("ui_empty_column_message")}</p></div></div></section>`},
        post:{html:`<section draggable="true" id="column_%column_num%" class="dsp_column_draggable_true dsp_column"><div opd_column_type="post" opd_column_width="%column_width_num%" style="height: 100%;width: %column_width_num%rem;min-width: 1rem;"><div class="column_bar" style="height: max-content;"><span class="dsp_column_title"><div class="dsp_column_move_icon_parent"><span class="dsp_column_move_icon"></span><span>${i18n_message("ui_column_post_title")}</span></div></span>${post_element_bar}<div class="dsp_column_close_btn_wrap"><span class="dsp_column_btn"><label class="dsp_column_close_btn opd_ui_icon_color" title="${i18n_message("ui_column_close_title")}"><input type="button" class="column_close_btn" value="X"/></label></span></div></div>${column_settings_panel_no_auto}<iframe auto_reload_mouse_hover="false" allow="fullscreen" src="https://x.com/compose/post" type="text/html" style="width: 100%;height: 100%;" opd_init_webview></iframe></div></section>`},
        second_empty_column:{html:`<section draggable="false" id="column_%column_num%" class="dsp_column_draggable_false dsp_column dsp_column_second_emptycolumn"><div opd_column_type="second_empty_column" opd_column_width="%column_width_num%" style="height:100%;min-width: 30rem;overflow: hidden;display: flex;align-items: center;justify-content: center;"><div><img src="${chrome.runtime.getURL(ui_icon_define.column_add_2)}" style="filter: brightness(0) saturate(100%) invert(61%) sepia(13%) saturate(13%) hue-rotate(335deg) brightness(89%) contrast(79%);"><p>${i18n_message("ui_second_empty_column_message")}</p></div></div></section>`},
        home:{html:`<section draggable="true" id="column_%column_num%" class="dsp_column_draggable_true dsp_column"><div opd_column_type="home" opd_column_width="%column_width_num%" style="height: 100%;width: %column_width_num%rem;min-width: 1rem;"><div class="column_bar" style="height: max-content;"><span class="dsp_column_title"><div class="dsp_column_move_icon_parent"><span class="dsp_column_move_icon"></span><span>${i18n_message("ui_column_timeline_title")}</span></div></span>${default_element_bar}<div class="dsp_column_close_btn_wrap"><span class="dsp_column_btn"><label class="dsp_column_close_btn opd_ui_icon_color" title="${i18n_message("ui_column_close_title")}"><input type="button" class="column_close_btn" value="X"/></label></span></div></div>${column_settings_panel}<iframe auto_reload_mouse_hover="false" allow="fullscreen" src="https://x.com/home" type="text/html" style="width: 100%;height: 100%;" opd_init_webview></iframe></div></section>`},
        notification:{html:`<section draggable="true" id="column_%column_num%" class="dsp_column_draggable_true dsp_column"><div opd_column_type="notification" opd_column_width="%column_width_num%" style="height: 100%;width: %column_width_num%rem;min-width: 1rem;"><div class="column_bar" style="height: max-content;"><span class="dsp_column_title"><div class="dsp_column_move_icon_parent"><span class="dsp_column_move_icon"></span><span>${i18n_message("ui_column_notifications_title")}</span></div></span>${default_element_bar}<div class="dsp_column_close_btn_wrap"><span class="dsp_column_btn"><label class="dsp_column_close_btn opd_ui_icon_color" title="${i18n_message("ui_column_close_title")}"><input type="button" class="column_close_btn" value="X"/></label></span></div></div>${column_settings_panel_no_auto}<iframe allow="fullscreen" src="https://x.com/notifications" type="text/html" style="width: 100%;height: 100%;" opd_init_webview></iframe></div></section>`},
        explore:{html:`<section draggable="true" id="column_%column_num%" class="dsp_column_draggable_true dsp_column"><div opd_column_type="explore" opd_column_width="%column_width_num%" opd_explore_path="%column_save_path%" opd_explore_title="%column_save_title%" opd_pinned_path="%column_pinned_save_path%" style="height: 100%;width: %column_width_num%rem;min-width: 1rem;"><div class="column_bar" style="height: max-content;"><span class="dsp_column_title"><div class="dsp_column_move_icon_parent"><span class="dsp_column_move_icon"></span><span>${i18n_message("ui_column_explore_title")}</span></div></span>${default_element_bar}<span class="dsp_column_btn"><input class="opd_pinned_btn" type="checkbox" title="${i18n_message("ui_column_pin_toggle_title")}" %column_pinned_ch%><label class="dsp_column_pin_btn opd_ui_icon_color"></label></span><div class="dsp_column_close_btn_wrap"><span class="dsp_column_btn"><label class="dsp_column_close_btn opd_ui_icon_color" title="${i18n_message("ui_column_close_title")}"><input type="button" class="column_close_btn" value="X"/></label></span></div></div>${column_settings_panel}<iframe auto_reload_mouse_hover="false" allow="fullscreen" src="https://x.com%column_save_path%" type="text/html" style="width: 100%;height: 100%;" opd_init_webview></iframe></div></section>`}
    };
    let ins_html = document.createElement("div");
    ins_html.id = "opd_main_element";
    ins_html.style = "position: fixed;z-index: 999999;top:0;width: 100%;height: 100%;background: white;display: flex;flex-direction: row;overflow: hidden;";
    let side_bar = `<section class="dsp_column" style="position:fixed;z-index:999;height:98%;"><div draggable="false" class="dsp_column_draggable_false" opd_column_type="dsp_column" opd_column_width="%column_width_num%" style="height:100%;min-width: 60px;max-width: 60px;text-align: center;background-color: white;"><div class="main_bar_functions"><div class="opd_ui_logo_parent" title="${i18n_message("ui_sidebar_logo_title", [manifest.version])}"><div class="opd_ui_logo"></div><span class="opd_version_span">${manifest.version}</span></div><hr><p class="opd_debug_menu">${i18n_message("ui_debug_menu_label")}<br><input type="button" id="init_settings" value="${i18n_message("ui_button_init_settings")}" /><br><input type="button" id="profile_load_save" value="${i18n_message("ui_button_profile_loader")}" /><br><input type="button" id="dnr_reload" value="${i18n_message("ui_button_dnr_reload")}" /><br><input type="button" id="ext_reload" value="${i18n_message("ui_button_ext_reload")}" /><br><div id="api_limit_status">${i18n_message("ui_button_api_label")}</div><hr><div class="dsp_btn_parent" id="add_post" title="${i18n_message("ui_add_post_column_title")}"><div class="dsp_btn_add_post_img"></div></div><hr><div class="dsp_btn_parent" id="add_timeline" title="${i18n_message("ui_add_timeline_column_title")}"><div class="dsp_btn_add_tl_img"></div></div><div class="dsp_btn_parent" id="add_notify" title="${i18n_message("ui_add_notification_column_title")}"><div class="dsp_btn_add_ntfc_img"></div></div><div class="dsp_btn_parent" id="add_explore" title="${i18n_message("ui_add_explore_column_title")}"><div class="dsp_btn_add_explr_img"></div></div><hr><div class="dsp_btn_parent" title="${i18n_message("ui_toggle_second_rack_title")}" id="second_rack"><div class="dsp_btn_second_rack_img"></div></div><hr><div class="dsp_btn_parent" title="${i18n_message("ui_profile_save_title")}" id="profile_save"><div class="dsp_btn_profile_add_img"></div></div><div class="dsp_btn_parent" title="${i18n_message("ui_profile_delete_title")}" id="profile_delete"><div class="dsp_btn_profile_delete_img"></div></div>${profile_list_html}</p></div></div></section><section draggable="false" class="dsp_column_draggable_false dsp_column"><div opd_column_type="main_bar_empty_column" id="main_bar_empty_column" style="height:100%;min-width: 60px;max-width: 60px;"></div></section>`;
    //let side_bar = `<section class="dsp_column" style="position:fixed;z-index:999;height:98%;"><div draggable="false" opd_column_type="dsp_column" opd_column_width="%column_width_num%" style="height:100%;min-width: 100px;text-align: center;background-color: white;"><div><p style="margin-top:0;padding-top:1em;">Open-Deck<br>Prototype<br>v${manifest.version}</p><hr><p>Debug<br><input type="button" id="init_settings" value="init settings"/><br><input type="button" id="profile_load_save" value="Profile Load"/><br><input type="button" id="dnr_reload" value="dNR_Reload"/><br><input type="button" id="ext_reload" value="Ext_Reload"/></p><hr><p><input type="button" id="add_timeline" value="Add TimeLine"/> <div class="dsp_btn_parent"><div class="dsp_btn_add_tl_img"></div></div><div class="dsp_btn_parent"><div class="dsp_btn_add_ntfc_img"></div></div><div class="dsp_btn_parent"><div class="dsp_btn_add_explr_img"></div></div> </p><p><input type="button" id="add_notify" value="Add Notification"/></p><p><input type="button" id="add_explore" value="Add Explore"/><hr><input type="button" id="second_rack" value="Second Rack"/><hr><input type="button" id="profile_save" value="Profile_Save"/><br><input type="button" id="profile_delete" value="Profile_Delete"/><br>${profile_list_html}</p></div></div></section><section draggable="false" class="dsp_column"><div opd_column_type="main_bar_empty_column" id="main_bar_empty_column" style="height:100%;min-width: 110px;"></div></section>`;
    let main_column_html = ``;
    let second_column_html = ``;
    //設定2段
    let first_column_end = false;
    let second_column_end = false;
    let second_rack_mode = false;
    //カラム横幅
    let column_width_init = "30";
    //スクロール検出用
    let scroll_block = true;
    //
    //console.log(settings.column_settings.length)
    for (let index = 0; index < settings.column_settings.length; index++) {
        //console.log(default_element)
        for (let default_index = 0; default_index < Object.keys(default_element).length; default_index++) {
            //console.log(settings.column_settings[index].type+"-"+Object.keys(default_element))
            if(settings.column_settings[index].type == Object.keys(default_element)[default_index]){
                //console.log(default_element[Object.keys(default_element)[default_index]]["html"])
                let banner_checked = "";
                let init_top_visible_checked = "";
                let init_pinned_checked = "";
                let init_pinned_path = "";
                let init_auto_reload_checked = "";
                let init_column_save_path = settings.column_settings[index].column_save_path;
                let init_column_save_title = settings.column_settings[index].column_save_title;
                let tw_view_type = settings.column_settings[index].tw_view_mode;
                let auto_reload_time = settings.column_settings[index].auto_reload_time / 1000;
                if(settings.column_settings[index].banner == true){
                    banner_checked = "checked";
                }
                //トップ検索など
                if(settings.column_settings[index].top_visible == true){
                    init_top_visible_checked = "checked";
                }
                //カラム横幅
                if(settings.column_settings[index].column_width != null){
                    column_width_init = settings.column_settings[index].column_width;
                }
                //Exproleピン止め
                if(settings.column_settings[index].type == "explore"){
                    if(settings.column_settings[index].column_pinned_path != ""){
                        init_pinned_checked = "checked";
                        init_pinned_path = settings.column_settings[index].column_pinned_path;
                        init_column_save_path = settings.column_settings[index].column_pinned_path;
                        //%column_pinned_ch%
                    }else{
                        init_column_save_path = settings.column_settings[index].column_save_path;
                    }
                }
                //自動更新
                if(settings.column_settings[index].type == "explore" || settings.column_settings[index].type == "home"){
                    if(settings.column_settings[index].auto_reload){
                        init_auto_reload_checked = "checked";
                        //%column_pinned_ch%
                    }else{
                    }
                }
                //一段目終了検出にもかかわらず設定が存在していた場合2段目の変数に保存
                if(first_column_end == true){
                    second_column_html += default_element[Object.keys(default_element)[default_index]]["html"].replaceAll("%column_save_path%", init_column_save_path).replaceAll("%column_num%", create_random_id()).replace("%column_banner_ch%", banner_checked).replace("%column_top_bar_ch%", init_top_visible_checked).replace("%column_tw_view_mode%", tw_view_type).replace("%column_pinned_ch%", init_pinned_checked).replaceAll("%column_pinned_save_path%", init_pinned_path).replaceAll("%column_save_title%", init_column_save_title).replaceAll("%column_width_num%", column_width_init).replaceAll("%column_auto_reload_ch%", init_auto_reload_checked).replaceAll("%column_auto_reload_time%", auto_reload_time);
                }else{
                    main_column_html += default_element[Object.keys(default_element)[default_index]]["html"].replaceAll("%column_save_path%", init_column_save_path).replaceAll("%column_num%", create_random_id()).replace("%column_banner_ch%", banner_checked).replace("%column_top_bar_ch%", init_top_visible_checked).replace("%column_tw_view_mode%", tw_view_type).replace("%column_pinned_ch%", init_pinned_checked).replaceAll("%column_pinned_save_path%", init_pinned_path).replaceAll("%column_save_title%", init_column_save_title).replaceAll("%column_width_num%", column_width_init).replaceAll("%column_auto_reload_ch%", init_auto_reload_checked).replaceAll("%column_auto_reload_time%", auto_reload_time);
                }
                //一段目読込終了検出
                if(first_column_end == false && settings.column_settings[index].type == "empty_column"){
                    first_column_end = true;
                }
                //二段目読込終了検出
                if(second_column_end == false && settings.column_settings[index].type == "second_empty_column"){
                    second_column_end = true;
                }
            }
        }
    }
    //初期挿入HTML作成
    ins_html.innerHTML = `${side_bar}<div id="main_rack_element" style=""><div id="first_rack_element" style="height: 100%;display:flex;flex-direction:row;">${main_column_html}</div><div id="second_rack_element" style="display:flex;flex-direction:row;">${second_column_html}</div></div>`;
    //HTML挿入
    document.body.insertAdjacentElement("afterbegin", ins_html);
    //APIリミット表示用
    document.querySelector("#api_limit_status").addEventListener("click", function(){
        if(api_limit_obj != null){
            alert(i18n_message("msg_api_limit_status_alert", [`${api_limit_dsc_obj.time_line}${api_limit_dsc_obj.recommend_timeline}${api_limit_dsc_obj.search}`]))
        }
    });
    //Open-Deckについて表示
    document.querySelector(".opd_ui_logo").addEventListener("click", function(){
        window.open(chrome.runtime.getURL("about_opd.html"), "About Open-Deck", 'width=720, height=280');
    });
    //デバッグメニュー表示
    let debug_menu_click_counter = 0;
    document.querySelector(".opd_version_span").addEventListener("click", function(){
        if(debug_menu_click_counter >= 7){
            alert(i18n_message("msg_debug_menu_enabled"));
            document.querySelector(".opd_debug_menu").style.display = "block";
        }else{
            debug_menu_click_counter += 1;
        }
    });
    //2段目が存在する場合の処理
    if(first_column_end == true && second_column_end == true){
        second_rack_mode = true;
        document.querySelector("#first_rack_element").style.height = "50vh";
        document.querySelector("#second_rack_element").style.height = "50vh";
        /*for (let index = 0; index < document.querySelectorAll('.dsp_column[draggable="true"]').length; index++) {
            document.querySelectorAll('.dsp_column[draggable="true"]')[index].style.height = "calc(100% - 25px)";
        }*/

        //document.querySelector("style[second_column_css]").textContent = `#second_rack_element .dsp_column[draggable="true"]{height:calc(100% - 25px)}`;

        document.querySelector("#second_rack").value = "Single Rack";
        document.querySelector(".dsp_btn_second_rack_img").style.backgroundImage = `url(${chrome.runtime.getURL(ui_icon_define.column_single_rack)})`;
    }
    //
    create_profile_list_btn();
    column_dd();
    column_close();
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
                        case "dsp_column":
                            preload_desc_count = 0;
                            break;
                        case "main_bar_empty_column":
                            preload_desc_count = 0;
                            break;
                        case "empty_column":
                            preload_desc_array.push(i18n_message("msg_profile_desc_first_row_end"));
                            preload_desc_count = 0;
                            break;
                        case "second_empty_column":
                            preload_desc_array.push(i18n_message("msg_profile_desc_second_row_end"));
                            preload_desc_count = 0;
                            break;
                        case "post":
                            preload_desc_array.push(i18n_message("msg_profile_desc_post_column", [preload_desc_count]));
                            break;
                        case "home":
                            preload_desc_array.push(i18n_message("msg_profile_desc_timeline_column", [preload_desc_count]));
                            break;
                        case "notification":
                            preload_desc_array.push(i18n_message("msg_profile_desc_notification_column", [preload_desc_count]));
                            break;
                        case "explore":
                            preload_desc_array.push(i18n_message("msg_profile_desc_explore_column", [preload_desc_count, preload_array[preload_index].column_save_title]));
                            break;
                        case "misskey":
                            preload_desc_array.push(i18n_message("msg_profile_desc_misskey_column"));
                            break;
                        case "bsky":
                            preload_desc_array.push(i18n_message("msg_profile_desc_bluesky_column"));
                            break;
                        default:
                            preload_desc_count = 0;
                            break;
                    }
                    preload_desc_count += 1;
                }
                //console.log(preload_desc_array)
                if(confirm(`${i18n_message("msg_profile_load_confirm", [index, preload_desc_array.join("\r\n")])}`)){
                    document.querySelector("#opd_main_element").remove();
                    last_load_profile = index;
                    chrome.storage.local.get("opd_settings", function(value){
                        let load_setting = JSON.parse(value.opd_settings);
                        load_setting.last_load_profile = index;
                        chrome.storage.local.set({'opd_settings': JSON.stringify(load_setting)}, function () {
                        });
                    });
                    const column_settings = {column_settings:profile_store[index].profile};
                    //console.log(column_settings)
                    run(column_settings, profile_store);
                }
            })
        }
    }
    //CSS適用(追加/変更の時に呼び出し)
    //session_webview_obj は Desktop 版とコード共通化を保たせるために同様の名称としている
    function append_object_css(mode, session_webview_obj){
        let column_object = null;
        if(mode == "session_set" || mode == "add_column"){
            column_object = session_webview_obj;
        }else{
            column_object = document.querySelectorAll('.dsp_column:not([opd_column_type="dsp_column"], [opd_column_type="empty_column"], [opd_column_type="main_bar_empty_column"]) iframe');
        }
        for (let index = 0; index < column_object.length; index++) {
            column_object[index].removeAttribute("opd_init_webview");
            //バナー/表示モード変更
            column_object[index].addEventListener("load", function(){
                console.log(this.getAttribute("opd_iframe_width_only"))
                if(this.getAttribute("opd_iframe_width_only") != ''){
                    //console.log(this)
                    let opd_column_div = this.closest("div[opd_column_type]");
                    let opd_column_banner_checkbox = opd_column_div.querySelector(".opd_banner");
                    let opd_column_top_visible_checkbox = opd_column_div.querySelector(".opd_top_bar");
                    let opd_column_tw_view_mode_opt = opd_column_div.querySelector(".opd_tw_view_mode");
                    //バナー表示設定読み込み適用
                    /*if(opd_column_banner_checkbox.checked == true){
                        this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                    }else{
                        this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css>header[role="banner"]{content-visibility:hidden; }</style>`);
                    }*/
                    //共通CSS挿入(スクロールバー細くする)
                    this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_main_css>html{scrollbar-width:thin;}</style>`);
                    //バナー表示ロード
                    if(this.contentWindow.document.querySelector('head style[opd_banner_css]') == null){
                        this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                    }
                    if(opd_column_banner_checkbox?.checked != true){
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
                    if(opd_column_top_visible_checkbox?.checked != true){
                        if(this.closest("div[opd_column_type]").getAttribute("opd_column_type") == "explore"){
                            //div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(form[role="search"]){display:none;}
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1)div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1)`;
                        }else{
                            if(this.closest("div[opd_column_type]").getAttribute("opd_column_type") == "home"){
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
                    switch (opd_column_tw_view_mode_opt.value) {
                        case "0":
                            this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                            break;
                        case "1":
                            this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:has(div[aria-labelledby]){visibility: hidden; height: 0;}`;
                            break;
                        case "2":
                            this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:not(:has(div[aria-labelledby])){visibility: hidden; height: 0;}`;
                            break;
                        default:
                            this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                            break;
                    }
                    //console.log(opd_column_div.querySelector(".opd_banner").checked)
                    //ポストカラムの動作
                    if(this.closest("div[opd_column_type]").getAttribute("opd_column_type") === "post"){
                        const post_column_window = opd_column_div.querySelector("iframe").contentWindow;
                        //文章校正機能
                        const ext_text_review = new OpdExtTextReview();
                        const ui_lang = chrome.i18n.getUILanguage();
                        ext_text_review.Init(post_column_window, ui_icon_define, ui_lang);
                    }
                }
            })
            //各カラム読み込み後の動作(init)
            column_object[index].addEventListener("load", function(){
                //console.log(this)
                let opd_column_div = this.closest("div[opd_column_type]");
                let opd_column_width_btn = opd_column_div.querySelector(".column_width_btn");
                let opd_column_width_select = opd_column_div.querySelector(".opd_column_size_preset");
                let opd_column_banner_checkbox = opd_column_div.querySelector(".opd_banner");
                let opd_column_top_visible_checkbox = opd_column_div.querySelector(".opd_top_bar");
                let opd_column_pinned_checkbox = opd_column_div.querySelector(".opd_pinned_btn");
                let opd_column_auto_reload_checkbox = opd_column_div.querySelector(".opd_a_reload_bar");
                let opd_column_auto_reload_time_reload = opd_column_div.querySelector(".opd_a_reload_time_setting");
                let opd_column_tw_view_mode_opt = opd_column_div.querySelector(".opd_tw_view_mode");
                let column_content_reload = null;
                //カラム拡張読み込み
                if(mode != "session_set"){
                    const column_type = this.closest("div[opd_column_type]").getAttribute("opd_column_type");
                    if(column_type === "home" || column_type === "explore"){
                        const target_column = this.closest("div[opd_column_type]").querySelector("iframe").contentWindow;
                        //自動更新関連仕込み
                        column_content_reload = new OpdExtAutoReload();
                        column_content_reload.Init(target_column);
                        //メディアビューワー関連仕込み
                        const column_media_viewer_blocker = new OpdMediaViewerBlocker();
                        column_media_viewer_blocker.Init(target_column);
                        media_viewer_token.push(column_media_viewer_blocker.opd_send_media_info_token);
                    }
                }
                //設定パネルイベント
                if(mode != "session_set"){
                    opd_column_div.querySelector(".opd_settings_btn").addEventListener("click", function(){
                        const settings_panel = this.closest("div[opd_column_type]").querySelector(".dsp_column_settings_panel");
                        if(settings_panel.getAttribute("open") == null){
                            settings_panel.setAttribute("open", "");
                            settings_panel.style.display = "flex";
                        }else{
                            settings_panel.removeAttribute("open");
                            settings_panel.style.display = "none";
                        }
                    });
                }
                if(mode != "session_set"){
                    opd_column_div.querySelector(".dsp_column_settings_panel_close_btn").addEventListener("click", function(){
                        const settings_panel = this.closest("div[opd_column_type]").querySelector(".dsp_column_settings_panel");
                        settings_panel.removeAttribute("open");
                        settings_panel.style.display = "none";
                    })
                    //設定パネル&ホバー時動作
                    opd_column_div.querySelector(".dsp_column_settings_panel").addEventListener("mouseover", function(){
                        opd_column_div.closest(".dsp_column").setAttribute("draggable", "false");
                    });
                    opd_column_div.querySelector(".dsp_column_settings_panel").addEventListener("mouseleave", function(){
                        opd_column_div.closest(".dsp_column").setAttribute("draggable", "true");
                    });
                }
                //設定パネルカラム幅設定
                if(opd_column_width_select != null){
                    switch (opd_column_div.getAttribute("opd_column_width")){
                        case '15':
                            opd_column_width_select.value = 0;
                            break;
                        case '20':
                            opd_column_width_select.value = 1;
                                break;
                        case '30':
                            opd_column_width_select.value = 2;
                            break;
                        default:
                            opd_column_width_select.value = 3;
                            break;
                    }
                    if(mode != "session_set"){
                        opd_column_width_select.addEventListener("change", function(){
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
                            this.closest("div[opd_column_type]").setAttribute("opd_column_width", preset_rem);
                            this.closest("div[opd_column_type]").style.width = `${preset_rem}rem`;
                            column_settings_save("", last_load_profile);
                        })
                    }
                }
                if(mode != "session_set"){
                    //カラム横幅設定イベント
                    opd_column_width_btn.addEventListener("click", function(){
                        const now_width = this.closest("div[opd_column_type]").getAttribute("opd_column_width");
                        let column_width_preset  = this.closest("div[opd_column_type]").querySelector(".opd_column_size_preset");
                        let setting_width = prompt(i18n_message("msg_column_width_prompt"), now_width);
                        //console.log(setting_width);
                        if(setting_width != null){
                            const setting_width_num = Number(setting_width);
                            if(setting_width_num != NaN && setting_width_num > 11){
                                this.closest("div[opd_column_type]").setAttribute("opd_column_width", setting_width_num);
                                this.closest("div[opd_column_type]").style.width = `${setting_width_num}rem`;
                                column_settings_save("", last_load_profile);
                                switch (setting_width_num){
                                    case 15:
                                        column_width_preset.value = 0;
                                        break;
                                    case 20:
                                        column_width_preset.value = 1;
                                        break;
                                    case 30:
                                        column_width_preset.value = 2;
                                        break;
                                    default:
                                        column_width_preset.value = 3;
                                        break;
                                }
                            }else{
                                alert(i18n_message("msg_invalid_value_alert"));
                            }
                        }
                    });
                }

                //他SNSカラム対応
                if(this.getAttribute("opd_iframe_width_only") != ''){
                    //バナー表示設定読み込み適用
                    /*if(opd_column_banner_checkbox.checked == true){
                        this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                    }else{
                        this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css>header[role="banner"]{content-visibility:hidden; }</style>`);
                    }*/
                    if(this.contentWindow.document.querySelector('head style[opd_banner_css]') == null){
                        this.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_banner_css></style>`);
                    }
                    if(opd_column_banner_checkbox?.checked != true){
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
                    if(opd_column_top_visible_checkbox?.checked != true){
                        //console.log("home_notcheck")
                        if(this.closest("div[opd_column_type]").getAttribute("opd_column_type") == "explore"){
                            this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){visibility: hidden; height: 0;top: calc(100vh - 60px);position: sticky;backdrop-filter: blur(0px) !important;}[data-testid="app-bar-back"]{visibility: visible; filter: none;}div[data-testid="cellInnerDiv"]:has(button[aria-describedby], div[data-testid="UserAvatar-Container-unknown"]){display:none;}`;
                        }else{
                            if(this.closest("div[opd_column_type]").getAttribute("opd_column_type") == "home"){
                                this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){visibility: hidden; height: 0;top: calc(100vh - 60px);position: sticky;backdrop-filter: blur(0px) !important;}[data-testid="app-bar-back"]{visibility: visible; filter: none;} div[role="progressbar"] + div{display:none;}div[data-testid="cellInnerDiv"]:has(button[aria-describedby], div[data-testid="UserAvatar-Container-unknown"]){display:none;}`;
                            }else{
                                this.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){visibility: hidden; height: 0;top: calc(100vh - 60px);position: sticky;backdrop-filter: blur(0px) !important;}[data-testid="app-bar-back"]{visibility: visible; filter: none;}div[data-testid="cellInnerDiv"]:has(button[aria-describedby], div[data-testid="UserAvatar-Container-unknown"]){display:none;}`;
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
                    opd_column_tw_view_mode_opt.value = opd_column_tw_view_mode_opt.getAttribute("column_tw_view_mode_val")
                    switch (opd_column_tw_view_mode_opt.getAttribute("column_tw_view_mode_val")) {
                        case "0":
                            this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                            break;
                        case "1":
                            this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:has(div[aria-labelledby]){visibility: hidden; height: 0;}`;
                            break;
                        case "2":
                            this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:not(:has(div[aria-labelledby])){visibility: hidden; height: 0;}`;
                            break;
                        default:
                            this.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                            break;
                    }
                    //自動更新初期適用
                    let reload_test = 0;
                    let auto_reload_int = null;//チェックボックスイベントにも再利用
                    if(opd_column_auto_reload_checkbox != null){
                        //Home, Exproleカラムホバー中 自動更新上部遷移停止
                        opd_column_div.querySelector("iframe").addEventListener("mouseover", function(){
                            this.setAttribute("auto_reload_mouse_hover", "true");
                        });
                        opd_column_div.querySelector("iframe").addEventListener("mouseleave", function(){
                            this.setAttribute("auto_reload_mouse_hover", "false");
                        });
                        const auto_reload_target_elem = this;
                        //console.log(opd_column_auto_reload_checkbox)
                        if(mode != "session_set"){
                            opd_column_auto_reload_time_reload.addEventListener("change", function(){
                                const auto_reload_time = auto_reload_target_elem.closest('div[opd_column_type]').querySelector(".opd_a_reload_time_setting");
                                if(Number(auto_reload_time.value) >= 1){
                                    alert(i18n_message("msg_auto_reload_set", [auto_reload_time.value]));
                                    column_settings_save("", last_load_profile);
                                }else{
                                    alert(i18n_message("msg_auto_reload_minimum_alert"));
                                    auto_reload_time.value = '10';
                                    column_settings_save("", last_load_profile);
                                }
                            });
                        }
                        //初期チェック動作
                        if(opd_column_auto_reload_checkbox.checked){
                            //console.log("init update!")
                            const auto_reload_time_input = auto_reload_target_elem.closest('div[opd_column_type]').querySelector(".opd_a_reload_time_setting");
                            const auto_reload_load_time = Number(auto_reload_time_input.value) * 1000;
                            auto_reload_time_input.disabled = true;
                            auto_reload_int = setInterval(function(){
                                //console.log("update!")
                                //console.log(auto_reload_target_elem.contentWindow)
                                const path_name = auto_reload_target_elem.contentWindow.location.pathname;
                                if(['/home', '/search'].includes(path_name) || path_name.startsWith('/i/lists')){
                                    if(auto_reload_target_elem.getAttribute("auto_reload_mouse_hover") == "false"){
                                        if (column_content_reload){
                                            column_content_reload.Reload(auto_reload_target_elem.contentWindow);
                                            setTimeout(() => {
                                                auto_reload_target_elem.contentWindow.scrollTo({ top: 0, behavior: 'auto' });
                                            }, 100);
                                        }
                                    }
                                };
                            }, auto_reload_load_time);
                        }
                    }

                    //console.log(opd_column_div.querySelector(".opd_banner").checked)
                    if(mode != "session_set"){
                        //バナーチェックイベント
                        opd_column_banner_checkbox?.addEventListener("change", function(){
                            column_settings_save("", last_load_profile);
                            //console.log(this.closest("div[opd_column_type]").querySelector("iframe"))
                            let banner_mode_target_object = this.closest("div[opd_column_type]").querySelector("iframe");
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
                        opd_column_top_visible_checkbox?.addEventListener("change", function(){
                            column_settings_save("", last_load_profile);
                            let topvisible_mode_target_object = this.closest("div[opd_column_type]").querySelector("iframe");
                            //console.log(topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]'))
                            if(topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]') == null){
                                topvisible_mode_target_object.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_top_visible_css></style>`);
                            }
                            if(this.checked != true){
                                //console.log(this)
                                //topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(form[role="search"]), div[data-testid="primaryColumn"] div[tabindex="0"][aria-label] div:has(h2[role="heading"]){display:none;};`;
                                if(this.closest("div[opd_column_type]").getAttribute("opd_column_type") == "explore"){
                                    topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){visibility: hidden; height: 0;top: calc(100vh - 60px);position: sticky;backdrop-filter: blur(0px) !important;}[data-testid="app-bar-back"]{visibility: visible;}div[data-testid="cellInnerDiv"]:has(button[aria-describedby], div[data-testid="UserAvatar-Container-unknown"]){display:none;}`;
                                }else{
                                    //console.log(this.closest("div[opd_column_type]").getAttribute("opd_column_type"))
                                    if(this.closest("div[opd_column_type]").getAttribute("opd_column_type") == "home"){
                                        topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){visibility: hidden; height: 0;top: calc(100vh - 60px);position: sticky;backdrop-filter: blur(0px) !important;} [data-testid="app-bar-back"]{visibility: visible;} div[aria-label="ホームタイムライン"] * +div:first-of-type [data-testid="cellInnerDiv"]{} div[role="progressbar"] + div{display:none;}div[data-testid="cellInnerDiv"]:has(button[aria-describedby], div[data-testid="UserAvatar-Container-unknown"]){display:none;}`;
                                    }else{
                                        topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = `div[data-testid="primaryColumn"]>[tabindex="0"][aria-label]>div:nth-child(1){visibility: hidden; height: 0;top: calc(100vh - 60px);position: sticky;backdrop-filter: blur(0px) !important;}[data-testid="app-bar-back"]{visibility: visible;}div[data-testid="cellInnerDiv"]:has(button[aria-describedby], div[data-testid="UserAvatar-Container-unknown"]){display:none;}`;
                                    }
                                }
                            }else{
                                //console.log("else")
                                topvisible_mode_target_object.contentWindow.document.querySelector('head style[opd_top_visible_css]').textContent = ``;
                            }
                        });
                    }
                
                    //Exproleピン止め
                    if(opd_column_pinned_checkbox != null){
                        if(mode != "session_set"){
                            opd_column_pinned_checkbox.addEventListener("click", function(){
                                if(this.checked){
                                    if(confirm(i18n_message("msg_explore_pin_confirm"))){
                                        const now_path = this.closest("div[opd_column_type]").getAttribute("opd_explore_path");
                                        this.closest("div[opd_column_type]").setAttribute("opd_pinned_path",now_path);
                                        column_settings_save("", last_load_profile);
                                    }else{
                                        this.checked = false;
                                    }
                                }else{
                                    if(confirm(i18n_message("msg_explore_unpin_confirm"))){
                                        this.closest("div[opd_column_type]").setAttribute("opd_pinned_path","");
                                        column_settings_save("", last_load_profile);
                                        this.checked = false;
                                    }else{
                                        this.checked = true;
                                    }
                                }
                            });
                        }
                    }
                    //自動更新モードイベント
                    if(opd_column_auto_reload_checkbox != null){
                        if(mode != "session_set"){
                            opd_column_auto_reload_checkbox.addEventListener("click", function(){
                                let auto_reload_target_object = this.closest("div[opd_column_type]").querySelector("iframe");
                                const auto_reload_time_input = this.closest("div[opd_column_type]").querySelector(".opd_a_reload_time_setting");
                                const auto_reload_time = Number(auto_reload_time_input.value) * 1000;
                                if(this.checked){
                                    auto_reload_time_input.disabled = true;
                                    auto_reload_int = setInterval(function(){
                                        //console.log("update!")
                                        //console.log(auto_reload_target_object.contentWindow)
                                        const path_name = auto_reload_target_object.contentWindow.location.pathname;
                                        if(['/home', '/search'].includes(path_name) || path_name.startsWith('/i/lists')){
                                            if(auto_reload_target_object.getAttribute("auto_reload_mouse_hover") == "false"){
                                                if (column_content_reload){
                                                    column_content_reload.Reload(auto_reload_target_object.contentWindow);
                                                    setTimeout(() => {
                                                        auto_reload_target_object.contentWindow.scrollTo({ top: 0, behavior: 'auto' });
                                                    }, 500);
                                                }
                                            }
                                        };
                                    }, auto_reload_time);
                                    //console.log(auto_reload_time)
                                    column_settings_save("", last_load_profile);
                                }else{
                                    auto_reload_time_input.disabled = false;
                                    //console.log("update stop!")
                                    clearInterval(auto_reload_int);
                                    column_settings_save("", last_load_profile);
                                }
                            });
                        }
                    }
                    /*if(this.closest("div[opd_column_type]").getAttribute("opd_column_type") == "explore" || this.closest("div[opd_column_type]").getAttribute("opd_column_type") == "home"){
                    
                    }*/
                   if(mode != "session_set"){
                        //ツイート表示モードイベント
                        opd_column_tw_view_mode_opt.addEventListener("change", function(){
                            column_settings_save("", last_load_profile);
                            //console.log(this.closest("div[opd_column_type]").querySelector("iframe"))
                            let tw_view_mode_target_object = this.closest("div[opd_column_type]").querySelector("iframe");
                            //console.log(this.value)
                            if(tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]') == null){
                                tw_view_mode_target_object.contentWindow.document.querySelector("head").insertAdjacentHTML("beforeend", `<style opd_tw_view_mode_css></style>`);
                            }
                            switch (this.value) {
                                case "0":
                                    tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                                    break;
                                case "1":
                                    tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:has(div[aria-labelledby]){visibility: hidden; height: 0;}`;
                                    break;
                                case "2":
                                    tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = `div[data-testid="cellInnerDiv"]:not(:has(div[aria-labelledby])){visibility: hidden; height: 0;}`;
                                    break;
                                default:
                                    tw_view_mode_target_object.contentWindow.document.querySelector('head style[opd_tw_view_mode_css]').textContent = ``;
                                    break;
                            }
                        })
                    }
                }
            }, {once: true})
            //exploreURL検出処理
            const opd_column_mutate = column_object[index].closest("div[opd_column_type]");
            if(opd_column_mutate.getAttribute("opd_column_type") == 'explore'){
                mutate_url(opd_column_mutate);
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
                            //console.log(`${exp_url.pathname}${exp_url.search}`);
                            element.setAttribute("opd_explore_path", `${exp_url.pathname}${exp_url.search}`);
                            exp_old_url = exp_object.contentWindow.location.href;
                            element.setAttribute("opd_explore_title", exp_title);
                            //console.log(exp_title);
                            column_settings_save("", last_load_profile);
                        }
                    });
                    exp_observer.observe(exp_object.contentWindow.document, {childList: true, subtree: true});
        })
    }
    //メインバーイベント
    document.getElementById("init_settings").addEventListener("click", function(){
        chrome.storage.local.remove("opd_settings", function(value){
            alert(i18n_message("msg_settings_reset_completed"));
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
            //console.log(default_element.second_empty_column)
            //const second_rack_empty_html = `<section draggable="false" id="column_%column_num%" class="dsp_column dsp_column_second_emptycolumn"><div opd_column_type="second_empty_column" style="height: calc(100% - 20px);min-width: 30rem;display: flex;align-items: center;justify-content: center;"><p>2段目<br>${i18n_message("ui_second_empty_column_message")}</p></div></section>`;
            const second_rack_default_html = default_element.second_empty_column.html.replaceAll("%column_num%", create_random_id()).replace("%column_banner_ch%", "").replace("%column_tw_view_mode%", "0");
            document.querySelector("#second_rack_element").insertAdjacentHTML("beforeend", second_rack_default_html);
            /*for (let index = 0; index < document.querySelectorAll('.dsp_column[draggable="true"]').length; index++) {
                document.querySelectorAll('.dsp_column[draggable="true"]')[index].style.height = "calc(100% - 25px)";
            }*/
            //document.querySelector("style[second_column_css]").textContent = `.dsp_column[draggable="true"]{height:calc(100% - 25px)}`;
            //document.querySelector(".dsp_column_second_emptycolumn").scrollIntoView({behavior: "smooth",inline: "end"});
            //append_object_css();
            column_dd();
            column_close();
            column_settings_save("", last_load_profile);
            second_rack_mode = true;
            document.querySelector("#second_rack").value = "Single Rack";
            document.querySelector(".dsp_btn_second_rack_img").style.backgroundImage = `url(${chrome.runtime.getURL(ui_icon_define.column_single_rack)})`;
        }else{
            if(confirm(i18n_message("msg_second_rack_to_single_confirm"))){
                document.querySelector("#second_rack_element").textContent = "";
                document.querySelector("style[second_column_css]").textContent = ``;
                document.querySelector("#first_rack_element").style.height = "100vh";
                document.querySelector("#second_rack_element").style.height = "0";
                document.querySelector("#second_rack_element").style.height = "0";
                //append_object_css();
                //column_dd();
                column_settings_save("", last_load_profile);
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
        if(confirm(i18n_message("msg_dnr_reload_confirm"))){
            chrome.runtime.sendMessage({message: "dnr_upd"}).then((value)=>{
                if(value == true){
                    location.reload();
                }
            });
        }
    });
    document.getElementById("ext_reload").addEventListener("click", function(){
        if(confirm(i18n_message("msg_extension_reload_confirm"))){
            chrome.runtime.sendMessage({message: "ext_reload"});
        }
    });
    //ポストカラム追加
    //TODO: カラム追加周りの処理をもっと簡略化すること
    document.getElementById("add_post").addEventListener("click", function(){
        const empty_column = document.querySelector(".dsp_column_emptycolumn");
        const first_column = empty_column?.closest('div')?.querySelector('section[draggable="true"]');
        const add_target_column = (is_shift_pressed && first_column) ? first_column : empty_column;

        const new_column = default_element["post"]["html"].replaceAll("%column_num%", create_random_id()).replace("%column_banner_ch%", "").replace("%column_top_bar_ch%", "checked").replace("%column_tw_view_mode%", "0").replaceAll("%column_width_num%", "30").replaceAll("%column_auto_reload_ch%", "").replaceAll("%column_auto_reload_time%", "10000");
        add_target_column.insertAdjacentHTML("beforebegin", new_column);
        add_target_column.scrollIntoView({behavior: "smooth",inline: "end"});
        const all_webview = document.querySelectorAll('#main_rack_element iframe[opd_init_webview]');
        append_object_css("add_column", all_webview);
        column_dd();
        column_close();
        column_settings_save("", last_load_profile);
    });
    //タイムラインカラム追加
    document.getElementById("add_timeline").addEventListener("click", function(){
        const empty_column = document.querySelector(".dsp_column_emptycolumn");
        const first_column = empty_column?.closest('div')?.querySelector('section[draggable="true"]');
        const add_target_column = (is_shift_pressed && first_column) ? first_column : empty_column;
        
        const new_column = default_element["home"]["html"].replaceAll("%column_num%", create_random_id()).replace("%column_banner_ch%", "").replace("%column_top_bar_ch%", "checked").replace("%column_tw_view_mode%", "0").replaceAll("%column_width_num%", "30").replaceAll("%column_auto_reload_ch%", "").replaceAll("%column_auto_reload_time%", "10000");
        add_target_column.insertAdjacentHTML("beforebegin", new_column);
        add_target_column.scrollIntoView({behavior: "smooth",inline: "end"});
        const all_webview = document.querySelectorAll('#main_rack_element iframe[opd_init_webview]');
        append_object_css("add_column", all_webview);
        column_dd();
        column_close();
        column_settings_save("", last_load_profile);
    });
    //通知カラム追加
    document.getElementById("add_notify").addEventListener("click", function(){
        const empty_column = document.querySelector(".dsp_column_emptycolumn");
        const first_column = empty_column?.closest('div')?.querySelector('section[draggable="true"]');
        const add_target_column = (is_shift_pressed && first_column) ? first_column : empty_column;
        
        const new_column = default_element["notification"]["html"].replaceAll("%column_num%", create_random_id()).replace("%column_banner_ch%", "").replace("%column_top_bar_ch%", "checked").replace("%column_tw_view_mode%", "0").replaceAll("%column_width_num%", "30");
        add_target_column.insertAdjacentHTML("beforebegin", new_column);
        add_target_column.scrollIntoView({behavior: "smooth",inline: "end"});
        const all_webview = document.querySelectorAll('#main_rack_element iframe[opd_init_webview]');
        append_object_css("add_column", all_webview);
        column_dd();
        column_close();
        column_settings_save("", last_load_profile);
    });
    //Explore(ユニバーサル)カラム追加
    document.getElementById("add_explore").addEventListener("click", function(){
        const empty_column = document.querySelector(".dsp_column_emptycolumn");
        const first_column = empty_column?.closest('div')?.querySelector('section[draggable="true"]');
        const add_target_column = (is_shift_pressed && first_column) ? first_column : empty_column;
        
        const new_column = default_element["explore"]["html"].replaceAll("%column_save_path%", "/explore").replaceAll("%column_num%", create_random_id()).replace("%column_banner_ch%", "").replace("%column_top_bar_ch%", "checked").replace("%column_tw_view_mode%", "0").replaceAll("%column_pinned_save_path%", "").replaceAll("%column_width_num%", "30").replaceAll("%column_auto_reload_ch%", "").replaceAll("%column_auto_reload_time%", "10000");
        add_target_column.insertAdjacentHTML("beforebegin", new_column);
        add_target_column.scrollIntoView({behavior: "smooth",inline: "end"});
        const all_webview = document.querySelectorAll('#main_rack_element iframe[opd_init_webview]');
        append_object_css("add_column", all_webview);
        column_dd();
        column_close();
        column_settings_save("", last_load_profile);
    });
    //プロファイル保存ボタン
    document.getElementById("profile_save").addEventListener("click", function(){
        if(confirm(i18n_message("msg_profile_save_confirm"))){
            let profile = column_settings_save("profile_out");
            const save_object = {name:"user_profile", profile:profile.column_settings};
            //console.log(profile)
            profile_store.push(save_object);
            //console.log(profile_store)
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
        const delete_num = Number(prompt(i18n_message("msg_profile_delete_number_prompt")));
        if(last_load_profile != delete_num){
            if(confirm(i18n_message("msg_profile_delete_confirm", [delete_num]))){
                let after_profile_num = null;
                profile_store.splice(delete_num, 1);
                //console.log(profile_store)
                chrome.storage.local.set({'opd_profile_store': JSON.stringify(profile_store)}, function () {
                    //
                    chrome.storage.local.get("opd_settings", function(load_value){
                        //console.log(last_load_profile)
                        if(last_load_profile<delete_num){
                            after_profile_num = last_load_profile;
                        }else{
                            after_profile_num = last_load_profile - 1;
                        }
                        if(after_profile_num < 0){
                            after_profile_num = 0;
                        }
                        last_load_profile = after_profile_num;
                        //
                        console.log(after_profile_num)
                        let load_setting = JSON.parse(load_value.opd_settings);
                        load_setting.last_load_profile = after_profile_num;
                        chrome.storage.local.set({'opd_settings': JSON.stringify(load_setting)}, function () {
                            let profile_list_btn_html = "";
                            //プロファイルリスト初期化
                            for (let index = 0; index < profile_store.length; index++) {
                                profile_list_btn_html += `<div class="dsp_btn_parent" id="userProfile-${index}"><div class="dsp_btn_change_profile_btn">P${index}</div></div>`;
                            }
                            document.querySelector(".profile_val_now").textContent = after_profile_num;
                            document.querySelector("#profile_btn_list").innerHTML = profile_list_btn_html;
                            create_profile_list_btn();
                            });
                        });
                    //last_load_profile
                    //
                    //.aaaa
                });
            }
        }else{
            alert(i18n_message("msg_profile_delete_current_alert"));
        }
    });
    //カラム移動
    function column_dd(){
        let column_class = document.querySelectorAll(".dsp_column");
        let column_copy_source = null;
        for (let index = 0; index < column_class.length; index++) {
            column_class[index].addEventListener("dragstart", function(ev){
                //console.log(this)
                column_copy_source = this;
                ev.dataTransfer.setData('text/plain', ev.target.id);
            });
            column_class[index].addEventListener("dragover", function(ev){
                ev.preventDefault();
                this.style.borderLeft = '15px solid #2e2e2e';
            });
            column_class[index].addEventListener("dragleave", function(){
                this.style.borderLeft = '';
            });
            column_class[index].addEventListener("drop", function(ev){
                ev.preventDefault();
                //移動時初期表示設定
                //bn_twview_mode(this.querySelector("iframe"));
                //exploreのURLセット
                //console.log(column_class[index])
                //移動セット
                const dt_id = ev.dataTransfer.getData('text/plain');
                const dr_elem = document.getElementById(dt_id);
                if(dr_elem != null){
                    if(dr_elem?.querySelector("div")?.getAttribute("opd_column_type") == 'explore'){
                        // && dr_elem.querySelector("div").querySelector("iframe").src != `https://x.com${dr_elem.querySelector("div").getAttribute("opd_explore_path")}`
                        //console.log(dr_elem.querySelector("div").getAttribute("opd_explore_path"))
                        //console.log(dr_elem.querySelector("div").getAttribute("opd_pinned_path"))
                        if(dr_elem.querySelector("div").getAttribute("opd_pinned_path") != ""){
                            //console.log("Pinned")
                            dr_elem.querySelector("div").querySelector("iframe").src = `https://x.com${dr_elem.querySelector("div").getAttribute("opd_pinned_path")}`;
                        }else{
                           //console.log("Exp_save")
                            dr_elem.querySelector("div").querySelector("iframe").src = `https://x.com${dr_elem.querySelector("div").getAttribute("opd_explore_path")}`;
                        }
                    }
                    this.parentNode.insertBefore(dr_elem, this);
                    this.style.borderLeft = '';
                    //append_object_css();
                    //column_dd();
                    column_settings_save("", last_load_profile);
                }else{
                    this.style.borderLeft = '';
                }
                
            })
        }
    }
    //カラム終了
    function column_close(){
        for (let index = 0; index < document.querySelectorAll(".column_close_btn").length; index++) {
            document.querySelectorAll(".column_close_btn")[index].addEventListener("click", function(){
                const pin_checkbox = this.closest(".dsp_column").querySelector(".opd_pinned_btn")?.checked;
                if(pin_checkbox == false || pin_checkbox == undefined){
                    this.closest(".dsp_column").remove();
                    append_object_css();
                    //column_dd();
                    column_settings_save("", last_load_profile);
                }else{
                    if(confirm(i18n_message("msg_pinned_column_close_confirm"))){
                        this.closest(".dsp_column").remove();
                        append_object_css();
                        //column_dd();
                        column_settings_save("", last_load_profile);
                    }
                }
            })
        }
    }
    //カラム構成保存
    function column_settings_save(mode, profile_num){
        let settings_array = {
            column_settings:[],
            version:manifest.version
        };
        for (let index = 0; index < document.querySelectorAll("#opd_main_element div[opd_column_type]").length; index++) {
            let banner_checked = null;
            let top_visible_checked = null;
            let tw_view_type = null;
            let column_open_path = null;
            let column_pinned_save_path = null;
            let column_page_title = null;
            let column_width_value = null;
            let column_auto_reload = null;
            let column_auto_reload_time = 10000;
            if(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].querySelector(".opd_banner")?.checked == true){
                banner_checked = true;
            }else{
                banner_checked = false;
            }
            //トップ検索欄等 
            if(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].querySelector(".opd_top_bar")?.checked == true){
                top_visible_checked = true;
            }else{
                top_visible_checked = false;
            }
            //
            if(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].querySelector(".opd_tw_view_mode")?.value != undefined){
                tw_view_type = document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].querySelector(".opd_tw_view_mode").value;
            }else{
                tw_view_type = "0";
            }
            //横幅設定
            if(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_column_width") != "null"){
                //console.log(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_column_width"))
                column_width_value = document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_column_width");
            }
            //exploreの処理
            if(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_column_type") == 'explore'){
                //console.log(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_explore_path"));
                column_open_path = document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_explore_path");
                //ピン止め
                column_pinned_save_path = document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_pinned_path");
                //タイトル
                column_page_title = document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_explore_title");
            }else{
                column_open_path = "";
                column_pinned_save_path = "";
            }
            //自動更新
            if(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_column_type") == 'explore' || document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_column_type") == 'home'){
                if(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].querySelector(".opd_a_reload_bar")?.checked == true){
                    column_auto_reload = true;
                }else{
                    column_auto_reload = false;
                }
                const column_setting_time = Number(document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].querySelector(".opd_a_reload_time_setting").value) * 1000;
                //console.log(column_setting_time)
                if(column_setting_time >= 1000){
                    
                    column_auto_reload_time = column_setting_time;
                }else{
                    column_auto_reload_time = 10000;
                }
            }
            settings_array["column_settings"].push({type:document.querySelectorAll("#opd_main_element div[opd_column_type]")[index].getAttribute("opd_column_type"), banner:banner_checked, top_visible:top_visible_checked, tw_view_mode:tw_view_type, column_save_path:column_open_path, column_save_title:column_page_title, column_pinned_path:column_pinned_save_path, auto_reload:column_auto_reload, auto_reload_time:column_auto_reload_time, column_width:column_width_value});
        }
        if(mode == "profile_out"){
            return settings_array;
        }else{
            //console.log(settings_array);
            /*chrome.storage.local.set({'opd_settings': JSON.stringify(settings_array)}, function () {
                console.log(settings_array);
            });*/
            const save_object = {name:"user_profile", profile:settings_array.column_settings};
            //profile_store.push(save_object);
            Object.assign(profile_store[profile_num], save_object);
            //console.log(profile_store);
            chrome.storage.local.set({'opd_profile_store': JSON.stringify(profile_store)}, function () {
                //console.log(settings_array);
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
        document.title = "Open-Deck";
        document.querySelector('link[rel="shortcut icon"]').href = chrome.runtime.getURL("icon.png");
        //デフォルトのCSSがUIに影響を与えないように削除する
        if(!is_removed_default_style){
            document.head.querySelectorAll('style').forEach(style => {
                if (style.textContent.includes('*, ::before, ::after')) {
                    style.remove();
                    is_removed_default_style = true;
                }
            });
        }
        //ダークモード検出&設定
        const currentScheme = document.documentElement.style?.colorScheme;
        if(currentScheme){
            document.getElementById("opd_main_element").setAttribute("opd-dsp-theme", currentScheme);
        }

    }).observe(document.querySelector("head"),{
        childList: true,
        characterData: true,
        subtree: false
    })
}
//設定初期化
function settings_init(){
    const profile_store_default = [{type:"main_bar_empty_column", banner:false, top_visible:true, tw_view_mode:"0", column_save_path:"", column_save_title:"", column_pinned_path:"", auto_reload:false, auto_reload_time:10000, column_width:null}, {type:"home", banner:true, top_visible:true, tw_view_mode:"0", column_save_path:"", column_save_title:"", column_pinned_path:"", auto_reload:false, auto_reload_time:10000, column_width:null}, {type:"notification", banner:false, top_visible:true, tw_view_mode:"0", column_save_path:"", auto_reload:false, auto_reload_time:10000, column_pinned_path:"", column_save_title:"", column_width:null}, {type:"explore", banner:false, top_visible:true, tw_view_mode:"0", exp_type:"", column_save_path:"/explore", column_save_title:"", column_pinned_path:"", auto_reload:false, auto_reload_time:10000, column_width:null}, {type:"empty_column", banner:false, top_visible:true, tw_view_mode:"0", column_save_path:"", column_save_title:"", column_pinned_path:"", auto_reload:false, auto_reload_time:10000, column_width:null}];
    const settings = {
        last_load_profile:0,
        //column_settings:[{type:"main_bar_empty_column", banner:false, top_visible:true, tw_view_mode:"0", column_save_path:"", column_pinned_path:"", column_width:null}, {type:"home", banner:true, top_visible:true, tw_view_mode:"0", column_save_path:"", column_pinned_path:"", column_width:null}, {type:"notification", banner:false, top_visible:true, tw_view_mode:"0", column_save_path:"", column_pinned_path:"", column_width:null}, {type:"explore", banner:false, top_visible:true, tw_view_mode:"0", exp_type:"", column_save_path:"/explore", column_pinned_path:"", column_width:null}, {type:"empty_column", banner:false, top_visible:true, tw_view_mode:"0", column_save_path:"", column_pinned_path:"", column_width:null}],
        version:manifest.version
    };
    let profile = [{name:"default", profile: profile_store_default}];
    //console.log(profile);
    chrome.storage.local.set({'opd_profile_store': JSON.stringify(profile)}, function () {
        chrome.storage.local.set({'opd_settings': JSON.stringify(settings)}, function () {
            if(is_prototype){
                alert(i18n_message("msg_initial_setup_completed_prototype"));
            }else{
                alert(i18n_message("msg_initial_setup_completed"));
            }
            
            location.reload();
        });
    });
}