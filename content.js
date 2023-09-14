if(location.href == "https://twitter.com/run-opdeck"){
    console.log("op")
}
let test_element = `
<div style="position: fixed;z-index: 999999;width: 100%;height: 100%;background: white;display: flex;flex-direction: row;">
    <div draggable='true' id="row1" class="dsp_row" style="height: calc(100% - 20px);;width: 30rem;">
        <div style="border: solid #00000073 1px; height: 20px;">≡ Home</div>
        <object data="https://twitter.com/home" type="text/html" style="width: 100%;height: 100%;"></object>
    </div>
    <div draggable='true' id="row2" class="dsp_row" style="height: calc(100% - 20px);;width: 30rem;">
        <div style="border: solid #00000073 1px; height: 20px;">≡ Notification</div>
        <object data="https://twitter.com/notifications" type="text/html" style="width: 100%;height: 100%;"></object>
    </div>
    <div draggable='true' id="row3" class="dsp_row" style="height: calc(100% - 20px);;width: 30rem;">
        <div style="border: solid #00000073 1px; height: 20px;">≡ Explore</div>
        <object data="https://twitter.com/explore" type="text/html" style="width: 100%;height: 100%;"></object>
    </div>
    <div draggable='true' id="row4" class="dsp_row" style="height: calc(100% - 20px);;width: 30rem;">
    </div>
</div>`;
document.body.insertAdjacentHTML("afterbegin", test_element);
//
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
    })
}
//
function main_dsp(){
    document.getElementById("react-root").style.visibility = "hidden";
    document.getElementById("react-root").style.overflow = "hidden"
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