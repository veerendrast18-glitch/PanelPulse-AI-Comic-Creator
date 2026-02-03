
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './components/Button';
import { ComicPanel as PanelComponent } from './components/ComicPanel';
import { AccountSection } from './components/AccountSection';
import { ZoomModal } from './components/ZoomModal';
import { generateStoryScript, generatePanelImage, describeImage, generateVillainProfile, generateComicVideo } from './services/geminiService';
import { soundService } from './services/soundService';
import { authService } from './services/authService';
import { ComicStory, VillainProfile, UserAccount, ComicPanel } from './types';

const ART_STYLES = [
  { id: 'classic', label: 'Novel', icon: '📓' },
  { id: 'manga', label: 'Seinen', icon: '🌑' },
  { id: 'noir', label: 'Noir', icon: '🚬' },
  { id: 'realistic', label: 'Painted', icon: '🎨' },
  { id: 'retro', label: 'Zine', icon: '📠' },
];

const VIDEO_MESSAGES = [
  "Assembling cinematic sequence...",
  "Applying atmospheric lighting...",
  "Rendering frame transitions...",
  "Encoding narrative flow...",
  "Finalizing visual continuity..."
];

const LOCAL_STORAGE_KEY = 'panel-pulse-archive';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'lab' | 'account'>('studio');
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
  const [hasSavedContent, setHasSavedContent] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [account, setAccount] = useState<UserAccount | null>(authService.getAccount());
  const [zoomedPanelIndex, setZoomedPanelIndex] = useState<number | null>(null);
  
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatusIndex, setVideoStatusIndex] = useState(0);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    setHasSavedContent(!!saved);
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

  const handleTabChange = (tab: 'studio' | 'lab' | 'account') => {
    soundService.playClick();
    setActiveTab(tab);
    setError(null);
  };

  // Handles loading a comic from the account archive
  const handleLoadSavedComic = (savedComic: ComicStory) => {
    soundService.playClick();
    setComic(savedComic);
    setVideoUrl(null);
    setActiveTab('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      soundService.playPop();
      const reader = new FileReader();
      reader.onloadend = () => setReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    soundService.playClick();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOpen(true);
      setError(null);
    } catch (err) {
      setError("CAMERA ACCESS DENIED.");
    }
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

  const handleSaveToAccount = () => {
    if (!comic) return;
    soundService.playSuccess();
    if (!account) {
      setActiveTab('account');
      setError("ACCOUNT REQUIRED TO ARCHIVE.");
      return;
    }
    const updated = authService.saveComicToAccount(comic);
    setAccount(updated);
    setStatusMessage('ARCHIVED TO COLLECTION.');
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const saveToLocal = () => {
    if (!comic) return;
    soundService.playPop();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ comic, selectedStyle, prompt, panelCount }));
    setHasSavedContent(true);
    setStatusMessage('DRAFT STORED.');
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const loadFromLocal = () => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setComic(data.comic);
        setSelectedStyle(data.selectedStyle);
        setPrompt(data.prompt);
        setPanelCount(data.panelCount || 4);
        setActiveTab('studio');
      } catch (e) { setError("ARCHIVE CORRUPTED."); }
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
    } catch (e) { setError("SYSTEM STALL. RETRY."); }
    finally { setIsLoading(false); setStatusMessage(''); }
  };

  // Handles cinematic video generation for the current comic sequence
  const handleCreateVideo = async () => {
    if (!comic) return;
    
    // API Key selection is mandatory for Veo video generation models
    try {
      // @ts-ignore - Assuming window.aistudio is available in the environment
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Proceeding immediately to mitigate race conditions as per guidelines
      }
    } catch (e) {
      console.error("API Key selection failed", e);
    }

    setIsVideoLoading(true);
    setVideoStatusIndex(0);
    setError(null);
    try {
      const url = await generateComicVideo(comic, selectedStyle);
      setVideoUrl(url);
      soundService.playSuccess();
    } catch (e: any) {
      // Handle missing entity errors by re-prompting for API key
      if (e?.message?.includes("Requested entity was not found")) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setError("API KEY RE-SELECTION REQUIRED. PLEASE USE A PAID PROJECT KEY.");
      } else {
        setError("VIDEO SYNTHESIS FAILED. CHECK YOUR CONNECTION.");
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
    } catch (e) { setError("PROFILE GENERATION FAILED."); }
    finally { setIsVillainLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-12 halftone min-h-screen">
      {zoomedPanelIndex !== null && comic && (
        <ZoomModal panels={comic.panels} currentIndex={zoomedPanelIndex} onNavigate={setZoomedPanelIndex} onClose={() => setZoomedPanelIndex(null)} />
      )}

      {/* Global Controls */}
      <div className="fixed top-6 right-6 z-50 flex gap-4 no-print">
        <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-zinc-900 text-white border border-zinc-700 shadow-md">
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      <header className="space-y-6 text-center">
        <h1 className="text-4xl md:text-6xl comic-font tracking-tighter text-zinc-900 drop-shadow-sm border-b-2 border-zinc-900 inline-block px-4">
          PANEL PULSE
        </h1>
        <nav className="flex justify-center gap-1 font-bold text-xs uppercase tracking-widest">
          {['studio', 'lab', 'account'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab as any)}
              className={`px-5 py-2 transition-all ${activeTab === tab ? 'bg-zinc-900 text-white' : 'bg-transparent text-zinc-500 hover:text-zinc-900'}`}
            >
              {tab === 'studio' ? 'Scriptorium' : tab === 'lab' ? 'Rogue Gallery' : 'The Collective'}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <div className="bg-red-900 text-white p-4 border-l-4 border-red-500 shadow-lg animate-in slide-in-from-top-2">
          <p className="text-xs font-bold uppercase tracking-widest">ERROR: {error}</p>
        </div>
      )}

      {activeTab === 'studio' && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <section className="bg-white border-2 border-zinc-900 p-8 shadow-[8px_8px_0px_zinc-900]">
            <div className="grid md:grid-cols-[1fr_200px] gap-8">
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest opacity-60">Visual Language</label>
                    <div className="flex flex-wrap gap-2">
                      {ART_STYLES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { soundService.playClick(); setSelectedStyle(s.id); }}
                          className={`px-3 py-1.5 border-2 text-[10px] font-bold uppercase tracking-tighter transition-all ${selectedStyle === s.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900'}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest opacity-60">Sequence Length</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="2" max="8" step="1" value={panelCount} onChange={(e) => setPanelCount(parseInt(e.target.value))} className="flex-1 accent-zinc-900" />
                      <span className="text-xl font-black typewriter-font">{panelCount}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest opacity-60">Narrative Premise</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the sequence premise..."
                    className="w-full h-32 p-5 bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-900 outline-none transition-all resize-none typewriter-font text-sm"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Reference</label>
                <div className="w-full aspect-square border-2 border-zinc-200 border-dashed bg-zinc-50 flex items-center justify-center relative group">
                  {isCameraOpen ? (
                    <div className="absolute inset-0 bg-black flex flex-col">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale" />
                      <div className="absolute bottom-2 inset-x-0 flex justify-center gap-2">
                        <button onClick={capturePhoto} className="bg-white text-zinc-900 px-3 py-1 text-[10px] font-bold uppercase border border-zinc-900">Snap</button>
                        <button onClick={stopCamera} className="bg-red-900 text-white px-3 py-1 text-[10px] font-bold uppercase">X</button>
                      </div>
                    </div>
                  ) : referenceImage ? (
                    <div className="relative w-full h-full">
                      <img src={referenceImage} className="w-full h-full object-cover grayscale opacity-50" alt="reference" />
                      <button onClick={() => setReferenceImage(null)} className="absolute top-2 right-2 bg-zinc-900 text-white p-1 text-[10px]">REMOVE</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">Upload</button>
                      <button onClick={startCamera} className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">Capture</button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Button onClick={createComic} isLoading={isLoading} className="w-full md:w-auto px-16 py-4 text-sm">
                Render Sequence
              </Button>
              {statusMessage && <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse opacity-60">{statusMessage}</p>}
            </div>
          </section>

          {comic && (
            <section className="space-y-12 pb-20 mt-16 animate-in fade-in slide-in-from-bottom-6">
              <div className="text-center">
                <h2 className="text-3xl md:text-5xl comic-font italic border-b-2 border-zinc-900 inline-block px-8 py-2">{comic.title}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-10 bg-white border-2 border-zinc-900 shadow-[12px_12px_0px_zinc-900]">
                {comic.panels.map((p, i) => <PanelComponent key={p.id} panel={p} index={i} onZoom={setZoomedPanelIndex} />)}
              </div>
              
              {/* Video Generation Section */}
              {isVideoLoading ? (
                <div className="bg-zinc-900 text-white p-12 text-center space-y-6 border-4 border-zinc-800 shadow-2xl animate-pulse">
                   <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                   <h3 className="text-xl font-bold uppercase tracking-[0.2em]">{VIDEO_MESSAGES[videoStatusIndex]}</h3>
                   <p className="text-xs opacity-50 font-black uppercase tracking-widest italic">Our neural networks are weaving your narrative into motion...</p>
                </div>
              ) : videoUrl ? (
                <div className="bg-black p-4 border-8 border-zinc-900 shadow-2xl">
                  <video src={videoUrl} controls autoPlay loop className="w-full h-auto aspect-video" />
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Motion Comic Master</span>
                    <Button variant="secondary" onClick={() => setVideoUrl(null)}>Discard Reel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-4 no-print">
                  <Button variant="accent" onClick={handleCreateVideo} className="px-8">Generate Motion Comic</Button>
                  <Button variant="secondary" onClick={() => setZoomedPanelIndex(0)}>Read Sequence</Button>
                  <Button onClick={handleSaveToAccount}>Archive to Collection</Button>
                  <Button variant="secondary" onClick={saveToLocal}>Store Draft</Button>
                  <Button variant="danger" onClick={() => setComic(null)}>Clear View</Button>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {activeTab === 'lab' && (
        <section className="space-y-10 animate-in fade-in duration-500">
          <div className="bg-zinc-900 p-10 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] border border-zinc-800">
            <h2 className="text-2xl md:text-3xl comic-font text-white text-center mb-8 italic">Profiling the Rogue Gallery</h2>
            <div className="flex gap-4 max-w-2xl mx-auto">
              <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Theme or psychological trait..." className="flex-1 bg-zinc-800 border border-zinc-700 text-white p-4 text-xs font-bold outline-none" />
              <Button onClick={spawnVillain} isLoading={isVillainLoading} variant="secondary">Analyze</Button>
            </div>
          </div>
          {villain && (
            <div className="grid md:grid-cols-2 gap-10">
              <div className="bg-white border-2 border-zinc-900 p-8 shadow-[6px_6px_0px_zinc-900]">
                <h3 className="text-xl font-black uppercase mb-6 border-b border-zinc-200">Intelligence Report</h3>
                <div className="space-y-6 text-sm">
                  <p><span className="text-[10px] font-black opacity-40 uppercase block">Codename</span> <span className="text-2xl font-black comic-font">{villain.alias}</span></p>
                  <p><span className="text-[10px] font-black opacity-40 uppercase block">Psych Profile</span> <span className="typewriter-font italic">"{villain.motivation}"</span></p>
                  <p><span className="text-[10px] font-black opacity-40 uppercase block">Operational Skills</span> <span className="font-bold">{villain.powers}</span></p>
                </div>
              </div>
              <div className="bg-zinc-100 border-2 border-zinc-900 p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase mb-6 opacity-40">Visual Spec</h3>
                  <p className="typewriter-font text-xs leading-relaxed opacity-70">"{villain.appearance}"</p>
                </div>
                <Button className="mt-8" onClick={() => { setPrompt(`A cinematic sequence involving the mysterious ${villain.alias}...`); setActiveTab('studio'); }}>Transfer to script</Button>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'account' && <AccountSection account={account} onAccountUpdate={setAccount} onLoadComic={handleLoadSavedComic} />}
    </div>
  );
};

export default App;
