export interface Community {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  channels: string[];
}

export interface CodingChallenge {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  description: string;
}

export interface MessageItem {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}
