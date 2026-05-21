import type { Song } from "../services/api";

export type RootStackParamList = {
  Home: undefined;
  Player: {
    song: Song;
    allSongs: Song[];
    currentIndex: number;
    fromMiniPlayer?: boolean;
  };
};
