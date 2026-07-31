export interface CharacterSummary {
  id: string;
  key: string;
  name: string;
  age: number;
  occupation: string;
  tagline: string;
  keywords: string[];
  avatarUrl: string;
}

export type MessageRole = "USER" | "ASSISTANT";
export type MessageType = "TEXT" | "IMAGE" | "AUDIO";

export interface MessageDTO {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string | null;
  mediaUrl: string | null;
  audioUrl: string | null;
  createdAt: string;
}

export interface AccessStatus {
  canChat: boolean;
  hasActiveSubscription: boolean;
  trialDaysLeft: number | null;
  trialExpired: boolean;
  planExpiresAt: string | null;
}

export interface GuestMessage {
  role: "user" | "assistant";
  type: MessageType;
  content: string;
  mediaUrl?: string;
  audioUrl?: string;
}
