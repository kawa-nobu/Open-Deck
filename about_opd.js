window.addEventListener("load", function(){
    document.querySelector("#ext_version").textContent = chrome.runtime.getManifest().version;
    document.querySelector(".opd_logo").style.backgroundImage = `url(${chrome.runtime.getURL("icon/logo_icon.svg")})`;
    document.querySelector(".opd_logo_text").style.backgroundImage = `url(${chrome.runtime.getURL("icon/t_logo.svg")})`;
    let change_img_mode = 0;
    document.querySelector(".opd_logo").addEventListener("click", function(){
        if(change_img_mode == 0){
            document.querySelector(".opd_logo").style.backgroundImage = `url(${chrome.runtime.getURL("icon/logo_v1.svg")})`;
            change_img_mode = 1;
        }else{
            document.querySelector(".opd_logo").style.backgroundImage = `url(${chrome.runtime.getURL("icon/logo_icon.svg")})`;
            change_img_mode = 0;
        }
    });
});