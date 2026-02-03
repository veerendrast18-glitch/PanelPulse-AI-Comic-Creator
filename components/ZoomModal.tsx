
import React, { useState, useEffect, useCallback } from 'react';
import { ComicPanel } from '../types';
import { soundService } from '../services/soundService';

interface ZoomModalProps {
  panels: ComicPanel[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export const ZoomModal: React.FC<ZoomModalProps> = ({ panels, currentIndex, onNavigate, onClose }) => {
  const [panning, setPanning] = useState({ x: 50, y: 50 });
  const currentPanel = panels[currentIndex];

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < panels.length - 1) {
      soundService.playClick();
      onNavigate(currentIndex + 1);
      setPanning({ x: 50, y: 50 });
    }
  }, [currentIndex, panels.length, onNavigate]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      soundService.playClick();
      onNavigate(currentIndex - 1);
      setPanning({ x: 50, y: 50 });
    }
  }, [currentIndex, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd') handleNext();
      if (e.key === 'ArrowLeft' || e.key === 'a') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setPanning({ x, y });
  };

  const handleClose = () => {
    soundService.playClick();
    onClose();
  };

  if (!currentPanel) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300 halftone"
      onClick={handleClose}
    >
      {/* Navigation Buttons - Desktop Sides */}
      <div className="absolute inset-y-0 left-0 hidden md:flex items-center px-4 z-50">
        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`bg-yellow-400 text-black w-16 h-16 flex items-center justify-center border-4 border-black shadow-[6px_6px_0px_black] transition-all ${currentIndex === 0 ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:-translate-x-1 active:translate-x-0 active:shadow-none'}`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="absolute inset-y-0 right-0 hidden md:flex items-center px-4 z-50">
        <button 
          onClick={handleNext}
          disabled={currentIndex === panels.length - 1}
          className={`bg-yellow-400 text-black w-16 h-16 flex items-center justify-center border-4 border-black shadow-[6px_6px_0px_black] transition-all ${currentIndex === panels.length - 1 ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:translate-x-1 active:translate-x-0 active:shadow-none'}`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div 
        className="relative w-full max-w-4xl aspect-square bg-white border-[8px] border-black shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden cursor-crosshair animate-in zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
      >
        {/* Panning Container */}
        <div className="w-full h-full overflow-hidden bg-gray-900">
          {currentPanel.imageUrl ? (
            <img 
              key={currentPanel.id}
              src={currentPanel.imageUrl} 
              alt={currentPanel.imagePrompt}
              className="w-full h-full object-cover transition-transform duration-150 ease-out"
              style={{ 
                transform: 'scale(2.5)',
                transformOrigin: `${panning.x}% ${panning.y}%` 
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold italic">
              IMAGE LOADING...
            </div>
          )}
        </div>

        {/* HUD Elements */}
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="bg-black text-white px-4 py-2 font-bold comic-font text-2xl skew-x-[-12deg] shadow-[4px_4px_0px_rgba(250,204,21,1)]">
              PANEL {currentIndex + 1}
            </div>
            <div className="bg-yellow-400 text-black px-2 py-0.5 text-[10px] font-black uppercase inline-block border-2 border-black w-fit">
              {currentIndex + 1} / {panels.length}
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="pointer-events-auto bg-red-600 text-white w-12 h-12 flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_black] hover:bg-red-700 hover:-translate-y-1 active:translate-y-0.5 transition-all"
          >
            <span className="comic-font text-3xl">X</span>
          </button>
        </div>

        {/* Caption */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%] bg-white border-4 border-black p-4 shadow-[8px_8px_0px_black] pointer-events-none">
          <p className="text-center font-bold text-lg md:text-xl uppercase tracking-tighter leading-tight italic line-clamp-2">
            {currentPanel.caption}
          </p>
        </div>
        
        {/* Indicators */}
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1">
          <div className="text-[10px] font-bold uppercase text-black bg-yellow-400 px-2 border-2 border-black animate-pulse">
            Pan with mouse
          </div>
          <div className="hidden md:block text-[8px] font-bold uppercase text-white bg-black/50 px-1">
            Keys: ← / → / ESC
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="absolute bottom-0 inset-x-0 md:hidden flex h-14 border-t-4 border-black bg-white">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 border-r-2 border-black font-black uppercase text-xs active:bg-gray-100 disabled:opacity-30"
          >
            PREV
          </button>
          <div className="flex-[0.5] flex items-center justify-center font-black bg-gray-100 border-x-2 border-black italic">
            {currentIndex + 1}
          </div>
          <button 
            onClick={handleNext}
            disabled={currentIndex === panels.length - 1}
            className="flex-1 font-black uppercase text-xs active:bg-gray-100 disabled:opacity-30"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
};
