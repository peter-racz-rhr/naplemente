"use client";

import { ArrowUp, ChevronLeft, MapPin } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/avatar";
import { PageTransition } from "@/components/page-transition";
import { personById } from "@/lib/demo-people";
import { sendMessage, useChats } from "@/lib/social";
import { cn } from "@/lib/utils";
import { LOCALE } from "@/lib/locale";

const clock = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit" });

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const person = personById(id);
  const chats = useChats();
  const messages = chats[id] ?? [];
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const cancelReply = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => cancelReply.current?.(), []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typing]);

  if (!person) notFound();

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    cancelReply.current?.();
    cancelReply.current = sendMessage(person.id, text, setTyping);
  };

  return (
    <PageTransition>
      <main className="mx-auto flex h-dvh w-full max-w-md flex-col">
        <header className="flex items-center gap-3 border-b border-dusk-edge px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="grid size-11 place-items-center rounded-full hover:bg-dusk"
          >
            <ChevronLeft className="size-6" />
          </button>
          <Avatar name={person.name} colors={person.colors} className="size-10 text-sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{person.name}</p>
            <p className="truncate text-[0.8125rem] text-haze">
              {typing ? "typing…" : `@${person.handle}`}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mx-auto mb-6 flex w-fit items-center gap-1.5 rounded-full bg-dusk px-3 py-1.5 text-[0.8125rem] text-haze">
            <MapPin className="size-3.5" aria-hidden /> {person.name.split(" ")[0]} saved{" "}
            {person.spot.name}
          </p>
          {messages.length === 0 && (
            <p className="mt-10 text-center text-haze">
              Say hi to {person.name.split(" ")[0]}. Ask where they&apos;re watching
              tonight&apos;s sunset.
            </p>
          )}
          <ol className="flex flex-col gap-2">
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "max-w-[78%] rounded-[1.25rem] px-4 py-2.5 text-[1rem] leading-snug animate-in fade-in slide-in-from-bottom-1",
                  message.from === "me"
                    ? "self-end rounded-br-md bg-ink text-night"
                    : "self-start rounded-bl-md bg-dusk text-ink",
                )}
              >
                {message.text}
                <span
                  className={cn(
                    "mt-1 block text-right text-[0.6875rem]",
                    message.from === "me" ? "text-night/55" : "text-haze",
                  )}
                >
                  {clock.format(new Date(message.sentAt))}
                </span>
              </li>
            ))}
            {typing && (
              <li
                aria-label={`${person.name} is typing`}
                className="flex gap-1 self-start rounded-[1.25rem] rounded-bl-md bg-dusk px-4 py-3.5"
              >
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="size-2 animate-bounce rounded-full bg-haze"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </li>
            )}
          </ol>
          <div ref={endRef} />
        </div>

        <form
          onSubmit={send}
          className="flex items-end gap-2 border-t border-dusk-edge px-3 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
        >
          <label className="sr-only" htmlFor="message">
            Message
          </label>
          <input
            id="message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${person.name.split(" ")[0]}`}
            autoComplete="off"
            className="h-12 flex-1 rounded-full border border-dusk-edge bg-dusk px-4 text-[1.0625rem] text-ink outline-none placeholder:text-haze/70 focus:border-gold"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim()}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-night transition-transform active:scale-95 disabled:opacity-40"
          >
            <ArrowUp className="size-5" />
          </button>
        </form>
      </main>
    </PageTransition>
  );
}
