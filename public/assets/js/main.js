$(document).ready(function () {
	var $left = $('#left');
	var $internship = $('#internship');

	if (Cookies.get('spotify-website-visited')) {
		$internship.css('background', '#38BB5E');
		$internship.find('.spotify').css('display', 'flex');
		$internship.find('.content').css('display', 'none');
	}

	$left.hide().fadeIn(1400, function () {
		$internship.fadeIn();
	});
})