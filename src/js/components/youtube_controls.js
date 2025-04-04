function messageYoutubeVideoiFrame(vidFunc,vidID) {
    let messageYoutubeVideoiFrame = document.getElementById(vidID).contentWindow;
    messageYoutubeVideoiFrame.postMessage(
      '{"event":"command","func":"' + vidFunc + '","args":""}',
      "*"
    );
}

let playpauseButtons = document.getElementsByClassName("js-youtube-button__playpause");
for (let playpauseButton of playpauseButtons) {
    playpauseButton.addEventListener("click", function () {
        let buttonState = this.getAttribute('data-button-state');
        let youtubeFrameId = this.getAttribute('data-youtube-frameid');
        if(buttonState == "pause") {
            messageYoutubeVideoiFrame('pauseVideo',youtubeFrameId)
            this.setAttribute('data-button-state','play');
            this.innerHTML="Play";
        } else if(buttonState == "play") {
            messageYoutubeVideoiFrame('playVideo',youtubeFrameId)
            this.setAttribute('data-button-state','pause');
            this.innerHTML="Pause";
        }
    });
}