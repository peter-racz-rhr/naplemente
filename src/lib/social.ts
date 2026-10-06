"use client";

import { PEOPLE, STARTING_FRIENDS, personById } from "./demo-people";
import { createLocalStore } from "./local-store";

export type Message = {
  id: string;
  from: "me" | "them";
  text: string;
  sentAt: string;
};

const friendsStore = createLocalStore<string[]>(
  "naplemente:friends",
  STARTING_FRIENDS,
);
export const useFriendIds = friendsStore.useValue;
export const addFriend = (id: string) =>
  friendsStore.set((ids) => (ids.includes(id) ? ids : [...ids, id]));

// Seed each starting friend's opener so the chat list isn't empty.
const seededChats: Record<string, Message[]> = Object.fromEntries(
  PEOPLE.filter((p) => p.opener).map((p) => [
    p.id,
    [
      {
        id: `${p.id}-opener`,
        from: "them" as const,
        text: p.opener!,
        sentAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
      },
    ],
  ]),
);

const chatStore = createLocalStore<Record<string, Message[]>>(
  "naplemente:chats",
  seededChats,
);
export const useChats = chatStore.useValue;

const appendMessage = (personId: string, message: Message) =>
  chatStore.set((chats) => ({
    ...chats,
    [personId]: [...(chats[personId] ?? []), message],
  }));

/**
 * Sends your message, then the demo friend answers with their next canned
 * reply. Returns a cancel function for the pending reply.
 */
export function sendMessage(
  personId: string,
  text: string,
  onTyping: (typing: boolean) => void,
) {
  appendMessage(personId, {
    id: crypto.randomUUID(),
    from: "me",
    text,
    sentAt: new Date().toISOString(),
  });

  const person = personById(personId);
  if (!person) return () => {};

  const theirCount = (chatStore.get()[personId] ?? []).filter(
    (m) => m.from === "them" && !m.id.endsWith("-opener"),
  ).length;
  const reply = person.replies[theirCount % person.replies.length];

  const startTyping = window.setTimeout(() => onTyping(true), 700);
  const answer = window.setTimeout(() => {
    onTyping(false);
    appendMessage(personId, {
      id: crypto.randomUUID(),
      from: "them",
      text: reply,
      sentAt: new Date().toISOString(),
    });
  }, 2200);

  return () => {
    window.clearTimeout(startTyping);
    window.clearTimeout(answer);
    onTyping(false);
  };
}
