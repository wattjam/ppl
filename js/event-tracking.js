function eventTracking() {

  jQuery.noConflict();
 
  (function( $ ) {
    $('a[href$="pdf"]').each(function() {
      $(this).attr('onclick', "ga('send', 'event', 'PDF', 'Clicked', jQuery(this).attr('href'), {'nonInteraction': 1});");
      $(this).attr('target', '_blank'); // OPTIONAL: ADD target blank
    });

    $('a[href$=".doc"], a[href$=".docx"], a[href$=".xls"], a[href$=".xlsx"], a[href$=".ppt"], a[href$=".pptx"]').each(function() {
      $(this).attr('onclick', "ga('send', 'event', 'Media', 'Clicked', jQuery(this).attr('href'), {'nonInteraction': 1});");
    }); 

    $('a[href^="http"]').each(function() {
      $(this).attr('onclick', "ga('send', 'event', 'Outbound', 'Clicked', jQuery(this).attr('href'), {'nonInteraction': 1});");
      $(this).attr('target', '_blank'); // OPTIONAL: ADD target blank
    });

  })(jQuery);

}