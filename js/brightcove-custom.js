var player, APIModules, videoPlayer, contentModule;
function onTemplateLoad(experienceID) {
  player = brightcove.api.getExperience(experienceID);
  APIModules = brightcove.api.modules.APIModules;
}
function onTemplateReady(evt) {
  videoPlayer = player.getModule(APIModules.VIDEO_PLAYER);
  contentModule = player.getModule(APIModules.CONTENT);
  videoPlayer.getCurrentVideo( function (videoDTO) {
    // change the display name
    //videoDTO.displayName = "oh hai";
    // update the video DTO
    contentModule.updateMedia(videoDTO, function (newVideoDTO) {
      // play the video
      videoPlayer.play();
    });
  });
  //videoPlayer.play();
  videoPlayer.addEventListener( brightcove.api.events.MediaEvent.COMPLETE, onComplete);
}
function onComplete() {
  $('.video-container').hide();
  $('#end-screen').show();
}