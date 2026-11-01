"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LOCAL_PREFIX,
  readLocalDraft,
  localKey,
  type LocalDraft,
} from "@/lib/cash/local-draft";
export function LocalDrafts({ userId }: { userId: string }) {
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  useEffect(() => {
    try {
      setDrafts(
        Object.keys(localStorage)
          .filter((key) => key.startsWith(`${LOCAL_PREFIX}${userId}:`))
          .map((key) => readLocalDraft(localStorage.getItem(key), userId))
          .filter((item): item is LocalDraft => Boolean(item)),
      );
    } catch {
      /* Browser storage may be disabled. */
    }
  }, [userId]);
  if (!drafts.length) return null;
  return (
    <section className="notice">
      <strong>Niet centraal opgeslagen invoer op dit apparaat</strong>
      {drafts.map((item) => (
        <div key={item.id}>
          <p>
            <Link
              className="text-link"
              href={`/kassa-afslag/nieuw?herstel=${item.id}`}
            >
              Invoer van {item.draft.workDate} herstellen →
            </Link>
            <small> · {new Date(item.savedAt).toLocaleString("nl-NL")}</small>
          </p>
          <button
            className="button subtle small"
            onClick={() => {
              if (
                window.confirm(
                  "Deze lokale invoer verwijderen? Niet centraal opgeslagen wijzigingen gaan dan verloren.",
                )
              ) {
                localStorage.removeItem(localKey(userId, item.id));
                setDrafts((old) => old.filter((d) => d.id !== item.id));
              }
            }}
          >
            Lokale invoer verwijderen
          </button>
        </div>
      ))}
    </section>
  );
}
