(function(app){

// var getShellHeight = 753; 
// var getShellWidth = 1280;
jqnc(document).ready(function(e) {
   setTimeout(function(){
    onResizeFn();
   }, 500);   

});
jqnc(window).resize(function(e) 
{
	//console.log("add  resize")
	onResizeFn();
});
function onResizeFn()
{
	var shellWidth = 524;
    var shellHeight = 560;
    var newShellHeight;
    var newShellWidth;
    var agent = navigator.userAgent.toLowerCase();
    var is_ipad = ((agent.indexOf('ipad') != -1));
    var actWid = Number(jqnc(window).width());
    var actHgt = Number(jqnc(window).height())
    if (actHgt < actWid) {

        newShellHeight = actHgt;
        var scale = Number(shellHeight / newShellHeight).toFixed(2);

        newShellWidth = (shellWidth / shellHeight) * newShellHeight;
        var _aleft = (jqnc(window).width() / 2) - (Number(newShellWidth) / 2);
        if (_aleft < 0) {
            newShellWidth = actWid;
            scale = Number(shellWidth / newShellWidth).toFixed(2);
            newShellHeight = (shellHeight / shellWidth) * newShellWidth;
        }

         if(actWid>=shellWidth && actHgt>=shellHeight){
            newShellWidth = shellWidth;
            newShellHeight = shellHeight
            scale = 1;
        }

        console.log('in if scale ', scale);

        jqnc('#framecontainer').css({
            "transform": "translate(-" + (shellWidth / 2) + "px,-" + (shellHeight / 2) + "px) scale(" + (1 / scale) + "," + (1 / scale) + ") translate(" + (shellWidth / 2) + "px," + (shellHeight / 2) + "px)",
            "-ms-transform": "translate(-" + (shellWidth / 2) + "px,-" + (shellHeight / 2) + "px) scale(" + (1 / scale) + "," + (1 / scale) + ") translate(" + (shellWidth / 2) + "px," + (shellHeight / 2) + "px)",
            "-webkit-transform": "translate(-" + (shellWidth / 2) + "px,-" + (shellHeight / 2) + "px) scale(" + (1 / scale) + "," + (1 / scale) + ") translate(" + (shellWidth / 2) + "px," + (shellHeight / 2) + "px)"
        });
    } else {
        newShellWidth = actWid;
        var scale = Number(shellWidth / newShellWidth).toFixed(2);
        newShellHeight = (shellHeight / shellWidth) * newShellWidth;


        if(actWid>=shellWidth && actHgt>=shellHeight){
             newShellWidth = shellWidth;
            newShellHeight = shellHeight
            scale = 1;
        }
        scale = (Number(scale) + 0.2);
        console.log('in else scale ', scale);

        jqnc('#framecontainer').css({
            "transform": "translate(-" + (shellWidth / 2) + "px,-" + (shellHeight / 2) + "px) scale(" + (1 / scale) + "," + (1 / scale) + ") translate(" + (shellWidth / 2) + "px," + (shellHeight / 2) + "px)",
            "-ms-transform": "translate(-" + (shellWidth / 2) + "px,-" + (shellHeight / 2) + "px) scale(" + (1 / scale) + "," + (1 / scale) + ") translate(" + (shellWidth / 2) + "px," + (shellHeight / 2) + "px)",
            "-webkit-transform": "translate(-" + (shellWidth / 2) + "px,-" + (shellHeight / 2) + "px) scale(" + (1 / scale) + "," + (1 / scale) + ") translate(" + (shellWidth / 2) + "px," + (shellHeight / 2) + "px)"
        });
    }
    scaleVal = scale;
    var _left = (jqnc(window).width() / 2) - (Number(newShellWidth) / 2);
    var _top = (jqnc(window).height() / 2) - (Number(newShellHeight) / 2);
   // jqnc('#framecontainer').css("left", _left);
    jqnc('#framecontainer').css("top", 0);	
} 

 })(Scale=Scale||{})

var Scale;