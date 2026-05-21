import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
} from "react-native-track-player";

export async function setupPlayer() {
  try {
    await TrackPlayer.getActiveTrack();
    return true;
  } catch (error) {
    console.warn("TrackPlayer not initialized yet:", error);
  }

  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
    });

    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    return true;
  } catch (error) {
    console.error("TrackPlayer setup failed:", error);
    return false;
  }
}

export async function addTrackAndPlay(track: {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork: string;
}) {
  await TrackPlayer.reset();
  await TrackPlayer.add(track);
  await TrackPlayer.play();
}
