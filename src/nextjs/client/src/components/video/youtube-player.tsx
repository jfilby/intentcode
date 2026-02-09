import YouTube from 'react-youtube'

interface Props {
  videoId: string
}

// The video ID is the unique string found in the YouTube URL (e.g., 'VIDEO_ID' in https://www.youtube.com)
export default function VideoPlayer({
  videoId
}: Props) {

  // Optional: Configuration options for the player (e.g., width, height, autoplay)
  const opts = {
    height: '390',
    width: '640',
    playerVars: {
      // https://developers.google.com
      autoplay: 1, // Autoplay the video (use 0 to disable)
    },
  }

  // Optional: Event handler for when the video is ready
  const onReady = (event: { target: { pauseVideo: () => void } }) => {
    // Access to player in all event handlers via event.target
    event.target.pauseVideo()
  }

  // Render
  return (
    <YouTube videoId={videoId} opts={opts} onReady={onReady} />
  )
}
