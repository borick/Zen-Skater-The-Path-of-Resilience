import React, { useState } from 'react';
import { GameState, Character } from './types';
import { CHARACTERS } from './constants';
import Menu from './components/Menu';
import Game from './components/Game';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(CHARACTERS[0]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [unlockedLevels, setUnlockedLevels] = useState(1);

  // Simple state persistence could go here

  const startLevel = (level: number) => {
    setCurrentLevel(level);
    setGameState(GameState.PLAYING);
  };

  const handleLevelComplete = (level: number) => {
    // If we just finished the current max unlocked level, unlock the next one
    if (level >= unlockedLevels && level < 10) {
      setUnlockedLevels(level + 1);
      // Auto start next level? Or go back to menu?
      // Game component handles "Next Level" button logic, which calls this.
      // If user clicks "Next Level", we update currentLevel.
      setCurrentLevel(level + 1);
      setGameState(GameState.PLAYING); // Re-mount Game with new level
    } else if (level === 10) {
      // Game Over / Win
      setGameState(GameState.MENU); // Or a specialized Victory screen
    } else {
       // Replaying an old level
       setCurrentLevel(level + 1);
       setGameState(GameState.PLAYING);
    }
  };

  const handleRetry = () => {
    // Force re-mount to reset state
    setGameState(GameState.MENU);
    setTimeout(() => setGameState(GameState.PLAYING), 0);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      {gameState === GameState.MENU && (
        <Menu 
          setGameState={setGameState} 
          setSelectedCharacter={setSelectedCharacter}
          selectedCharacter={selectedCharacter}
          unlockedLevels={unlockedLevels}
          startLevel={startLevel}
        />
      )}
      
      {gameState === GameState.PLAYING && (
        <Game 
          level={currentLevel} 
          character={selectedCharacter}
          onExit={() => setGameState(GameState.MENU)}
          onLevelComplete={handleLevelComplete}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
};

export default App;