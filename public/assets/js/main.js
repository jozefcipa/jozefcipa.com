$(document).ready(function(){

    // variables declarations
    var $backend = $('#backend')
    var $frontend = $('#frontend')
    var $mobile = $('#mobile')
    var $internText = $('#intern aside .text')
    var $timeToSummer = $('#time-to-summer')
    var $daysRemaining = $('#days-remaining')
    var $landingPicture = $('#picture')
    var landingPictureTop = $landingPicture.scrollTop()
    var $aboutMe = $('#about-me')
    var $window = $(window)

    const SLIDE_TIME = 1000
    const FADE_IN_TIME = 2000

    // if browser windows is smaller than 500px, remove <br> from landing
    if ($(this).width() < 500){
        $aboutMe.find('br').remove()
    }

    // preparations before animating
    $('#me').hide()
    $backend.find('.skill-group').css('left', '-100%')
    $backend.find('.details').css('right', '-100%')
    
    $frontend.find('.skill-group').css('left', '-100%')
    $frontend.find('.details').css('right', '-100%')
    
    $mobile.find('.skill-group').css('left', '-100%')
    $mobile.find('.details').css('right', '-100%')

    $internText.css('left', '-100%')

    var $otherSkills = $('#other-skills')
    var skillsPosition = $otherSkills.offset().top + 80
    $otherSkills.hide()

    $references = $('.reference:first')
    var referencesPosition = $references.offset().top + 80
    $references.hide()

    // Scroll to contact position
    $('.scroll-to-contact').on('click', function(){
        $('html, body').animate({
            'scrollTop': $('#contact').offset().top 
        }, 1000)

        return false
    })

    // open CV from div
    $('#cv').on('click', function(e){
        e.preventDefault() // if <a> was pressed 

        window.open($(this).find('a').attr('href'), '_blank')
    })

    //////////////
    // ANIMATIONS 
    //////////////

    //fade in about me text 
    $('#me').fadeIn(FADE_IN_TIME);

    var time_animation_done = false
    $(window).on('scroll', function(){

        var windowScrollTop = $(this).scrollTop()
        var documentScrollPosition = windowScrollTop + $(this).height()

        // landing page image parallax
        $landingPicture.css('bottom', (Math.floor( (landingPictureTop - windowScrollTop)) * 0.4) + 'px')

        // slide backend section
        if(documentScrollPosition > $backend.offset().top + 50){
            $backend.find('.skill-group')
                .animate({
                    'left': '0'
                }, SLIDE_TIME)

            $backend.find('.details')
                .animate({
                    'right': '0'
                }, SLIDE_TIME)
        }

        // slide frontend section
        if(documentScrollPosition > $frontend.offset().top + 50){
           $frontend.find('.skill-group')
                .animate({
                    'left': '0'
                }, SLIDE_TIME)

            $frontend.find('.details')
                .animate({
                    'right': '0'
                }, SLIDE_TIME)
        }

        // slide mobile section
        if(documentScrollPosition > $mobile.offset().top + 50){
           $mobile.find('.skill-group')
                .animate({
                    'left': '0'
                }, SLIDE_TIME)

            $mobile.find('.details')
                .animate({
                    'right': '0'
                }, SLIDE_TIME)
        }

        // fade in other skills div
        if(documentScrollPosition > skillsPosition){
           $otherSkills.fadeIn(FADE_IN_TIME)
        }

         // fade in references section
        if(documentScrollPosition > referencesPosition){
           $references.fadeIn(FADE_IN_TIME)
        }

        // slide intern text
        if(documentScrollPosition > $internText.offset().top + 50){
           $internText.animate({
                'left': '0'
            }, SLIDE_TIME)
        }

        // count remaining days
        if(! time_animation_done && documentScrollPosition > $daysRemaining.offset().top + 100){

            var days = calculateDaysToSummer()
            var val = 0
            if(days){
                var i = setInterval(function(){
                    if (val === days)
                        clearInterval(i)
                    else{
                        val++
                        $daysRemaining.html(val)
                    }
                }, 6)
            }
            else{
                $timeToSummer.hide()
            }

            time_animation_done = true
        }
    })
})

function calculateDaysToSummer(){
    var end = new Date('07/01/2017 00:00 AM')
    var day = 24 * 60 * 60 * 1000
    var now = new Date()
    var distance = end.getTime() - now.getTime()
    
    if (distance < 0)
        return 0
    
    return Math.floor(distance / day)
}