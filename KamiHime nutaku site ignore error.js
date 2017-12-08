// ==UserScript==
// @name         KamiHime nutaku site ignore error
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  ignore KamiHime error on nutaku
// @author       You
// @include      https://pf.nutaku.com/gadgets/ifr?*.kamihimeproject.dmmgames.com*
// @grant        none
// @run-at       document-end
// ==/UserScript==

function doAuto() {
    var errorBtn = document.getElementById("top_btn");
    if( errorBtn && errorBtn !== "null" && errorBtn !== "undefined" ){
     errorBtn.click();
    }
    var titleMaintenence = document.getElementsByTagName("TITLE")[0];
    if( titleMaintenence && titleMaintenence !== "null" && titleMaintenence !== "undefined" ){
     if (titleMaintenence.innerText.includes("maintenance")){
         setTimeout(function(){location.reload();},120000);
     }
    }
    setTimeout(doAuto,20000);
}

setTimeout(doAuto,5000);
