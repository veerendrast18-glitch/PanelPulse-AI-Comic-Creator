
import React from 'react';
import { UserAccount, ComicStory } from '../types';
import { Button } from './Button';
import { authService } from '../services/authService';
import { soundService } from '../services/soundService';

interface AccountSectionProps {
  account: UserAccount | null;
  onAccountUpdate: (acc: UserAccount | null) => void;
  onLoadComic: (comic: ComicStory) => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({ account, onLoadComic }) => {
  const handleLogin = async () => {
    try {
      soundService.playClick();
      await authService.loginWithGoogle();
      soundService.playSuccess();
    } catch (error) {
      console.error("Login Failed", error);
    }
  };

  if (!account) {
    return (
      <div className="max-w-md w-full bg-white border border-zinc-100 p-12 rounded-[48px] shadow-2xl animate-in fade-in zoom-in-95 text-center space-y-10">
        <div className="space-y-2">
          <h2 className="text-3xl comic-font tracking-tight text-zinc-900">IDENTITY HUB</h2>
          <div className="h-1 w-12 bg-zinc-900 mx-auto rounded-full"></div>
        </div>
        
        <p className="text-sm font-medium text-zinc-400 leading-relaxed uppercase tracking-tight italic">
          Synchronize your narrative archives with the collective. Identification allows you to persist visual sequences and Rogue Gallery profiles.
        </p>

        <Button onClick={handleLogin} className="w-full py-6 rounded-2xl flex items-center justify-center gap-4 hover:scale-[1.03] transition-all shadow-xl bg-zinc-900 text-white">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sync with Google
        </Button>

        <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
          No secondary credentials required.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-700 w-full max-w-4xl mx-auto">
      <div className="bg-white border border-zinc-200 p-12 rounded-[56px] shadow-sm flex flex-col md:flex-row items-center gap-12">
        <div className="w-28 h-28 overflow-hidden rounded-[32px] border-4 border-zinc-900 shadow-2xl transition-transform hover:scale-105 duration-500">
          {account.profile.avatar.startsWith('http') ? (
            <img src={account.profile.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="text-5xl bg-zinc-900 text-white w-full h-full flex items-center justify-center font-black">
              {account.profile.avatar}
            </div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="space-y-1">
            <h2 className="text-5xl comic-font tracking-tighter text-zinc-900">{account.profile.username}</h2>
            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em]">Authorized Creator</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <span className="text-[10px] font-black uppercase border border-zinc-900 px-4 py-1.5 rounded-full italic bg-zinc-900 text-white shadow-lg">{account.profile.rank}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> 
              Established {new Date(account.profile.joinDate).getFullYear()}
            </span>
          </div>
        </div>
        <div className="bg-zinc-50 border border-zinc-100 p-10 rounded-[40px] text-center min-w-[180px] shadow-inner">
          <div className="text-6xl font-black text-zinc-900 tracking-tighter">{account.profile.comicsCount}</div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 mt-3">Archived Files</div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-4">
          <h3 className="text-2xl comic-font text-zinc-900 tracking-tight italic">COLLECTIVE ARCHIVE</h3>
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{account.savedComics.length} Entries</span>
        </div>
        
        {account.savedComics.length === 0 ? (
          <div className="bg-zinc-100/50 border-2 border-zinc-200 border-dashed p-24 rounded-[64px] text-center">
            <p className="text-sm font-black opacity-20 uppercase tracking-[0.3em] italic">Vault currently empty. Initiate your first narrative in the Studio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 pb-24">
            {account.savedComics.map((comic) => (
              <div key={comic.createdAt} className="bg-white border border-zinc-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all group overflow-hidden border-b-4 border-b-zinc-200 active:translate-y-0 active:shadow-md">
                <div className="aspect-[4/3] bg-zinc-900 relative">
                  {comic.panels[0]?.imageUrl && <img src={comic.panels[0].imageUrl} className="w-full h-full object-cover grayscale opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000" alt="" />}
                  <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                    <Button variant="secondary" onClick={() => onLoadComic(comic)} className="rounded-2xl px-8 h-12 text-[10px]">INSPECT FILE</Button>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-zinc-900/80 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full border border-white/20 uppercase tracking-widest">{comic.panels.length} Panels</span>
                  </div>
                </div>
                <div className="p-8 space-y-2">
                  <h4 className="font-black text-base uppercase truncate tracking-tight text-zinc-800">{comic.title}</h4>
                  <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                    SYNCED: {new Date(comic.createdAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
