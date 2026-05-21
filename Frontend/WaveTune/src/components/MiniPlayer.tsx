import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import TrackPlayer, { useActiveTrack, usePlaybackState, State } from 'react-native-track-player';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

import { playerStore } from '../store/playerStore';

const MiniPlayer = () => {
  const navigation = useNavigation<NavigationProp>();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  if (!activeTrack) {
    return null;
  }

  const isPlaying = playbackState.state === State.Playing;
  const isLoading = playbackState.state === State.Loading || playbackState.state === State.Buffering;

  const togglePlayback = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.container}
      onPress={() => {
        navigation.navigate('Player', {
          song: {
            id: activeTrack.id,
            title: activeTrack.title || '',
            artist: activeTrack.artist || '',
            thumbnail: (activeTrack.artwork as string) || '',
            duration: activeTrack.duration || 0,
            url: activeTrack.url as string,
            viewCount: 0,
          },
          allSongs: playerStore.queue,
          currentIndex: playerStore.currentIndex,
          fromMiniPlayer: true,
        });
      }}
    >
      <View style={styles.content}>
        <Image
          source={{ uri: (activeTrack.artwork as string) || 'https://via.placeholder.com/150' }}
          style={styles.artwork}
        />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{activeTrack.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{activeTrack.artist}</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={togglePlayback} style={styles.controlButton}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name={isPlaying ? 'pause' : 'play'} size={26} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#2a2a2a',
  },
  info: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    color: '#888888',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 10,
  },
});

export default MiniPlayer;
