/**
 * @format
 */

import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { name as appName } from './app.json';

TrackPlayer.registerPlaybackService(() => require('./src/services/playbackService'));
AppRegistry.registerComponent(appName, () => App);
