// JavaScript Document

var BC = {
  onTemplateLoaded: function (exID) {
    BC.player = brightcove.api.getExperience(exID); // get reference to the player object
    BC.experienceModule = BC.player.getModule(brightcove.api.modules.APIModules.EXPERIENCE); // get reference to the expeirence module
    BC.contentModule = BC.player.getModule(brightcove.api.modules.APIModules.CONTENT); // get reference to the content module
    BC.videoPlayer = BC.player.getModule(brightcove.api.modules.APIModules.VIDEO_PLAYER); // get reference to the video player module
  },

  onTemplateReady: function (evt) {
    // fetch the playlist. Note this method is asynchronous so callback fuction is required 
    BC.contentModule.getPlaylistByID("4568237524001", function (data) { // playlist ID we're getting data for
      BC.buildPlaylist(data);
      BC.videoPlayer.play(data);
    });
  },

  buildPlaylist: function (data) {
    // loop through array of video objects in the playlist
    for (var i = 0; i < data.videos.length; i++) {
      var playlistItem = '<div class="playlist-item" data-videoid="' + data.videos[i].id + '"><div class="playlist-item-thumbnail">' + ' <img src="' + data.videos[i].thumbnailURL + '" alt="' + data.videos[i].displayName + '" /></div>' + '<div class="playlist-item-description"><h3>' + data.videos[i].displayName + '</h3>' + '<p>' + data.videos[i].shortDescription + '</p></div></div>';
      $('.playlist').append(playlistItem);
      $('.play').append(playlistItem);
    }
    
    BC.resizePlayer();
    BC.playPlaylistItem();
  },

  playPlaylistItem: function () {
    $('.playlist-item').click(function () {
      $('.playlist-item').removeClass('playlist-item-selected');
      var videoId = $(this).data('videoid');
      BC.videoPlayer.loadVideoByID(videoId);
      $(this).addClass('playlist-item-selected');
    });
  },

  resizePlayer: function () {
    var playlistItem = $('.playlist-item'),
    itemDescription = $('.playlist-item-description'),
    newWidth = (playlistItem.width() - 96);
    // resize width of description container dynamically
    itemDescription.css({
      width: newWidth + "px"
    })

    if (BC.experienceModule) {
      BC.experienceModule.setSize($('#myExperience').width(), $('#myExperience').height());
    }
  }

};

// resize the player on viewport size change
$(window).on('resize', function () {
  BC.resizePlayer();
});