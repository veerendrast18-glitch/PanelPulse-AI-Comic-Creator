
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './components/Button';
import { ComicPanel as PanelComponent } from './components/ComicPanel';
import { AccountSection } from './components/AccountSection';
import { ZoomModal } from './components/ZoomModal';
import { generateStoryScript, generatePanelImage, describeImage, generateVillainProfile, generateComicVideo } from './services/geminiService';
import { soundService } from './services/soundService';
import { authService } from './services/authService';
import { ComicStory, VillainProfile, UserAccount } from './types';
import { User } from 'firebase/auth';

const ART_STYLES = [
  { id: 'classic', label: 'Graphic Novel', icon: '📓' },
  { id: 'manga', label: 'Seinen', icon: '🌑' },
  { id: 'noir', label: 'Noir', icon: '🚬' },
  { id: 'realistic', label: 'Painted', icon: '🎨' },
  { id: 'retro', label: 'Vintage', icon: '📠' },
];

const VIDEO_MESSAGES = [
  "Assembling cinematic sequence...",
  "Applying atmospheric lighting...",
  "Rendering frame transitions...",
  "Encoding narrative flow...",
  "Finalizing visual continuity..."
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'lab' | 'account'>('account');
  const [prompt, setPrompt] = useState('');
  const [panelCount, setPanelCount] = useState(4);
  const [selectedStyle, setSelectedStyle] = useState('classic');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [comic, setComic] = useState<ComicStory | null>(null);
  const [villain, setVillain] = useState<VillainProfile | null>(null);
  const [isVillainLoading, setIsVillainLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [zoomedPanelIndex, setZoomedPanelIndex] = useState<number | null>(null);
  
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatusIndex, setVideoStatusIndex] = useState(0);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLTextAreaElement>(null);

  // Auth Subscription
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((user) => {
      setFirebaseUser(user);
      setIsAuthLoading(false);
      const accData = authService.getAccountSync(user);
      setAccount(accData);
      
      if (user && activeTab === 'account' && !comic) {
        setActiveTab('studio');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    soundService.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    let interval: number;
    if (isVideoLoading) {
      interval = window.setInterval(() => {
        setVideoStatusIndex(prev => (prev + 1) % VIDEO_MESSAGES.length);
      }, 5000);
    }
    return () => window.clearInterval(interval);
  }, [isVideoLoading]);

  // Fix: Added startCamera function to handle camera access
  const startCamera = async () => {
    soundService.playClick();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOpen(true);
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      soundService.stopMusic();
    };
  }, [stopCamera]);

  // Fix: Added handleFileChange function to handle image uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fix: Added handleLoadSavedComic function to load comics from the archive
  const handleLoadSavedComic = (savedComic: ComicStory) => {
    soundService.playClick();
    setComic(savedComic);
    setActiveTab('studio');
  };

  const handleNavClick = (id: string) => {
    if (!firebaseUser && id !== 'account') {
      soundService.playClick();
      setError("Please sign in to access these features.");
      setActiveTab('account');
      return;
    }

    soundService.playClick();
    setError(null);

    switch(id) {
      case 'studio':
      case 'scenes':
        setActiveTab('studio');
        break;
      case 'upload':
        setActiveTab('studio');
        setTimeout(() => fileInputRef.current?.click(), 100);
        break;
      case 'write':
        setActiveTab('studio');
        setTimeout(() => storyInputRef.current?.focus(), 100);
        break;
      case 'lab':
        setActiveTab('lab');
        break;
      case 'export':
        if (comic) handleCreateVideo();
        else setError("Create a comic first to export as video.");
        break;
      case 'account':
        setActiveTab('account');
        break;
    }
  };

  const createComic = async () => {
    if (!prompt && !referenceImage) return;
    setIsLoading(true);
    setError(null);
    setComic(null);
    setVideoUrl(null);
    setStatusMessage('Conceptualizing narrative...');

    try {
      let imageDescription = '';
      if (referenceImage) {
        setStatusMessage('Analyzing visual source...');
        imageDescription = await describeImage(referenceImage.split(',')[1]);
      }

      setStatusMessage('Drafting script...');
      const story = await generateStoryScript(prompt, panelCount, imageDescription);
      
      const initialComic: ComicStory = {
        ...story,
        panels: story.panels.map((p, i) => ({ ...p, id: `p-${i}`, isGenerating: true }))
      };
      setComic(initialComic);

      const updatedPanels = [...initialComic.panels];
      for (let i = 0; i < updatedPanels.length; i++) {
        setStatusMessage(`Rendering panel ${i + 1}/${updatedPanels.length}...`);
        const imageUrl = await generatePanelImage(updatedPanels[i].imagePrompt, selectedStyle);
        updatedPanels[i] = { ...updatedPanels[i], imageUrl, isGenerating: false };
        setComic(prev => prev ? { ...prev, panels: [...updatedPanels] } : null);
        soundService.playPanelDone();
      }
      soundService.playSuccess();
    } catch (e) { setError("The creative engine stalled. Please try again."); }
    finally { setIsLoading(false); setStatusMessage(''); }
  };

  const handleCreateVideo = async () => {
    if (!comic) return;

    // Fix: Mandatory API key selection check for Veo models as per guidelines
    const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
    if (!hasKey) {
      const shouldOpen = window.confirm("Video generation requires a paid API key from a Google Cloud Project with billing enabled. Would you like to select one now?");
      if (shouldOpen) {
        await (window as any).aistudio?.openSelectKey();
        // Proceeding assumes success per race condition rules
      } else {
        return;
      }
    }

    setIsVideoLoading(true);
    setVideoStatusIndex(0);
    setError(null);
    try {
      const url = await generateComicVideo(comic, selectedStyle);
      setVideoUrl(url);
      soundService.playSuccess();
    } catch (e: any) {
      if (e?.message?.includes("Requested entity was not found")) {
        setError("API configuration error. Please re-select your paid API key.");
        await (window as any).aistudio?.openSelectKey();
      } else {
        setError("Video synthesis failed. Please check your connection.");
      }
    } finally {
      setIsVideoLoading(false);
    }
  };

  const spawnVillain = async () => {
    setIsVillainLoading(true);
    setError(null);
    try {
      const profile = await generateVillainProfile(prompt);
      setVillain(profile);
      soundService.playVillainSpawn();
    } catch (e) { setError("Intelligence profiling failed."); }
    finally { setIsVillainLoading(false); }
  };

  const handleLogout = async () => {
    soundService.playClick();
    await authService.logout();
    setAccount(null);
    setFirebaseUser(null);
    setActiveTab('account');
    setComic(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      soundService.playPop();
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      setReferenceImage(canvas.toDataURL('image/png'));
      stopCamera();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 halftone">
        <div className="text-center animate-pulse">
          <div className="w-10 h-10 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Verifying Author...</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'studio', label: 'Create Comic', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg> },
    { id: 'upload', label: 'Upload Image', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> },
    { id: 'write', label: 'Write Story', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
    { id: 'lab', label: 'Characters', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { id: 'scenes', label: 'Scenes', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
    { id: 'export', label: 'Export', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> },
    { id: 'account', label: 'My Account', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-50 halftone">
      {zoomedPanelIndex !== null && comic && (
        <ZoomModal panels={comic.panels} currentIndex={zoomedPanelIndex} onNavigate={setZoomedPanelIndex} onClose={() => setZoomedPanelIndex(null)} />
      )}

      {/* Modern Professional Sidebar */}
      <aside className="lg:w-72 lg:h-screen bg-white border-b lg:border-b-0 lg:border-r border-zinc-200 flex flex-col no-print z-50 lg:sticky lg:top-0">
        <div className="p-8 pb-6">
          <h1 className="text-2xl comic-font tracking-tighter text-zinc-900 mb-1">PANEL PULSE</h1>
          <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
            Transform ideas or images into vibrant comic book adventures.
          </p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <div className="px-4 py-2 text-[10px] font-bold text-zinc-300 uppercase tracking-widest mb-1">Create & Manage</div>
          {sidebarItems.map((item) => {
            const isLocked = !firebaseUser && item.id !== 'account';
            const isActive = (item.id === 'studio' || item.id === 'scenes' || item.id === 'write' || item.id === 'upload') 
              ? activeTab === 'studio' 
              : activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold group
                  ${isActive ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'}
                  ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                <span className={isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900'}>{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {isLocked && <span className="text-[10px]">🔒</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-zinc-100 space-y-6">
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">✨ Core Features</h3>
            <ul className="text-[10px] text-zinc-500 space-y-1.5 font-medium">
              <li className="flex items-center gap-2"><span>🧠</span> AI Scripting</li>
              <li className="flex items-center gap-2"><span>🖼️</span> Consistent Scenes</li>
              <li className="flex items-center gap-2"><span>📖</span> Pro Layouts</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all border
                ${isMuted ? 'bg-zinc-100 text-zinc-400 border-zinc-200' : 'bg-zinc-900 text-white border-zinc-900 shadow-sm'}
              `}
            >
              {isMuted ? '🔇 Muted' : '🔊 Sound On'}
            </button>
            {firebaseUser && (
              <button onClick={handleLogout} className="w-full py-2 px-4 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all border border-transparent">
                Sign Out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        {!firebaseUser ? (
          <div className="max-w-4xl mx-auto min-h-[70vh] flex flex-col items-center justify-center">
             <div className="text-center mb-12 max-w-lg space-y-6">
                <div className="w-20 h-20 bg-zinc-900 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl comic-font text-zinc-900">IDENTIFICATION REQUIRED</h2>
                  <p className="text-sm text-zinc-500 font-medium">
                    Establish your connection to the Scriptorium. This creative tool arranging stories in professional layouts requires a secure link to persist your visual narratives.
                  </p>
                </div>
             </div>
             <AccountSection account={account} onAccountUpdate={setAccount} onLoadComic={handleLoadSavedComic} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm animate-in slide-in-from-top-4">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
                <button onClick={() => setError(null)} className="ml-auto hover:bg-red-100 p-1 rounded-lg">✕</button>
              </div>
            )}

            {activeTab === 'studio' && (
              <div className="space-y-12">
                <section className="bg-white border border-zinc-200 p-10 rounded-[40px] shadow-sm space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-12">
                    <div className="space-y-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Visual Language</label>
                          <div className="flex flex-wrap gap-2">
                            {ART_STYLES.map(s => (
                              <button
                                key={s.id}
                                onClick={() => { soundService.playClick(); setSelectedStyle(s.id); }}
                                className={`px-4 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all ${selectedStyle === s.id ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl scale-105' : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-300'}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Sequence Length</label>
                          <div className="flex items-center gap-6 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                            <input type="range" min="2" max="8" step="1" value={panelCount} onChange={(e) => setPanelCount(parseInt(e.target.value))} className="flex-1 accent-zinc-900" />
                            <span className="text-3xl font-black comic-font text-zinc-900 w-8 text-center">{panelCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Narrative Premise</label>
                        <textarea
                          ref={storyInputRef}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="What story shall we tell today? Describe a concept or a scene..."
                          className="w-full h-40 p-6 bg-zinc-50 border border-zinc-100 rounded-3xl focus:border-zinc-900 focus:bg-white outline-none transition-all resize-none font-medium text-sm text-zinc-800 shadow-inner"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Reference Frame</label>
                      <div className="w-full aspect-square border border-zinc-100 border-dashed rounded-[40px] bg-zinc-50 flex items-center justify-center relative group overflow-hidden shadow-inner">
                        {isCameraOpen ? (
                          <div className="absolute inset-0 bg-black flex flex-col">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale" />
                            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3 p-4">
                              <Button onClick={capturePhoto} className="flex-1 rounded-xl">Snap</Button>
                              <Button onClick={stopCamera} variant="danger" className="px-5 rounded-xl">✕</Button>
                            </div>
                          </div>
                        ) : referenceImage ? (
                          <div className="relative w-full h-full">
                            <img src={referenceImage} className="w-full h-full object-cover grayscale opacity-50 transition-all duration-700 group-hover:opacity-80 group-hover:scale-105" alt="reference" />
                            <button onClick={() => setReferenceImage(null)} className="absolute top-4 right-4 bg-zinc-900 text-white p-2 rounded-xl text-[10px] font-bold shadow-2xl">REMOVE</button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 text-center">
                            <p className="text-[10px] font-bold text-zinc-300 uppercase px-4 leading-relaxed">Visual context speeds up scene generation.</p>
                            <div className="flex flex-col gap-2 px-6">
                              <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 rounded-2xl bg-white border border-zinc-200 text-[10px] font-black uppercase hover:shadow-lg transition-all">Upload</button>
                              <button onClick={startCamera} className="px-6 py-3 rounded-2xl bg-white border border-zinc-200 text-[10px] font-black uppercase hover:shadow-lg transition-all">Capture</button>
                            </div>
                          </div>
                        )}
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 flex flex-col items-center gap-6">
                    <Button onClick={createComic} isLoading={isLoading} className="w-full md:w-auto px-24 py-6 rounded-[24px] shadow-2xl hover:scale-[1.02] text-xs">
                      Render Graphic Novel
                    </Button>
                    {statusMessage && <p className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse text-zinc-400 italic">{statusMessage}</p>}
                  </div>
                </section>

                {comic && (
                  <section className="space-y-16 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="text-center space-y-2">
                      <h2 className="text-4xl lg:text-6xl comic-font italic border-b-4 border-zinc-900 inline-block px-12 py-4">{comic.title}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-12 bg-white border border-zinc-200 rounded-[64px] shadow-2xl">
                      {comic.panels.map((p, i) => <PanelComponent key={p.id} panel={p} index={i} onZoom={setZoomedPanelIndex} />)}
                    </div>
                    
                    {isVideoLoading ? (
                      <div className="bg-zinc-900 text-white p-20 rounded-[64px] text-center space-y-8 shadow-2xl animate-pulse">
                         <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto opacity-20"></div>
                         <div className="space-y-3">
                           <h3 className="text-2xl font-bold uppercase tracking-[0.3em]">{VIDEO_MESSAGES[videoStatusIndex]}</h3>
                           <p className="text-[10px] opacity-40 font-black uppercase tracking-widest italic">Generating motion comic via Veo 3.1...</p>
                         </div>
                      </div>
                    ) : videoUrl ? (
                      <div className="bg-black p-6 rounded-[64px] border-8 border-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <video src={videoUrl} controls autoPlay loop className="w-full h-auto aspect-video rounded-[32px]" />
                        <div className="mt-8 flex justify-between items-center px-6 pb-4">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em]">Cinematic Export v1.0</span>
                          <Button variant="secondary" onClick={() => setVideoUrl(null)} className="rounded-xl px-8">Exit Theater</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-4 no-print">
                        <Button variant="accent" onClick={handleCreateVideo} className="px-12 rounded-2xl h-16">Animate Motion Comic</Button>
                        <Button variant="secondary" onClick={() => setZoomedPanelIndex(0)} className="px-12 rounded-2xl h-16">Enter Reader Mode</Button>
                        <Button onClick={() => { soundService.playSuccess(); authService.saveComicToAccount(comic); setStatusMessage("Saved to Cloud!"); setTimeout(()=>setStatusMessage(""), 2000); }} className="px-12 rounded-2xl h-16">Sync to Cloud</Button>
                        <Button variant="danger" onClick={() => { soundService.playClick(); setComic(null); }} className="px-12 rounded-2xl h-16">Reset Workspace</Button>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}

            {activeTab === 'lab' && (
              <div className="space-y-12 animate-in fade-in duration-700">
                <div className="bg-zinc-900 p-16 rounded-[64px] shadow-2xl text-center space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-4xl comic-font text-white italic tracking-tighter">THE ROGUE GALLERY</h2>
                    <p className="text-xs text-zinc-500 max-w-lg mx-auto leading-relaxed font-medium uppercase tracking-tight">
                      Intelligence profiling for narrative antagonists. Describe a theme or psychological driver to spawn a complex personality.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                    <input 
                      value={prompt} 
                      onChange={e => setPrompt(e.target.value)} 
                      placeholder="Psychological Trait or Theme..." 
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl text-white p-6 text-sm font-bold outline-none focus:border-white transition-all shadow-inner" 
                    />
                    <Button onClick={spawnVillain} isLoading={isVillainLoading} variant="accent" className="rounded-2xl px-12 h-16">EXECUTE PROFILE</Button>
                  </div>
                </div>
                {villain && (
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="bg-white border border-zinc-200 p-12 rounded-[56px] shadow-sm space-y-10">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-300 border-b border-zinc-50 pb-4">Classification Brief</h3>
                      <div className="space-y-10">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black opacity-20 uppercase block">Codename</span> 
                          <span className="text-5xl font-black comic-font tracking-tighter text-zinc-900">{villain.alias}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black opacity-20 uppercase block">Psychological Driver</span> 
                          <span className="typewriter-font italic text-sm leading-relaxed text-zinc-600 block px-4 border-l-2 border-zinc-100 italic">"{villain.motivation}"</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black opacity-20 uppercase block">Operational Skills</span> 
                          <span className="font-bold text-sm uppercase text-indigo-500 tracking-tight">{villain.powers}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-zinc-100 border border-zinc-200 p-12 rounded-[56px] flex flex-col justify-between shadow-inner">
                      <div className="space-y-10">
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Visual Spec</h3>
                          <p className="typewriter-font text-xs leading-relaxed text-zinc-500 italic opacity-80">"{villain.appearance}"</p>
                        </div>
                        <div className="h-48 bg-zinc-200/50 rounded-[32px] border-2 border-dashed border-zinc-300 flex items-center justify-center italic text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-center px-10">
                          Neural imagery pending narrative integration
                        </div>
                      </div>
                      <Button className="mt-12 rounded-2xl py-5 shadow-xl" onClick={() => { setPrompt(`A cinematic sequence involving ${villain.alias}, who is driven by ${villain.motivation}...`); setActiveTab('studio'); }}>Import to Studio</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'account' && (
              <AccountSection account={account} onAccountUpdate={setAccount} onLoadComic={handleLoadSavedComic} />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
