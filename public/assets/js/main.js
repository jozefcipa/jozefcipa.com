$(document).ready(function(){

	// Landing page parallax
	$win = $(window),
	$header = $('header')
	$win.on('scroll', function(){

		var bgTop = $header.scrollTop()
			winTop = $win.scrollTop()

		$header.css('backgroundPositionY', (Math.floor( (bgTop - winTop) * 0.5) + 'px'))
	})

	// Countdown to summer
	$timeToSummer = $('#time-to-summer')
	
	var end = new Date('07/01/2017 0:0 AM')
    var day = 24 * 60 * 60 * 1000
    var timer

    var days_old = 0
    timer = setInterval(function(){
    	var now = new Date()
        var distance = end.getTime() - now.getTime()
        if (distance < 0) {

            clearInterval(timer)
            $timeToSummer.hide()

            return;
        }
        var days = Math.floor(distance / day)

        if (days != days_old){
            $('#days-remaining').html(days).hide().fadeIn(500)
            days_old = days
        }
        
    }, 1000)

    // Scroll to contact position
    $('.scroll-to-contact').on('click', function(){
        $('html, body').animate({ scrollTop: $('#contact').offset().top }, 1000)

        return false
    })

})