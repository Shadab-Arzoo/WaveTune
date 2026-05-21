import { Platform } from "react-native";
import axios, { AxiosError } from "axios";

// Try emulator and local-hosted backends automatically.
const MAC_LAN_IP = "192.168.0.134";

const BASE_URL_CANDIDATES =
  Platform.OS === "android"
    ? [
        "http://10.0.2.2:5001/api",
        `http://${MAC_LAN_IP}:5001/api`,
        "http://127.0.0.1:5001/api",
        "http://localhost:5001/api",
      ]
    : [
        "http://127.0.0.1:5001/api",
        "http://localhost:5001/api",
        `http://${MAC_LAN_IP}:5001/api`,
      ];

let activeBaseUrl = BASE_URL_CANDIDATES[0];

export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  viewCount: number;
}

export interface StreamData {
  videoId: string;
  title: string;
  audioUrl: string;
  duration: string;
  thumbnail: string;
}

function shouldTryNextBaseUrl(error: AxiosError) {
  if (!error.response) {
    return true;
  }

  return error.response.status >= 500;
}

async function withBaseUrlFallback<T>(
  request: (baseUrl: string) => Promise<T>
): Promise<T> {
  const orderedBaseUrls = [
    activeBaseUrl,
    ...BASE_URL_CANDIDATES.filter((url) => url !== activeBaseUrl),
  ];

  let lastError: unknown;

  for (const baseUrl of orderedBaseUrls) {
    try {
      const result = await request(baseUrl);
      activeBaseUrl = baseUrl;
      return result;
    } catch (error) {
      const axiosError = error as AxiosError;
      lastError = error;
      if (!shouldTryNextBaseUrl(axiosError)) {
        throw error;
      }
    }
  }

  throw lastError;
}

export const api = {
  getTrending: async (): Promise<Song[]> => {
    const response = await withBaseUrlFallback((baseUrl) =>
      axios.get(`${baseUrl}/trending`, {
        timeout: 60000,
      })
    );
    return response.data.songs;
  },

  searchSongs: async (query: string): Promise<Song[]> => {
    const response = await withBaseUrlFallback((baseUrl) =>
      axios.get(`${baseUrl}/search`, {
        params: { q: query },
        timeout: 30000,
      })
    );
    return response.data.songs;
  },

  getStreamUrl: async (videoId: string): Promise<StreamData> => {
    const response = await withBaseUrlFallback((baseUrl) =>
      axios.get(`${baseUrl}/stream/${videoId}`, {
        timeout: 30000,
      })
    );
    return response.data;
  },
};
