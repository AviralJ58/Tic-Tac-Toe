import { useGameStore } from './store/gameStore';
import NicknameScreen from './screens/NicknameScreen';
import FindingScreen from './screens/FindingScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';

import LobbyScreen from './screens/LobbyScreen';

const screens = {
  nickname: NicknameScreen,
  lobby: LobbyScreen,
  finding: FindingScreen,
  game: GameScreen,
  result: ResultScreen,
} as const;

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const isConnected = useGameStore((s) => s.isConnected);
  const Screen = screens[screen];

  return (
    <>
      {/* Connection indicator */}
      {screen !== 'nickname' && !isConnected && (
        <div className="fixed top-0 inset-x-0 bg-red-500/90 text-white text-xs text-center py-1 z-50">
          Disconnected — reconnecting...
        </div>
      )}
      <Screen />
    </>
  );
}
