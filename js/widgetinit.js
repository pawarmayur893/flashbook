(function(app){
	
	/*var oActivityArray = ['StepSlider','VideoGallery','','']*/
	var finalActivityArr = new Array()


	function createActivity(){


	jqnc('div').each(function(){

		if(String(jqnc(this).attr('class')).indexOf('w-') != -1)
		{
			var activityClass = jqnc(this).attr('class').split('w-')[1]
			var oActivity = new window[activityClass](jqnc(this))
			finalActivityArr.push(oActivity)
		}
	})
		
	}

	jqnc('document').ready(function(){
		createActivity();
	})

})(oWidgets = oWidgets || {})
var oWidgets