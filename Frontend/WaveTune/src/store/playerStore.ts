import { Song } from '../services/api';

class PlayerStore {
  queue: Song[] = [];
  currentIndex: number = 0;

  setQueue(queue: Song[], index: number) {
    this.queue = queue;
    this.currentIndex = index;
  }
}

export const playerStore = new PlayerStore();
