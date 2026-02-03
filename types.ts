
export interface ComicPanel {
  id: string;
  imagePrompt: string;
  caption: string;
  imageUrl?: string;
  isGenerating?: boolean;
}

export interface ComicStory {
  title: string;
  panels: ComicPanel[];
  createdAt?: number;
}

export interface CharacterDescription {
  name: string;
  visualTraits: string;
}

export interface VillainProfile {
  name: string;
  alias: string;
  powers: string;
  motivation: string;
  appearance: string;
}

export interface UserProfile {
  username: string;
  avatar: string;
  rank: string;
  joinDate: number;
  comicsCount: number;
}

export interface UserAccount {
  profile: UserProfile;
  savedComics: ComicStory[];
}
