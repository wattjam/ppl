(function ($) {
    var $window = $(window);

    function resize() {
        if ($window.width() < 1183) {
            $('.navbar').addClass('navbar-fixed-top');
            $('.cd-top i').removeClass('fa-3x').addClass('fa-2x');
        }
        else {
            $('.navbar').removeClass('navbar-fixed-top');
            $('.cd-top i').removeClass('fa-2x').addClass('fa-3x');
        }
    }
    $window.resize(resize).trigger('resize');
})(jQuery);
jQuery(document).ready(function ($) {
    $('.navbar').load('inc-navbar.html', function () {
        eventTracking();
        searchToggle();
    });
		$(".navbar").on('click', '#next-page',function(){
				window.location.replace("./everyday-living.html")													 
																	 
				});
    // Match height for tiles on home page
    $('.panel').matchHeight({
        byRow: true
        , property: 'height'
        , target: null
        , remove: false
    });
    // Match height for icons on home page
    $('div.icon').matchHeight({
        byRow: true
        , property: 'height'
        , target: null
        , remove: false
    });
    // Match height for bnners on individual pages
    $('.banner').matchHeight({
        byRow: true
        , property: 'height'
        , target: null
        , remove: false
    });
    if(window.innerWidth<=990){
        $('#home-page .panel-body').matchHeight({
            byRow: true
            , property: 'height'
            , target: null
            , remove: false
        });
    }
    $('#home-page .panel-body').css("height",$('.tile-video').css("height"));
    
    
    
    $.fn.matchHeight._update();
    $('.tile-video .panel-body').click(function () {
        // window.location.href = 'ae-2016-videos.html';
    });
    $('.navbar-toggle').on('click', function () {
        $(this).toggleClass('collapsed uncollapsed');
    });
    // Change accordion icon on open/close
    $('.panel-accordion').on('show.bs.collapse', function () {
        $(this).addClass('open').find('.fa-angle-right').removeClass('fa-angle-right').addClass('fa-angle-down');
    });
    $('.panel-accordion').on('hide.bs.collapse', function () {
        $(this).removeClass('open').find('.fa-angle-down').removeClass('fa-angle-down').addClass('fa-angle-right');
    });
    // slideToggle the search box
    function searchToggle() {
        $(".search-toggle").click(function () {
            $(".search-box-wrapper").slideToggle(100, function () {
                $('.search-toggle').toggleClass('active');
            });
            return false;
        });
        $('.search-field').blur(function () {
            $(".search-box-wrapper").slideToggle(200, function () {
                $('.search-toggle').toggleClass('active');
            });
            return false;
        });
        $('html').click(function () {
            $(".search-box-wrapper").slideUp(200, function () {
                $('.search-toggle').removeClass('active');
            });
        });
        $('.search-box-wrapper').click(function (event) {
            event.stopPropagation();
        });
    }
    // add links with jQuery
    if ($(window).width() < 1006) {
        $(".tile-benefits").mouseenter(function () {
            $(this).css("cursor", "pointer");
        }).mouseleave(function () {
            $(this).css("cursor", "default");
        });
        $(".tile-benefits").click(function () {
            window.open('sob16/', '_blank');
        });
    }
    else {
        $(".tile-benefits").mouseenter(function () {
            $(this).css("cursor", "default");
        });
        $(".tile-benefits").click(function () {});
    }
    // hover over video tile on home page
    $('.tile-video').mouseenter(function () {
        $(this).css("background-size", "104% 104%").css("cursor", "pointer");
        $('.tile-video > img').fadeOut(200);
        $('.tile-video .panel-body').fadeTo("fast", 1);
    }).mouseleave(function () {
        $('.tile-video .panel-body').fadeOut(100);
        $('.tile-video > img').fadeTo("fast", 0.6);
        $(this).css("background-size", "100% 100%").css("cursor", "default");
    });
});
//expand accordion on page load based on hash
var idToToggle = window.location.hash.replace("#", "");
var accDiv = window.location.href.split("#")[1];
console.log(accDiv);

//var accDivPrt = console.log($('#'+accDiv).parent().addClass('open'));
jQuery('#' + accDiv).siblings(".panel-heading").find("i").addClass("fa-angle-down")
$("#" + idToToggle).collapse('show');

// Back to Top icon in the bottom right. Code from Cody House: https://codyhouse.co/gem/back-to-top/
jQuery(document).ready(function ($) {
    // browser window scroll (in pixels) after which the "back to top" link is shown
    var offset = 300
        , //browser window scroll (in pixels) after which the "back to top" link opacity is reduced
        offset_opacity = 1200
        , //duration of the top scrolling animation (in ms)
        scroll_top_duration = 700
        , //grab the "back to top" link
        $back_to_top = $('.cd-top');
    //hide or show the "back to top" link
    $(window).scroll(function () {
        ($(this).scrollTop() > offset) ? $back_to_top.addClass('cd-is-visible'): $back_to_top.removeClass('cd-is-visible cd-fade-out');
        if ($(this).scrollTop() > offset_opacity) {
            $back_to_top.addClass('cd-fade-out');
        }
    });
    //smooth scroll to top
    $back_to_top.on('click', function (event) {
        event.preventDefault();
        $('body,html').animate({
            scrollTop: 0
        , }, scroll_top_duration);
    });
});