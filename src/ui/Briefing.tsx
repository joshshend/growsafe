// Printable sitter briefing (T6). The emergency card is added only when the toggle is on, and only to
// the printed page: it is read from this device and is never part of a link.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Printer } from "@phosphor-icons/react";
import { KNOW_STEP_ORDERS, buildBriefing, lines } from "../emergency/briefing";
import { cardIsEmpty, useEmergency, type Card } from "../emergency/store";
import { loadKb } from "../kb";
import { useStore } from "../store/store";
import { localHazard } from "./format";
import { useLang, useT, type TFn } from "./useT";
import "./emergency.css";

function List({ items }: { items: string[] }) {
  return (
    <ul className="briefing-list">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

function CardPrint({ t, name, card }: { t: TFn; name: string; card: Card | undefined }) {
  const empty = !card || cardIsEmpty(card);
  const contacts = (card?.contacts ?? []).filter((c) => c.name.trim() || c.phone.trim());
  return (
    <section className="briefing-block" aria-label={`${t("brief.card")}: ${name}`}>
      <h3 className="t-strong">
        {t("brief.card")}: {name}
      </h3>
      {empty || !card ? (
        <p>{t("brief.cardEmpty")}</p>
      ) : (
        <>
          {card.allergies.trim() && (
            <>
              <h4 className="t-small">{t("brief.allergies")}</h4>
              <List items={lines(card.allergies)} />
            </>
          )}
          {card.conditions.trim() && (
            <>
              <h4 className="t-small">{t("brief.conditions")}</h4>
              <List items={lines(card.conditions)} />
            </>
          )}
          {card.medicines.trim() && (
            <>
              <h4 className="t-small">{t("brief.medicines")}</h4>
              <List items={lines(card.medicines)} />
            </>
          )}
          {(card.pediatricianName.trim() || card.pediatricianPhone.trim()) && (
            <p>
              <strong>{t("brief.pediatrician")}:</strong>{" "}
              {[card.pediatricianName.trim(), card.pediatricianPhone.trim()]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          {contacts.length > 0 && (
            <>
              <h4 className="t-small">{t("brief.contacts")}</h4>
              <List
                items={contacts.map((c) =>
                  [c.name.trim(), c.phone.trim()].filter(Boolean).join(", "),
                )}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}

export function Briefing() {
  const t = useT();
  const lang = useLang();
  const { homeId = "" } = useParams();
  const home = useStore((s) => s.homes.find((h) => h.id === homeId));
  const children = useStore((s) => s.children);
  const tasks = useStore((s) => s.tasks);
  const cards = useEmergency((s) => s.cards);
  const hydrate = useEmergency((s) => s.hydrate);
  const [withCard, setWithCard] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const kb = useMemo(() => loadKb(), []);
  const b = useMemo(
    () => (home ? buildBriefing(kb, home, children, tasks, new Date()) : null),
    [kb, home, children, tasks],
  );

  if (!home || !b) {
    return (
      <div className="flow">
        <p role="alert">{t("brief.notFound")}</p>
        <Link className="btn btn-block" to="/people">
          {t("brief.back")}
        </Link>
      </div>
    );
  }

  const know = b.know
    ? localHazard(b.know, lang).steps.filter((_, i) =>
        KNOW_STEP_ORDERS.includes(
          [...b.know!.fix_steps].sort((x, y) => x.order - y.order)[i]?.order ?? -1,
        ),
      )
    : [];

  return (
    <article className="flow briefing">
      <h1 className="t-title">{t("brief.title", { home: b.homeName })}</h1>
      <div className="flow-s no-print">
        <p>{t("brief.intro")}</p>
        <button
          type="button"
          className="toggle-chip"
          aria-pressed={withCard}
          onClick={() => setWithCard((v) => !v)}
        >
          <span className="toggle-chip-mark" aria-hidden="true">
            {withCard && <Check size={14} weight="bold" />}
          </span>
          {t("brief.includeCard")}
        </button>
        {withCard && <p className="muted">{t("brief.cardNote")}</p>}
        <button type="button" className="btn btn-primary btn-block" onClick={() => window.print()}>
          <Printer size={22} weight="regular" aria-hidden="true" />
          {t("brief.print")}
        </button>
      </div>

      <section className="briefing-numbers" aria-labelledby="b-num">
        <h2 id="b-num" className="t-section">
          {t("brief.numbers")}
        </h2>
        <p>
          <a href="tel:+18002221222">{t("brief.poison")}</a>
        </p>
        <p>{t("brief.call911")}</p>
      </section>

      <section className="briefing-block" aria-labelledby="b-kids">
        <h2 id="b-kids" className="t-section">
          {t("brief.children")}
        </h2>
        <List
          items={b.children.map((c) =>
            c.stage ? `${c.nickname}, ${t(`stage.${c.stage}`)}` : c.nickname,
          )}
        />
      </section>

      <section className="briefing-block" aria-labelledby="b-rooms">
        <h2 id="b-rooms" className="t-section">
          {t("brief.rooms")}
        </h2>
        <p>{b.rooms.map((r) => t(`room.${r}`)).join(", ")}</p>
      </section>

      <section className="briefing-block" aria-labelledby="b-top">
        <h2 id="b-top" className="t-section">
          {t("brief.top")}
        </h2>
        {b.top.length === 0 ? (
          <p>{t("brief.topNone")}</p>
        ) : (
          <List
            items={b.top.map(
              (v) => `${localHazard(v.hazard, lang).name} (${t(`room.${v.task.room}`)})`,
            )}
          />
        )}
      </section>

      {know.length > 0 && (
        <section className="briefing-block" aria-labelledby="b-know">
          <h2 id="b-know" className="t-section">
            {t("brief.know")}
          </h2>
          <List items={know} />
        </section>
      )}

      {withCard && (
        <section className="print-only" aria-label={t("brief.card")}>
          <h2 className="t-section">{t("brief.card")}</h2>
          {b.children.map((c) => (
            <CardPrint key={c.id} t={t} name={c.nickname} card={cards[c.id]} />
          ))}
        </section>
      )}

      <p className="fine">{t("task.notGuarantee")}</p>
      <Link to="/people" className="btn btn-text btn-block no-print">
        {t("brief.back")}
      </Link>
    </article>
  );
}
