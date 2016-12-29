$(document).ready(function(){

	$(window).on('scroll', function(){

		var bgTop = $('header').scrollTop()
			winTop = $(window).scrollTop()

		$('header').css('backgroundPositionY', (Math.floor( (bgTop - winTop) * 0.5) + 'px'))
	})

})