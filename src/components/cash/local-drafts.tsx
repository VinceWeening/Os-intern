"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  tidyLocalDrafts,
  removeLocalDraft,
  type LocalDraft,
} from "@/lib/cash/local-draft";
export function LocalDrafts({ userId }: { userId: string }) {
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  useEffect(() => {
    try {
      const latest = tidyLocalDrafts(localStorage, userId);
      setDrafts(latest ? [latest] : []);
    } catch {
      /* Browser storage may be disabled. */
    }
  }, [userId]);
  if (!drafts.length) return null;
  return (
    <section className="notice">
      <strong>Laatste lokale herstelkopie op dit apparaat</strong>
      <p>
        Maximaal één herstelkopie per gebruiker. Een nieuwe telling vervangt de
        vorige lokale invoer. Niet opgeslagen invoer vervalt na 3 dagen. Bewaar
        een telling bewust met ‘Concept opslaan’.
      </p>
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
                removeLocalDraft(localStorage, userId, item.id);
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
