
import React, { useState } from 'react';
import { UserAccount, ComicStory } from '../types';
import { Button } from './Button';
import { authService } from '../services/authService';
import { soundService } from '../services/soundService';

interface AccountSectionProps {
  account: UserAccount | null;
  onAccountUpdate: (acc: UserAccount | null) => void;
  onLoadComic: (comic: ComicStory) => void;
}

const AVATARS = ['⬛', '⚪', '👤', '👁️', '🛰️', '📁', '🖋️'];

export const AccountSection: React.FC<AccountSectionProps> = ({ account, onAccountUpdate, onLoadComic }) => {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    soundService.playSuccess();
    onAccountUpdate(authService.createAccount(username, selectedAvatar));
  };

  if (!account) {
    return (
      <div className="max-w-md mx-auto bg-white border-2 border-zinc-900 p-10 shadow-[10px_10px_0px_zinc-900] animate-in fade-in zoom-in-95">
        <h2 className="text-2xl font-black uppercase tracking-widest text-center mb-8 border-b border-zinc-100 pb-2">Initialize Profile</h2>
        <form onSubmit={handleCreate} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Identifier</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Designation..."
              className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 focus:border-zinc-900 font-bold outline-none"
              maxLength={15}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Sigil</label>
            <div className="grid grid-cols-7 gap-1">
              {AVATARS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setSelectedAvatar(a)}
                  className={`p-2 border transition-all text-xs ${selectedAvatar === a ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-900'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full py-4">Register Account</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="bg-white border-2 border-zinc-900 p-8 shadow-[8px_8px_0px_zinc-900] flex flex-col md:flex-row items-center gap-8">
        <div className="text-4xl bg-zinc-900 text-white w-20 h-20 flex items-center justify-center border-2 border-zinc-900 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
          {account.profile.avatar}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter">{account.profile.username}</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <span className="text-[10px] font-black uppercase border-b border-zinc-900 italic">{account.profile.rank}</span>
            <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Active since: {new Date(account.profile.joinDate).getFullYear()}</span>
          </div>
        </div>
        <div className="bg-zinc-900 text-white p-6 text-center min-w-[140px]">
          <div className="text-4xl font-black">{account.profile.comicsCount}</div>
          <div className="text-[8px] font-black uppercase tracking-[0.2em]">Archived Files</div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black uppercase border-b-2 border-zinc-900 inline-block px-2">Archived Narratives</h3>
        {account.savedComics.length === 0 ? (
          <div className="bg-zinc-50 border-2 border-zinc-200 border-dashed p-16 text-center">
            <p className="text-sm font-black opacity-20 uppercase tracking-widest italic">The archive is currently empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {account.savedComics.map((comic) => (
              <div key={comic.createdAt} className="bg-white border border-zinc-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden">
                <div className="aspect-[16/10] bg-zinc-900 relative">
                  {comic.panels[0]?.imageUrl && <img src={comic.panels[0].imageUrl} className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" alt="" />}
                  <div className="absolute inset-0 bg-zinc-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" onClick={() => onLoadComic(comic)}>Inspect File</Button>
                  </div>
                </div>
                <div className="p-5 border-t border-zinc-100">
                  <h4 className="font-black text-sm uppercase truncate mb-1 tracking-tight">{comic.title}</h4>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{new Date(comic.createdAt!).toLocaleDateString()} • {comic.panels.length} SEGMENTS</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
