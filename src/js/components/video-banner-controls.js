function messageVideoiFrame(vidFunc,vidID,vidSrc) {
    let videoiFrame = document.getElementById(vidID).contentWindow;
    let videoiFrameFunc = vidFunc;
    if(vidSrc == 'youtube') {
        if(videoiFrameFunc == 'play') {
            videoiFrameFunc = 'playVideo';
        } else if(videoiFrameFunc == 'pause') {
            videoiFrameFunc = 'pauseVideo';
        }
        videoiFrame.postMessage(
            '{"event":"command","func":"' + videoiFrameFunc + '","args":""}',
            "*"
        );
    }
    if(vidSrc == 'vimeo') {
        videoiFrame.postMessage(
            '{"method":"' + videoiFrameFunc + '","args":""}',
            "*"
        );        
    }
    if(vidSrc == 'video') {
        const videoEl = document.getElementById(vidID);
        if(videoiFrameFunc == 'play') {
            videoEl.play();
        } else if(videoiFrameFunc == 'pause') {
            videoEl.pause();
        }   
    }    
}

let playpauseButtons = document.getElementsByClassName("js-video-button__playpause");
for (let playpauseButton of playpauseButtons) {
    playpauseButton.addEventListener("click", function () {
        let buttonState = this.getAttribute('data-button-state');
        let buttonType = this.getAttribute('data-button-type');
        let videoFrameId = this.getAttribute('data-video-frameid');
        let videoSource = document.getElementById(videoFrameId).getAttribute('data-video-source');
        if(buttonState == "pause") {
            messageVideoiFrame('pause',videoFrameId,videoSource);         
            this.setAttribute('data-button-state','play');
            if(buttonType == 'material') {
                this.innerHTML="play_arrow";
            } else {
                this.innerHTML="Play";
            }
        } else if(buttonState == "play") {
            messageVideoiFrame('play',videoFrameId,videoSource);
            this.setAttribute('data-button-state','pause');
            if(buttonType == 'material') {
                this.innerHTML="pause";
            } else {
                this.innerHTML="Pause";
            }       
        }
    });
}