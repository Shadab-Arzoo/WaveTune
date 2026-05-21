import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import TrackPlayer, {
  useProgress,
  usePlaybackState,
  State,
  RepeatMode,
} from "react-native-track-player";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, Song } from "../services/api";
import { addTrackAndPlay } from "../services/trackPlayerService";
import { setupPlayer } from "../services/trackPlayerService";
import type { RootStackParamList } from "../navigation/types";
import Slider from "@react-native-community/slider";

import { playerStore } from "../store/playerStore";

const { width } = Dimensions.get("window");
const FALLBACK_ARTWORK = "https://via.placeholder.com/600x600/1a1a2e/7c3aed?text=WaveTune";

type PlayerScreenProps = NativeStackScreenProps<RootStackParamList, "Player">;

const PlayerScreen: React.FC<PlayerScreenProps> = ({ route, navigation }) => {
  const { song: initialSong, allSongs, currentIndex: initialIndex, fromMiniPlayer } = route.params;

  const [currentSong, setCurrentSong] = useState<Song>(initialSong);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    playerStore.setQueue(allSongs, currentIndex);
  }, [allSongs, currentIndex]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(RepeatMode.Queue);

  const progress = useProgress();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const isBuffering =
    playbackState.state === State.Buffering ||
    playbackState.state === State.Loading;


  const loadSong = async (song: Song) => {
    setLoading(true);
    setError(null);

    try {
      await setupPlayer();
      setPlayerReady(true);

      const streamData = await api.getStreamUrl(song.id);

      await addTrackAndPlay({
        id: song.id,
        url: streamData.audioUrl,
        title: streamData.title || song.title,
        artist: song.artist,
        artwork: song.thumbnail,
      });

      setLoading(false);
    } catch (err: any) {
      console.error("Load song error:", err.message);
      setError("Failed to load audio. Try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!playerReady) {
      return;
    }

    TrackPlayer.setRepeatMode(repeatMode).catch((repeatError) => {
      console.error("Failed to set repeat mode:", repeatError);
      setError("Could not update repeat mode.");
    });
  }, [repeatMode, playerReady]);

  const pickRandomIndex = () => {
    if (allSongs.length <= 1) {
      return currentIndex;
    }

    let randomIndex = currentIndex;
    while (randomIndex === currentIndex) {
      randomIndex = Math.floor(Math.random() * allSongs.length);
    }
    return randomIndex;
  };

  const handleToggleShuffle = () => {
    setIsShuffleEnabled((prev) => !prev);
  };

  const handleToggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === RepeatMode.Off) return RepeatMode.Track;
      if (prev === RepeatMode.Track) return RepeatMode.Queue;
      return RepeatMode.Off;
    });
  };

  const canGoPrevious = isShuffleEnabled || currentIndex > 0;
  const canGoNext = isShuffleEnabled || currentIndex < allSongs.length - 1;

  useEffect(() => {
    // If opened from MiniPlayer and it's the initial song, we don't want to restart it.
    if (route.params.fromMiniPlayer && currentSong.id === initialSong.id) {
      setPlayerReady(true);
      setLoading(false);
      return;
    }

    loadSong(currentSong);

    return () => {
      if (playerReady) {
        TrackPlayer.pause().catch((error) => {
          console.warn("TrackPlayer pause failed on cleanup:", error);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong]);

  const handlePlayPause = async () => {
    if (!playerReady) {
      setError("Audio player is still initializing.");
      return;
    }

    try {
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (err: any) {
      console.error("Play/pause failed:", err);
      setError("Playback action failed. Try again.");
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      const nextIndex = isShuffleEnabled ? pickRandomIndex() : currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentSong(allSongs[nextIndex]);
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      const prevIndex = isShuffleEnabled ? pickRandomIndex() : currentIndex - 1;
      setCurrentIndex(prevIndex);
      setCurrentSong(allSongs[prevIndex]);
    }
  };

  const handleSeek = async (value: number) => {
    if (!playerReady) {
      setError("Audio player is still initializing.");
      return;
    }

    try {
      await TrackPlayer.seekTo(value);
    } catch (err: any) {
      console.error("Seek failed:", err);
      setError("Seeking failed. Try again.");
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <View style={styles.menuButton} />
      </View>

      {/* Album Art */}
      <View style={styles.artworkContainer}>
        <Image
          source={{ uri: currentSong.thumbnail || FALLBACK_ARTWORK }}
          style={styles.artwork}
          resizeMode="cover"
        />
        {(loading || isBuffering) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.bufferingText}>
              {loading ? "Loading audio..." : "Buffering..."}
            </Text>
          </View>
        )}
      </View>

      {/* Song Info */}
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={2}>
          {currentSong.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {currentSong.artist}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          value={progress.position}
          minimumValue={0}
          maximumValue={progress.duration || 1}
          minimumTrackTintColor="#7c3aed"
          maximumTrackTintColor="#333333"
          thumbTintColor="#7c3aed"
          onSlidingComplete={handleSeek}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(progress.position)}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(progress.duration)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handleToggleShuffle}
          style={styles.secondaryControl}
        >
          <Icon
            name="shuffle"
            size={22}
            color={isShuffleEnabled ? "#7c3aed" : "#555555"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePrevious}
          style={styles.controlButton}
          disabled={!canGoPrevious}
        >
          <Icon
            name="play-skip-back"
            size={28}
            color={!canGoPrevious ? "#333333" : "#ffffff"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePlayPause}
          style={styles.playButton}
          disabled={loading}
        >
          {loading || isBuffering ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Icon
              name={isPlaying ? "pause" : "play"}
              size={28}
              color="#ffffff"
              style={!isPlaying ? { marginLeft: 3 } : undefined}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={styles.controlButton}
          disabled={!canGoNext}
        >
          <Icon
            name="play-skip-forward"
            size={28}
            color={!canGoNext ? "#333333" : "#ffffff"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleToggleRepeat}
          style={styles.secondaryControl}
        >
          <Icon
            name={repeatMode === RepeatMode.Track ? "repeat-outline" : "repeat"}
            size={22}
            color={repeatMode === RepeatMode.Off ? "#555555" : "#7c3aed"}
          />
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => loadSong(currentSong)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Queue Info */}
      <View style={styles.queueInfo}>
        <Text style={styles.queueText}>
          Track {currentIndex + 1} of {allSongs.length}
        </Text>
        <Text style={styles.queueText}>
          {isShuffleEnabled ? "Shuffle On" : "Shuffle Off"} • Repeat{" "}
          {repeatMode === RepeatMode.Off
            ? "Off"
            : repeatMode === RepeatMode.Track
              ? "One"
              : "All"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  backButton: {
    padding: 4,
  },
  backText: {
    color: "#7c3aed",
    fontSize: 15,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#aaaaaa",
    fontSize: 14,
    fontWeight: "600",
  },
  menuButton: {
    width: 50,
  },
  artworkContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 24,
    position: "relative",
  },
  artwork: {
    width: width - 60,
    height: width - 60,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  bufferingText: {
    color: "#aaaaaa",
    fontSize: 13,
    marginTop: 10,
  },
  songInfo: {
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  songTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 6,
  },
  songArtist: {
    color: "#888888",
    fontSize: 15,
    textAlign: "center",
  },
  progressContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
  },
  timeText: {
    color: "#666666",
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  secondaryControl: {
    padding: 12,
  },
  controlButton: {
    padding: 14,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 14,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,107,107,0.1)",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 13,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: "rgba(255,107,107,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: "#ff6b6b",
    fontSize: 13,
    fontWeight: "600",
  },
  queueInfo: {
    alignItems: "center",
    paddingBottom: 30,
  },
  queueText: {
    color: "#555555",
    fontSize: 12,
    marginVertical: 2,
  },
});

export default PlayerScreen;
