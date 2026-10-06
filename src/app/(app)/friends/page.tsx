"use client";

import { Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { Feed } from "@/components/feed";
import { LiquidSegmented } from "@/components/ui/liquid-segmented";
import { FORWARD, PageTransition } from "@/components/page-transition";
import { PEOPLE } from "@/lib/demo-people";
import { addFriend, useChats, useFriendIds } from "@/lib/social";

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
};

export default function FriendsPage() {
  const [tab, setTab] = useState("feed");
  const [query, setQuery] = useState("");
  const friendIds = useFriendIds();
  const chats = useChats();

  const q = query.trim().toLowerCase();
  const matches = (name: string, handle: string) =>
    !q || name.toLowerCase().includes(q) || handle.toLowerCase().includes(q);

  const friends = PEOPLE.filter(
    (p) => friendIds.includes(p.id) && matches(p.name, p.handle),
  ).sort((a, b) => {
    const last = (id: string) => chats[id]?.at(-1)?.sentAt ?? "";
    return last(b.id).localeCompare(last(a.id));
  });
  const others = PEOPLE.filter(
    (p) => !friendIds.includes(p.id) && matches(p.name, p.handle),
  );

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-md px-6 pt-[max(env(safe-area-inset-top),1rem)]">
        <h1 className="pt-6 t-title">
          Friends
        </h1>

        <LiquidSegmented
          label="Show"
          className="mt-5 w-full"
          value={tab}
          onValueChange={setTab}
          options={[
            { value: "feed", label: "Feed" },
            { value: "chats", label: "Chats" },
          ]}
        />

        {tab === "feed" ? (
          <div key="feed" className="mt-6 pb-6 animate-in fade-in">
            <Feed />
          </div>
        ) : (
        <div key="chats" className="animate-in fade-in">
        <label className="relative mt-5 block">
          <span className="sr-only">Search people</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-[1.125rem] -translate-y-1/2 text-haze"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username"
            className="h-12 w-full rounded-full border border-dusk-edge bg-dusk pr-4 pl-11 text-[1.0625rem] text-ink outline-none placeholder:text-haze/70 focus:border-gold"
          />
        </label>

        <section aria-labelledby="chats-heading" className="mt-6">
          <h2 id="chats-heading" className="sr-only">
            Your friends
          </h2>
          {friends.length === 0 && (
            <p className="py-6 text-haze">
              {q ? "None of your friends match that." : "No friends yet. Find people below."}
            </p>
          )}
          <ul>
            {friends.map((person) => {
              const last = chats[person.id]?.at(-1);
              return (
                <li key={person.id}>
                  <Link
                    href={`/friends/${person.id}`}
                    transitionTypes={FORWARD}
                    className="-mx-3 flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-dusk active:bg-dusk"
                  >
                    <Avatar name={person.name} colors={person.colors} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold">{person.name}</span>
                        {last && (
                          <span className="shrink-0 text-[0.8125rem] text-haze">
                            {timeAgo(last.sentAt)}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[0.9375rem] text-haze">
                        {last
                          ? `${last.from === "me" ? "You: " : ""}${last.text}`
                          : `Say hi to ${person.name.split(" ")[0]}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {others.length > 0 && (
          <section aria-labelledby="people-heading" className="mt-8">
            <h2
              id="people-heading"
              className="t-section"
            >
              People you may know
            </h2>
            <ul className="mt-2">
              {others.map((person) => (
                <li key={person.id} className="flex items-center gap-3 py-3">
                  <Avatar name={person.name} colors={person.colors} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{person.name}</span>
                    <span className="block truncate text-[0.9375rem] text-haze">
                      @{person.handle} · saved {person.spot.name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => addFriend(person.id)}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[0.9375rem] font-semibold text-night active:scale-95"
                  >
                    <UserPlus className="size-4" aria-hidden /> Add
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        </div>
        )}
      </main>
    </PageTransition>
  );
}
