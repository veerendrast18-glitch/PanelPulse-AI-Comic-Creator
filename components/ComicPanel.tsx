
import React from 'react';
import { ComicPanel as ComicPanelType } from '../types';
import { soundService } from '../services/soundService';

interface ComicPanelProps {
  panel: ComicPanelType;
  index: number;
  onZoom: (index: number) => void;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({ panel, index, onZoom }) => {
  const playAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sounds = [
      () => soundService.playActionPow(),
      () => soundService.playActionBoom(),
      () => soundService.playActionZap()
    ];
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    randomSound();
    
    const div = document.createElement('div');
    div.innerText = ['THWACK!', 'CRACK!', 'ZAP!', 'BOOM!'][Math.floor(Math.random() * 4)];
    div.className = 'absolute font-bold text-3xl text-red-600 comic-font pointer-events-none z-50 animate-pulse select-none opacity-80';
    div.style.left = `${e.nativeEvent.offsetX}px`;
    div.style.top = `${e.nativeEvent.offsetY}px`;
    div.style.textShadow = '2px 2px 0px white';
    e.currentTarget.appendChild(div);
    setTimeout(() => div.remove(), 800);
  };

  const handleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!panel.isGenerating && panel.imageUrl) {
      soundService.playClick();
      onZoom(index);
    }
  };

  return (
    <div className={`relative group overflow-hidden border-2 border-zinc-900 bg-zinc-100 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] hover:shadow-[10px_10px_0px_0px_rgba(24,24,27,1)] transition-all duration-300 ${!panel.isGenerating && panel.imageUrl ? 'animate-panel-pop' : ''}`}>
      <div 
        className="aspect-square bg-zinc-200 flex items-center justify-center relative overflow-hidden cursor-crosshair"
        onClick={!panel.isGenerating && panel.imageUrl ? playAction : undefined}
      >
        {panel.isGenerating ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center animate-pulse">
            <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-xs uppercase tracking-widest text-zinc-600">Developing Scene {index + 1}...</p>
          </div>
        ) : panel.imageUrl ? (
          <img 
            src={panel.imageUrl} 
            alt={panel.imagePrompt} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
        ) : (
          <div className="p-8 text-center text-zinc-400 italic text-sm">
            Sequence awaiting input...
          </div>
        )}
        
        <div className="absolute top-0 left-0 bg-zinc-900 text-white px-3 py-1 font-bold text-[10px] z-10 comic-font">
          SEQ.{index + 1}
        </div>

        {/* Zoom Button */}
        {!panel.isGenerating && panel.imageUrl && (
          <button 
            onClick={handleZoom}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all bg-white text-zinc-900 p-1.5 border-2 border-zinc-900 shadow-[2px_2px_0px_zinc-900] hover:bg-zinc-900 hover:text-white z-30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </button>
        )}

        {/* Caption Overlay */}
        {!panel.isGenerating && panel.imageUrl && panel.caption && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-zinc-900 text-white p-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] z-10 animate-caption-slide">
            <p className="text-center typewriter-font text-xs sm:text-sm leading-relaxed italic">
              "{panel.caption}"
            </p>
          </div>
        )}
      </div>

      {/* Description HUD */}
      <div className="absolute inset-0 bg-zinc-900/90 p-6 overflow-y-auto text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none flex flex-col justify-center">
        <h4 className="font-bold mb-3 text-indigo-400 comic-font text-lg border-b border-indigo-400/30 pb-1">TECHNICAL SCRIPT</h4>
        <p className="leading-relaxed opacity-80">{panel.imagePrompt}</p>
      </div>
    </div>
  );
};
