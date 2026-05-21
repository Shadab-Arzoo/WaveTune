import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Dimensions,
  RefreshControl,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, Song } from "../services/api";
import type { RootStackParamList } from "../navigation/types";
import MiniPlayer from "../components/MiniPlayer";

const { width } = Dimensions.get("window");
const CARD_WIDTH = 160;
const FALLBACK_THUMBNAIL = "https://via.placeholder.com/600x600/1a1a2e/7c3aed?text=WaveTune";

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<Record<string, Song>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getTrending();
      setSongs(data);
    } catch (err: any) {
      setError("Failed to load songs. Make sure backend is running.");
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // displaySongs and showFavoritesOnly removed

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchTrending();
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const results = await api.searchSongs(searchQuery.trim());
      setSongs(results);
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setSearchQuery("");
    fetchTrending();
  };

  const toggleFavorite = useCallback((song: Song) => {
    setFavoriteSongs((prev) => {
      if (prev[song.id]) {
        const updated = { ...prev };
        delete updated[song.id];
        return updated;
      }

      return { ...prev, [song.id]: song };
    });
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViews = (count: number) => {
    if (!count) return "";
    if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const renderSongCard = ({ item, index }: { item: Song; index: number }) => (
    <TouchableOpacity
      style={[styles.songCard, { marginLeft: index === 0 ? 16 : 8, marginRight: 8, width: CARD_WIDTH }]}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("Player", {
          song: item,
          allSongs: songs, // Using trending as the default playlist for now
          currentIndex: index,
        })
      }
    >
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: item.thumbnail || FALLBACK_THUMBNAIL }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.thumbnailOverlay} />
        {item.duration > 0 && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(item.duration)}
            </Text>
          </View>
        )}
        <View style={styles.playIconOverlay}>
          <Icon name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item)}
        >
          <Icon
            name={favoriteSongs[item.id] ? "heart" : "heart-outline"}
            size={18}
            color={favoriteSongs[item.id] ? "#1DB954" : "#ffffff"}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist}
        </Text>
        {item.viewCount > 0 && (
          <Text style={styles.viewCount}>
            {formatViews(item.viewCount)} views
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.logo}>🎵 WaveTune</Text>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="settings-outline" size={22} color="#aaaaaa" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon
            name="search"
            size={18}
            color="#888888"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs, artists..."
            placeholderTextColor="#888888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                fetchTrending();
              }}
            >
              <Icon name="close-circle" size={18} color="#888888" />
            </TouchableOpacity>
          )}
          {isSearching && (
            <ActivityIndicator size="small" color="#7c3aed" />
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading songs...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Icon name="cloud-offline" size={40} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTrending}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7c3aed"
              colors={["#7c3aed"]}
            />
          }
        >
          {/* Favorites Section */}
          {Object.keys(favoriteSongs).length > 0 && !searchQuery && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>❤️ Favorites</Text>
                <Text style={styles.sectionSubTitle}>
                  {Object.keys(favoriteSongs).length} liked track{Object.keys(favoriteSongs).length === 1 ? "" : "s"}
                </Text>
              </View>
              <FlatList
                data={Object.values(favoriteSongs)}
                keyExtractor={(item) => item.id}
                renderItem={renderSongCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            </>
          )}

          {/* Main List Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? "Search Results" : "🔥 Trending Now"}
            </Text>
          </View>
          {songs.length === 0 ? (
            <View style={styles.centerContainer}>
              <Icon name="musical-notes" size={40} color="#555555" />
              <Text style={styles.emptyText}>No songs found</Text>
            </View>
          ) : (
            <FlatList
              data={songs}
              keyExtractor={(item) => item.id}
              renderItem={renderSongCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </ScrollView>
      )}
      <MiniPlayer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
  },
  headerIcon: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  sectionSubTitle: {
    color: "#888888",
    fontSize: 13,
    marginTop: 2,
  },
  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionActionButton: {
    padding: 8,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  songCard: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#1e1e1e",
    overflow: "hidden",
  },
  thumbnailContainer: {
    width: "100%",
    height: CARD_WIDTH,
    backgroundColor: "#2a2a2a",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  playIconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  songInfo: {
    padding: 10,
  },
  songTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 3,
  },
  songArtist: {
    color: "#888888",
    fontSize: 12,
  },
  viewCount: {
    color: "#666666",
    fontSize: 11,
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  loadingText: {
    color: "#aaaaaa",
    fontSize: 15,
    marginTop: 14,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    color: "#888888",
    fontSize: 15,
    marginTop: 12,
  },
});

export default HomeScreen;
