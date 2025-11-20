import React from 'react';
import { Character, GameState } from '../types';
import { CHARACTERS } from '../constants';
import { Play, Trophy, Skateboarding, User } from 'lucide-react';

interface MenuProps {
  setGameState: (state: GameState) => void;
  setSelectedCharacter: (char: Character) => void;
  selectedCharacter: Character;
  unlockedLevels: number;
  startLevel: (level: number) => void;
}

const Menu: React.FC<MenuProps> = ({ 
  setGameState, 
  setSelectedCharacter, 
  selectedCharacter,
  unlockedLevels,
  startLevel
}) => {
  const [view, setView] = React.useState<'main' | 'char' | 'levels'>('main');

  const renderMain = () => (
    <div className="flex flex-col items-center justify-center space-y-10 animate-fade-in z-10">
      <div className="relative">
        <div className="absolute -inset-4 bg-yellow-500 blur-3xl opacity-20"></div>
        <h1 className="text-8xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 drop-shadow-lg tracking-widest marker-font transform -rotate-2">
          ZEN SKATER
        </h1>
      </div>
      <p className="text-indigo-200 text-xl font-light tracking-widest uppercase border-t border-b border-indigo-500/30 py-2">
        Resilience • Balance • Flow
      </p>
      
      <div className="flex flex-col gap-4 w-72">
        <button 
          onClick={() => setView('levels')}
          className="group relative flex items-center justify-center gap-3 bg-white text-black font-black text-lg py-4 px-8 rounded-sm skew-x-[-10deg] hover:scale-105 transition-transform overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <Play size={24} className="relative z-10 group-hover:fill-black" /> 
          <span className="relative z-10">START SESSION</span>
        </button>
        
        <button 
          onClick={() => setView('char')}
          className="flex items-center justify-center gap-3 border border-white/20 text-white font-bold py-3 px-8 rounded-sm skew-x-[-10deg] hover:bg-white/10 transition-colors"
        >
          <User size={20} /> SELECT SKATER
        </button>
      </div>
    </div>
  );

  const renderCharSelect = () => (
    <div className="flex flex-col items-center space-y-8 w-full max-w-5xl z-10">
      <h2 className="text-5xl text-white marker-font tracking-wide">CHOOSE YOUR VIBE</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full px-8">
        {CHARACTERS.map((char) => (
          <div 
            key={char.id}
            onClick={() => setSelectedCharacter(char)}
            className={`relative group p-6 rounded-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-2 overflow-hidden ${
              selectedCharacter.id === char.id 
                ? 'bg-gray-800 ring-4 ring-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]' 
                : 'bg-gray-900/80 border border-gray-700 hover:border-gray-500'
            }`}
          >
            {/* Hover Effect BG */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-[${char.color}]`}></div>

            <div className="h-32 w-full bg-black/50 rounded-lg mb-6 flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-grid-slate-700/[0.2] bg-[length:20px_20px]"></div>
               <div 
                 className="w-20 h-20 rounded-full border-4 flex items-center justify-center text-3xl font-bold shadow-lg z-10"
                 style={{ borderColor: char.color, color: char.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
               >
                 {char.name[0]}
               </div>
            </div>
            
            <h3 className="text-3xl text-white font-bold mb-1 italic uppercase">{char.name}</h3>
            <p className="text-gray-400 text-sm mb-6 h-10 leading-tight">{char.description}</p>
            
            <div className="space-y-3">
              <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span className="w-20">Speed</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${(char.speed / 15) * 100}%` }}></div>
                </div>
              </div>
              <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span className="w-20">Air</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-600 to-green-400" style={{ width: `${(char.jumpForce / 25) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button 
        onClick={() => setView('main')}
        className="text-gray-500 hover:text-white mt-8 uppercase tracking-widest text-sm font-bold"
      >
        ← Back to Menu
      </button>
    </div>
  );

  const renderLevels = () => (
    <div className="flex flex-col items-center space-y-10 w-full max-w-4xl z-10">
      <h2 className="text-5xl text-white marker-font">SELECT DROP POINT</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => {
          const levelNum = i + 1;
          const isLocked = levelNum > unlockedLevels;
          return (
            <button
              key={i}
              disabled={isLocked}
              onClick={() => startLevel(levelNum)}
              className={`group h-28 w-28 rounded-xl flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden ${
                isLocked 
                  ? 'bg-gray-900/50 text-gray-700 border border-gray-800 cursor-not-allowed' 
                  : 'bg-gray-800 text-yellow-400 border-2 border-yellow-500 hover:scale-110 hover:shadow-[0_0_25px_rgba(250,204,21,0.3)]'
              }`}
            >
              {!isLocked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              )}
              
              <span className="text-3xl font-black marker-font z-10">{levelNum}</span>
              
              {isLocked ? (
                 <div className="h-1 w-1 bg-gray-700 rounded-full"></div>
              ) : (
                 <div className="text-[10px] bg-yellow-500 text-black font-bold px-2 py-0.5 rounded uppercase tracking-wider z-10">
                    Play
                 </div>
              )}
            </button>
          );
        })}
      </div>
      <button 
        onClick={() => setView('main')}
        className="text-gray-500 hover:text-white mt-8 uppercase tracking-widest text-sm font-bold"
      >
        ← Back to Menu
      </button>
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0C15] overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>
      
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] z-0"></div>
      
      {view === 'main' && renderMain()}
      {view === 'char' && renderCharSelect()}
      {view === 'levels' && renderLevels()}
    </div>
  );
};

export default Menu;