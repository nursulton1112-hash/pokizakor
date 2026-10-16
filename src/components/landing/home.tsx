import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ArrowRight, Check, ChevronDown, Minus, Phone, Plus, X } from "lucide-react";
import { sendLead } from "@/lib/lead";
import { initPixel, track } from "@/lib/pixel";
import {
  CASES,
  INSTAGRAM,
  OFFER_PERCENT,
  PHONE,
  REVIEWS,
  SERVICES,
  SIZES,
  T,
  TEL,
  WA_NUMBER,
  WHENS,
  type Lang,
} from "./copy";

type Text = { readonly ru: string; readonly tg: string };

const LangContext = createContext<Lang>("ru");

function useTx() {
  const lang = useContext(LangContext);
  return (text: Text) => text[lang];
}

/* ---------- helpers ---------- */

type CalcItem = { id: string; serviceId: string; l: string; w: string; custom: boolean; qty: number };
type OrderLine = { name: string; detail: string; total: number | null };
type Order = { lines: OrderLine[]; total: number | null };

const FIRST_ITEM: CalcItem = { id: "i1", serviceId: "carpet", l: "2", w: "3", custom: false, qty: 1 };

function serviceById(id: string) {
  return SERVICES.find((s) => s.id === id) ?? SERVICES[0];
}

function parseMeters(value: string) {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null;
}

function fmt(n: number, digits = 0) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(digits ? n : Math.round(n));
}

function itemTotal(item: CalcItem) {
  const s = serviceById(item.serviceId);
  if (s.unit === "item") return item.qty * s.price;
  const l = parseMeters(item.l);
  const w = parseMeters(item.w);
  return l && w ? l * w * s.price : null;
}

function itemDetail(item: CalcItem) {
  const s = serviceById(item.serviceId);
  if (s.unit === "item") return `${item.qty} шт.`;
  const l = parseMeters(item.l);
  const w = parseMeters(item.w);
  return l && w ? `${fmt(l, 1)}×${fmt(w, 1)} м` : "";
}

function withOffer(total: number) {
  return OFFER_PERCENT ? total * (1 - OFFER_PERCENT / 100) : total;
}

function phoneDigits(value: string) {
  let d = value.replace(/\D/g, "");
  if (d.startsWith("992") && d.length > 9) d = d.slice(3);
  return d.slice(0, 9);
}

function formatPhone(value: string) {
  const d = phoneDigits(value);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
}

function waLink(text: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

function scrollToId(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function useInView<T extends Element>(ref: RefObject<T | null>, threshold = 0.4) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [ref, seen, threshold]);
  return seen;
}

/* ---------- shared styles ---------- */

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const btn = `press inline-flex h-13 items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-semibold ${focusRing}`;
const btnPrimary = `${btn} bg-primary text-primary-fg hover:bg-primary-dark`;
const btnWa = `${btn} bg-wa text-white hover:brightness-110`;
const field =
  "h-13 w-full rounded-2xl border border-line bg-surface px-4 text-[17px] text-fg outline-none placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15";
const h2 = "text-[28px] leading-[1.15] font-extrabold tracking-tight md:text-4xl";
const calm = { suppressHydrationWarning: true } as const;

function WaIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.24 8.24 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

function LogoMark({ className = "size-9 text-primary" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        maskImage: "url(/media/logo-mask.png)",
        WebkitMaskImage: "url(/media/logo-mask.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}

/* ---------- page ---------- */

export function HomePage() {
  const [lang, setLang] = useState<Lang>("ru");
  const [items, setItems] = useState<CalcItem[]>([FIRST_ITEM]);
  const [order, setOrder] = useState<Order | null>(null);
  const [pulse, setPulse] = useState(0);
  const [source, setSource] = useState("");
  const seq = useRef(1);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let initial: Lang | null = null;
    const fromUrl = params.get("lang");
    if (fromUrl === "tg" || fromUrl === "tj") initial = "tg";
    else if (fromUrl === "ru") initial = "ru";
    if (!initial) {
      try {
        const saved = window.localStorage.getItem("lang");
        if (saved === "ru" || saved === "tg") initial = saved;
      } catch {
        /* storage unavailable */
      }
    }
    if (!initial && navigator.language.toLowerCase().startsWith("tg")) initial = "tg";
    if (initial) setLang(initial);

    const parts = ["utm_source", "utm_medium", "utm_campaign", "utm_content"]
      .map((key) => params.get(key))
      .filter(Boolean);
    if (params.get("fbclid")) parts.push("facebook/instagram");
    if (!parts.length && document.referrer) {
      try {
        parts.push(new URL(document.referrer).hostname);
      } catch {
        /* ignore */
      }
    }
    setSource(parts.join(" / "));
  }, []);

  useEffect(() => {
    initPixel();
    // One listener covers every call / WhatsApp link on the page.
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) track("Contact", { method: "phone" });
      else if (href.startsWith("https://wa.me/")) track("Contact", { method: "whatsapp" });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "tg" ? "tg" : "ru";
  }, [lang]);

  function switchLang(next: Lang) {
    setLang(next);
    try {
      window.localStorage.setItem("lang", next);
    } catch {
      /* storage unavailable */
    }
  }

  function goToForm() {
    scrollToId("zayavka");
    window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 450);
  }

  function newItem(serviceId: string): CalcItem {
    seq.current += 1;
    return { id: `i${seq.current}`, serviceId, l: "2", w: "3", custom: false, qty: 1 };
  }

  function addItem() {
    setItems((cur) => [...cur, newItem(cur[cur.length - 1]?.serviceId ?? "carpet")]);
    setOrder(null);
  }

  function updateItem(id: string, patch: Partial<CalcItem>) {
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    setOrder(null);
  }

  function removeItem(id: string) {
    setItems((cur) => (cur.length > 1 ? cur.filter((it) => it.id !== id) : cur));
    setOrder(null);
  }

  function pickService(serviceId: string) {
    setItems((cur) => {
      const untouched =
        cur.length === 1 &&
        cur[0].serviceId === FIRST_ITEM.serviceId &&
        cur[0].l === FIRST_ITEM.l &&
        cur[0].w === FIRST_ITEM.w &&
        !cur[0].custom &&
        cur[0].qty === 1;
      if (untouched) return [{ ...cur[0], serviceId }];
      if (cur.some((it) => it.serviceId === serviceId)) return cur;
      return [...cur, newItem(serviceId)];
    });
    setOrder(null);
    setPulse((v) => v + 1);
    scrollToId("raschet");
  }

  function submitCalc() {
    const lines = items.map((it) => ({
      name: serviceById(it.serviceId).name.ru,
      detail: itemDetail(it),
      total: itemTotal(it),
    }));
    const valid = lines.filter((l) => l.total !== null);
    const sum = valid.reduce((s, l) => s + (l.total ?? 0), 0);
    track("InitiateCheckout", { value: Math.round(sum), currency: "TJS", num_items: lines.length });
    setOrder({ lines, total: valid.length ? valid.reduce((s, l) => s + (l.total ?? 0), 0) : null });
    goToForm();
  }

  return (
    <LangContext.Provider value={lang}>
      <div className="page-pad min-h-screen overflow-x-clip text-fg">
        <Header lang={lang} onLang={switchLang} onLead={goToForm} />
        <main>
          <Hero />
          <Trust />
          <BeforeAfter />
          <Reviews />
          <Services onPick={pickService} />
          <Calculator
            items={items}
            pulse={pulse}
            onUpdate={updateItem}
            onRemove={removeItem}
            onAdd={addItem}
            onSubmit={submitCalc}
          />
          <Kurpacha onPick={() => pickService("kurpacha")} />
          <Compare />
          <Steps />
          <About />
          <Faq />
          <Lead order={order} source={source} nameRef={nameRef} onClearOrder={() => setOrder(null)} />
        </main>
        <Footer />
        <Dock onLead={goToForm} />
      </div>
    </LangContext.Provider>
  );
}

/* ---------- header ---------- */

function LangSwitch({ lang, onLang, dark = false }: { lang: Lang; onLang: (l: Lang) => void; dark?: boolean }) {
  const options: { id: Lang; label: string }[] = [
    { id: "tg", label: "TJ" },
    { id: "ru", label: "RU" },
  ];
  return (
    <div
      role="group"
      aria-label="Забон / Язык"
      className={`flex rounded-full p-1 ${dark ? "bg-white/10" : "bg-bg"}`}
    >
      {options.map((o) => {
        const on = o.id === lang;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onLang(o.id)}
            className={`press h-8 min-w-11 rounded-full px-2.5 text-sm font-bold ${focusRing} ${
              on ? "bg-primary text-white" : dark ? "text-on-navy/80" : "text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Header({ lang, onLang, onLead }: { lang: Lang; onLang: (l: Lang) => void; onLead: () => void }) {
  const tx = useTx();
  const nav = [
    { href: "#raznica", label: tx(T.nav.results) },
    { href: "#uslugi", label: tx(T.nav.services) },
    { href: "#otzyvy", label: tx(T.nav.reviews) },
    { href: "#voprosy", label: tx(T.nav.faq) },
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line/70 bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:h-16 md:px-6">
        <a href="#top" className={`flex items-center gap-2 rounded-lg ${focusRing}`}>
          <LogoMark />
          <span className="text-[19px] font-extrabold tracking-tight text-primary uppercase">Покизакор</span>
        </a>
        <nav className="ml-6 hidden items-center gap-6 text-[15px] font-medium text-muted lg:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-fg">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitch lang={lang} onLang={onLang} />
          <a
            href={TEL}
            aria-label={PHONE}
            className={`press grid size-10 place-items-center rounded-full bg-primary/10 text-primary md:hidden ${focusRing}`}
          >
            <Phone className="size-[18px]" />
          </a>
          <a
            href={TEL}
            className="hidden items-center gap-2 px-2 text-[15px] font-semibold whitespace-nowrap md:inline-flex"
          >
            <Phone className="size-4 text-primary" aria-hidden="true" />
            {PHONE}
          </a>
          <button type="button" onClick={onLead} className={`${btnPrimary} h-11 text-base max-md:hidden`}>
            {tx(T.lead)}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */

function Hero() {
  const tx = useTx();
  const lang = useContext(LangContext);
  return (
    <section id="top" className="ornament relative overflow-hidden bg-navy pt-14 text-on-navy md:pt-16">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-40 size-[30rem] bg-white opacity-[0.06] md:top-6 md:-left-48 md:size-[40rem]"
        style={{
          maskImage: "url(/media/logo-mask-lg.png)",
          WebkitMaskImage: "url(/media/logo-mask-lg.png)",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pt-7 pb-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-12 md:px-6 md:pt-14 md:pb-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-on-navy/90">
            <span className="size-2 rounded-full bg-sun" aria-hidden="true" />
            {tx(T.hero.place)}
          </p>
          <h1 className="mt-4 text-[34px] leading-[1.08] font-extrabold tracking-tight md:text-5xl lg:text-[56px]">
            {tx(T.hero.title)}
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-on-navy/80 md:text-lg">{tx(T.hero.sub)}</p>

          <div className="mt-6 grid max-w-md grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white px-4 py-3 text-fg">
              <p className="flex items-baseline gap-1.5">
                <span className="text-base font-semibold text-muted">{tx(T.hero.from)}</span>
                <span className="text-[34px] leading-none font-extrabold tabular-nums">10</span>
              </p>
              <p className="mt-1 text-sm leading-tight font-semibold text-muted">{tx(T.hero.perM2)}</p>
            </div>
            {OFFER_PERCENT ? (
              <div className="rounded-2xl bg-sun px-4 py-3 text-navy">
                <p className="text-[34px] leading-none font-extrabold">−{OFFER_PERCENT}%</p>
                <p className="mt-1 text-sm leading-tight font-semibold">{tx(T.hero.offer)}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:flex">
            <a href="#raschet" className={`${btn} bg-white text-navy hover:bg-white/90`}>
              {tx(T.hero.price)}
              <ArrowRight className="size-5" aria-hidden="true" />
            </a>
            <a
              href={waLink(tx(T.wa.hello))}
              target="_blank"
              rel="noopener noreferrer"
              className={btnWa}
            >
              <WaIcon />
              {tx(T.writeWa)}
            </a>
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-sm md:max-w-none">
          <div className="relative overflow-hidden rounded-[28px] bg-navy shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
            <video
              className="aspect-[4/5] w-full object-cover"
              src="/media/wash.mp4"
              poster="/media/wash-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label={tx(T.hero.video)}
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pt-12 pb-4 text-base font-semibold text-white">
              {tx(T.hero.video)}
            </figcaption>
          </div>
          <div className="absolute -bottom-6 -left-2 max-w-[15rem] rounded-2xl bg-white p-3.5 text-fg shadow-card md:-left-8">
            <p className="text-[15px] leading-snug font-medium">«{lang === "ru" ? REVIEWS[0].ru : REVIEWS[0].short}»</p>
            <p className="mt-1.5 text-sm text-muted">{REVIEWS[0].name} · Instagram</p>
          </div>
        </figure>
      </div>
    </section>
  );
}

function Trust() {
  const tx = useTx();
  return (
    <div className="relative z-10 mx-auto -mt-6 max-w-6xl px-4 md:-mt-10 md:px-6">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line shadow-card md:grid-cols-4">
        {T.trust.map((item) => (
          <li key={item.big.ru} className="bg-surface px-4 py-4 md:px-6 md:py-5">
            <p className="text-xl font-extrabold text-primary md:text-2xl">{tx(item.big)}</p>
            <p className="mt-0.5 text-[15px] leading-snug text-muted">{tx(item.small)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- before / after ---------- */

function BeforeAfter() {
  const tx = useTx();
  const [caseId, setCaseId] = useState(CASES[0].id);
  const [after, setAfter] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const seen = useInView(boxRef, 0.55);
  const item = CASES.find((c) => c.id === caseId) ?? CASES[0];

  // First time the viewer scrolls here, show the dirty photo, then reveal the result.
  useEffect(() => {
    if (!seen) return;
    const timer = window.setTimeout(() => setAfter(true), 900);
    return () => window.clearTimeout(timer);
  }, [seen]);

  function choose(id: string) {
    setCaseId(id);
    setAfter(false);
    window.setTimeout(() => setAfter(true), 700);
  }

  return (
    <section id="raznica" className="mx-auto max-w-6xl px-4 pt-14 pb-12 md:px-6 md:pt-20 md:pb-16">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:items-center md:gap-12">
        <div className="min-w-0 md:order-2">
          <h2 className={h2}>{tx(T.ba.title)}</h2>
          <p className="mt-2 text-[17px] text-muted">{tx(T.ba.sub)}</p>
          <ul className="no-scrollbar -mx-4 scroll-px-4 mt-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
            {CASES.map((c) => {
              const on = c.id === item.id;
              return (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => choose(c.id)}
                    className={`press flex w-full items-center gap-2.5 rounded-2xl border p-1.5 pr-4 text-left ${focusRing} ${
                      on ? "border-primary bg-primary/5" : "border-line bg-surface"
                    }`}
                  >
                    <img src={c.after} alt="" className="size-11 rounded-xl object-cover" width={44} height={44} loading="lazy" />
                    <span className="text-[15px] font-semibold whitespace-nowrap">{tx(c.name)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div ref={boxRef} className="min-w-0 md:order-1">
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-line shadow-card">
            <img
              key={`${item.id}-b`}
              src={item.before}
              alt={`${tx(item.name)}: ${tx(T.ba.before)}`}
              className="absolute inset-0 size-full object-cover"
              width={800}
              height={800}
              loading="lazy"
            />
            <img
              key={`${item.id}-a`}
              src={item.after}
              alt={`${tx(item.name)}: ${tx(T.ba.after)}`}
              className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out ${
                after ? "opacity-100" : "opacity-0"
              }`}
              width={800}
              height={800}
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-4 flex justify-center">
              <div role="group" className="flex rounded-full bg-black/55 p-1 backdrop-blur-md">
                {[false, true].map((isAfter) => (
                  <button
                    key={String(isAfter)}
                    type="button"
                    aria-pressed={after === isAfter}
                    onClick={() => setAfter(isAfter)}
                    className={`press h-11 min-w-24 rounded-full px-5 text-base font-bold ${focusRing} ${
                      after === isAfter ? (isAfter ? "bg-primary text-white" : "bg-white text-fg") : "text-white/85"
                    }`}
                  >
                    {isAfter ? tx(T.ba.after) : tx(T.ba.before)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- reviews ---------- */

function Reviews() {
  const tx = useTx();
  const lang = useContext(LangContext);
  return (
    <section id="otzyvy" className="bg-surface py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={h2}>{tx(T.reviews.title)}</h2>
            <p className="mt-2 text-[17px] text-muted">{tx(T.reviews.sub)}</p>
          </div>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary"
          >
            {tx(T.reviews.more)}
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>
        <ul className="no-scrollbar -mx-4 scroll-px-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
          {REVIEWS.map((r) => (
            <li
              key={r.name}
              className="flex w-[82%] shrink-0 snap-start flex-col rounded-3xl border border-line bg-bg p-5 md:w-auto"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary text-base font-bold text-white">
                  {r.name[0]}
                </span>
                <div>
                  <p className="text-base font-bold">{r.name}</p>
                  <p className="text-sm text-muted">Instagram</p>
                </div>
              </div>
              <p className="mt-4 text-[17px] leading-relaxed">{r.text}</p>
              {lang === "ru" && <p className="mt-2 text-[15px] leading-relaxed text-muted">{r.ru}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- services ---------- */

function Services({ onPick }: { onPick: (id: string) => void }) {
  const tx = useTx();
  return (
    <section id="uslugi" className="mx-auto max-w-6xl px-4 pt-12 md:px-6 md:pt-20">
      <h2 className={h2}>{tx(T.services.title)}</h2>
      <p className="mt-2 text-[17px] text-muted">{tx(T.services.sub)}</p>
      <ul className="mt-6 grid gap-2.5 md:grid-cols-2">
        {SERVICES.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              className={`press group flex w-full items-center gap-3.5 rounded-3xl border border-line bg-surface p-2.5 pr-3 text-left hover:border-primary/40 ${focusRing}`}
            >
              <img
                src={s.photo}
                alt=""
                className="size-[72px] shrink-0 rounded-2xl object-cover"
                width={72}
                height={72}
                loading="lazy"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-lg leading-tight font-bold">{tx(s.name)}</span>
                <span className="mt-0.5 block text-[15px] leading-snug text-muted">{tx(s.note)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xl leading-none font-extrabold tabular-nums">{s.price}</span>
                <span className="mt-1 block text-[13px] text-muted">{tx(s.per)}</span>
              </span>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white">
                <Plus className="size-5" aria-hidden="true" />
                <span className="sr-only">{tx(T.services.add)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- calculator ---------- */

function Calculator({
  items,
  pulse,
  onUpdate,
  onRemove,
  onAdd,
  onSubmit,
}: {
  items: CalcItem[];
  pulse: number;
  onUpdate: (id: string, patch: Partial<CalcItem>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onSubmit: () => void;
}) {
  const tx = useTx();
  const [flash, setFlash] = useState(false);
  const totals = items.map(itemTotal);
  const known = totals.filter((t): t is number => t !== null);
  const total = known.length ? known.reduce((a, b) => a + b, 0) : null;

  useEffect(() => {
    if (!pulse) return;
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 900);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  return (
    <section id="raschet" className="mx-auto max-w-6xl px-4 pt-12 pb-12 md:px-6 md:pt-16 md:pb-20">
      <div
        className={`rounded-[28px] border border-line bg-surface p-4 shadow-card md:grid md:grid-cols-[0.8fr_1.2fr] md:gap-10 md:p-8 ${
          flash ? "flash" : ""
        }`}
      >
        <div className="px-1 pt-1 md:px-0">
          <h2 className={h2}>{tx(T.calc.title)}</h2>
          <p className="mt-2 text-[17px] text-muted">{tx(T.calc.sub)}</p>
          <p className="mt-4 hidden rounded-2xl bg-bg p-4 text-[15px] leading-relaxed text-muted md:block">
            {tx(T.calc.noSize)}
          </p>
        </div>

        <div className="mt-5 md:mt-0">
          <ul className="space-y-3">
            {items.map((item, index) => {
              const s = serviceById(item.serviceId);
              const t = totals[index];
              const presetIndex = item.custom ? -1 : SIZES.findIndex((p) => p.l === item.l && p.w === item.w);
              return (
                <li key={item.id} className="rounded-3xl bg-bg p-3.5">
                  <div className="flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                      <select
                        {...calm}
                        aria-label={tx(T.calc.service)}
                        className={`${field} appearance-none pr-10 font-semibold`}
                        value={item.serviceId}
                        onChange={(e) => onUpdate(item.id, { serviceId: e.target.value })}
                      >
                        {SERVICES.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {tx(opt.name)} — {opt.price}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted" />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        aria-label={tx(T.calc.remove)}
                        className={`press grid size-13 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-muted hover:text-bad ${focusRing}`}
                      >
                        <X className="size-5" />
                      </button>
                    )}
                  </div>

                  {s.unit === "m2" ? (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-muted">{tx(T.calc.size)}</p>
                      <div className="mt-2 grid grid-cols-5 gap-1.5">
                        {SIZES.map((p, pi) => (
                          <button
                            key={`${p.l}x${p.w}`}
                            type="button"
                            aria-pressed={presetIndex === pi}
                            onClick={() => onUpdate(item.id, { l: p.l, w: p.w, custom: false })}
                            className={`press h-11 rounded-xl text-[15px] font-semibold tabular-nums ${focusRing} ${
                              presetIndex === pi
                                ? "bg-primary text-white"
                                : "border border-line bg-surface text-fg hover:border-primary/40"
                            }`}
                          >
                            {p.l.replace(".", ",")}×{p.w.replace(".", ",")}
                          </button>
                        ))}
                        <button
                          type="button"
                          aria-pressed={presetIndex === -1}
                          onClick={() => onUpdate(item.id, { custom: true })}
                          className={`press h-11 rounded-xl text-[15px] font-semibold ${focusRing} ${
                            presetIndex === -1
                              ? "bg-primary text-white"
                              : "border border-line bg-surface text-fg hover:border-primary/40"
                          }`}
                        >
                          {tx(T.calc.own)}
                        </button>
                      </div>
                      {presetIndex === -1 && (
                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          <label className="block text-sm font-semibold text-muted">
                            {tx(T.calc.length)}
                            <input
                              {...calm}
                              className={`${field} mt-1`}
                              inputMode="decimal"
                              value={item.l}
                              onChange={(e) => onUpdate(item.id, { l: e.target.value, custom: true })}
                            />
                          </label>
                          <label className="block text-sm font-semibold text-muted">
                            {tx(T.calc.width)}
                            <input
                              {...calm}
                              className={`${field} mt-1`}
                              inputMode="decimal"
                              value={item.w}
                              onChange={(e) => onUpdate(item.id, { w: e.target.value, custom: true })}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-muted">{s.qty ? tx(s.qty) : tx(T.calc.howMany)}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={tx(T.calc.less)}
                          disabled={item.qty <= 1}
                          onClick={() => onUpdate(item.id, { qty: Math.max(1, item.qty - 1) })}
                          className={`press grid size-12 place-items-center rounded-2xl border border-line bg-surface disabled:opacity-40 ${focusRing}`}
                        >
                          <Minus className="size-5" />
                        </button>
                        <span className="w-10 text-center text-2xl font-extrabold tabular-nums">{item.qty}</span>
                        <button
                          type="button"
                          aria-label={tx(T.calc.more)}
                          disabled={item.qty >= 20}
                          onClick={() => onUpdate(item.id, { qty: Math.min(20, item.qty + 1) })}
                          className={`press grid size-12 place-items-center rounded-2xl border border-line bg-surface disabled:opacity-40 ${focusRing}`}
                        >
                          <Plus className="size-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="mt-3 flex items-baseline justify-between gap-3 text-[15px]">
                    <span className="text-muted">
                      {s.unit === "m2"
                        ? t === null
                          ? tx(T.calc.enterSize)
                          : `${fmt(t / s.price, 1)} м² × ${s.price}`
                        : `${item.qty} × ${s.price}`}
                    </span>
                    <span className="font-bold tabular-nums">{t === null ? "—" : `${fmt(t)} ${tx(T.somoni)}`}</span>
                  </p>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={onAdd}
            className={`press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-base font-semibold text-muted hover:border-primary/50 hover:text-primary ${focusRing}`}
          >
            <Plus className="size-5" aria-hidden="true" />
            {tx(T.calc.add)}
          </button>

          <p className="mt-4 rounded-2xl bg-bg p-3.5 text-[15px] leading-snug text-muted md:hidden">{tx(T.calc.noSize)}</p>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-5">
            <div>
              <p className="text-base text-muted">{tx(T.calc.total)}</p>
              {OFFER_PERCENT && total !== null ? (
                <p className="mt-1 text-sm font-semibold text-primary">
                  {fmt(withOffer(total))} {tx(T.somoni)} {tx(T.calc.withOffer)}
                </p>
              ) : null}
            </div>
            <p className="text-right text-4xl leading-none font-extrabold tabular-nums">
              {total === null ? "—" : fmt(total)}
              {total !== null && <span className="ml-1.5 text-base font-semibold text-muted">{tx(T.somoni)}</span>}
            </p>
          </div>
          <button type="button" onClick={onSubmit} className={`${btnPrimary} mt-5 w-full`}>
            {tx(T.calc.order)}
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- kurpacha ---------- */

function Kurpacha({ onPick }: { onPick: () => void }) {
  const tx = useTx();
  return (
    <section className="ornament bg-navy text-on-navy">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-2 md:items-center md:gap-12 md:px-6 md:py-16">
        <div className="grid grid-cols-2 gap-2.5">
          <img
            src="/media/kurpacha-dry.jpg"
            alt=""
            className="aspect-[3/4] w-full rounded-3xl object-cover"
            width={400}
            height={533}
            loading="lazy"
          />
          <img
            src="/media/kurpacha.jpg"
            alt=""
            className="mt-8 aspect-[3/4] w-full rounded-3xl object-cover"
            width={400}
            height={533}
            loading="lazy"
          />
        </div>
        <div>
          <h2 className={h2}>{tx(T.kurpacha.title)}</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-on-navy/80">{tx(T.kurpacha.text)}</p>
          <p className="mt-5 inline-flex rounded-2xl bg-white/10 px-4 py-2.5 text-xl font-extrabold">
            {tx(T.kurpacha.price)}
          </p>
          <div className="mt-6">
            <button type="button" onClick={onPick} className={`${btn} w-full bg-white text-navy hover:bg-white/90 sm:w-auto`}>
              <Plus className="size-5" aria-hidden="true" />
              {tx(T.kurpacha.cta)}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- compare ---------- */

function Compare() {
  const tx = useTx();
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20">
      <h2 className={h2}>{tx(T.compare.title)}</h2>
      <div className="mt-6 overflow-hidden rounded-[28px] border border-line bg-surface">
        <div className="grid grid-cols-2 border-b border-line text-[15px] font-bold md:text-base">
          <p className="px-4 py-3.5 text-muted md:px-6">{tx(T.compare.self)}</p>
          <p className="flex items-center gap-2 bg-primary/5 px-4 py-3.5 text-primary md:px-6">
            <LogoMark className="size-5 text-primary" />
            {tx(T.compare.us)}
          </p>
        </div>
        <ul>
          {T.compare.rows.map((row) => (
            <li key={row.us.ru} className="grid grid-cols-2 border-b border-line last:border-b-0">
              <p className="flex gap-2 px-4 py-4 text-[15px] leading-snug text-muted md:px-6 md:text-base">
                <X className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden="true" />
                {tx(row.self)}
              </p>
              <p className="flex gap-2 bg-primary/5 px-4 py-4 text-[15px] leading-snug font-semibold md:px-6 md:text-base">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {tx(row.us)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- steps ---------- */

function Steps() {
  const tx = useTx();
  return (
    <section className="bg-surface py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2 className={h2}>{tx(T.steps.title)}</h2>
        <ol className="no-scrollbar -mx-4 scroll-px-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {T.steps.items.map((step, i) => (
            <li key={step.title.ru} className="w-[78%] shrink-0 snap-start md:w-auto">
              <div className="relative overflow-hidden rounded-3xl">
                <img
                  src={step.photo}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                  width={600}
                  height={450}
                  loading="lazy"
                />
                <span className="absolute top-3 left-3 grid size-9 place-items-center rounded-full bg-white text-base font-extrabold text-primary shadow-card">
                  {i + 1}
                </span>
              </div>
              <p className="mt-3 text-xl font-bold">{tx(step.title)}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">{tx(step.text)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- about ---------- */

function About() {
  const tx = useTx();
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20">
      <div className="grid gap-6 md:grid-cols-2 md:items-center md:gap-12">
        <img
          src="/media/team.jpg"
          alt={tx(T.about.title)}
          className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-card"
          width={1200}
          height={900}
          loading="lazy"
        />
        <div>
          <h2 className={h2}>{tx(T.about.title)}</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">{tx(T.about.text)}</p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <img src="/media/foam.jpg" alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" width={500} height={375} loading="lazy" />
            <img src="/media/red-full.jpg" alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" width={500} height={375} loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- faq ---------- */

function Faq() {
  const tx = useTx();
  return (
    <section id="voprosy" className="mx-auto max-w-3xl px-4 pb-14 md:px-6 md:pb-20">
      <h2 className={h2}>{tx(T.faq.title)}</h2>
      <Accordion.Root type="single" collapsible className="mt-6 rounded-[28px] border border-line bg-surface px-4 md:px-6">
        {T.faq.items.map((item) => (
          <Accordion.Item key={item.q.ru} value={item.q.ru} className="border-b border-line last:border-b-0">
            <Accordion.Header>
              <Accordion.Trigger
                className={`group flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-[17px] font-semibold ${focusRing}`}
              >
                {tx(item.q)}
                <ChevronDown
                  className="size-5 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="acc-content">
              <p className="pb-4 text-base leading-relaxed text-muted">{tx(item.a)}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}

/* ---------- lead form ---------- */

function OrderBox({ order, onEdit }: { order: Order; onEdit?: () => void }) {
  const tx = useTx();
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-primary">{tx(T.form.yourCalc)}</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={`press rounded-xl border border-line bg-surface px-3 py-1.5 text-sm font-semibold ${focusRing}`}
          >
            {tx(T.form.edit)}
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-1 text-[15px]">
        {order.lines.map((line, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="min-w-0">
              {line.name}
              {line.detail ? ` · ${line.detail}` : ""}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {line.total === null ? "—" : `${fmt(line.total)} ${tx(T.somoni)}`}
            </span>
          </li>
        ))}
      </ul>
      {order.total !== null && (
        <p className="mt-2 flex justify-between gap-3 border-t border-primary/20 pt-2 text-base font-bold">
          <span>{tx(T.form.total)}</span>
          <span className="tabular-nums">
            ≈ {fmt(order.total)} {tx(T.somoni)}
          </span>
        </p>
      )}
    </div>
  );
}

function Lead({
  order,
  source,
  nameRef,
  onClearOrder,
}: {
  order: Order | null;
  source: string;
  nameRef: RefObject<HTMLInputElement | null>;
  onClearOrder: () => void;
}) {
  const tx = useTx();
  const lang = useContext(LangContext);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [when, setWhen] = useState(WHENS[0].id);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [honey, setHoney] = useState("");
  const [errors, setErrors] = useState<{ name?: boolean; phone?: boolean }>({});
  const [status, setStatus] = useState<"form" | "sending" | "sent" | "failed" | "wa">("form");

  const whenEntry = WHENS.find((w) => w.id === when) ?? WHENS[0];
  const hasOrder = Boolean(order && order.lines.length);
  const offerText = OFFER_PERCENT ? `−${OFFER_PERCENT}% на первый заказ с сайта` : "";

  function waText() {
    const lines = [
      tx(T.wa.hello),
      `${tx(T.wa.name)}: ${name.trim()}`,
      `${tx(T.form.phone)}: +992 ${phone}`,
      `${tx(T.wa.when)}: ${whenEntry[lang]}`,
    ];
    if (order) {
      for (const line of order.lines) {
        lines.push(`• ${line.name}${line.detail ? ` (${line.detail})` : ""}`);
      }
      if (order.total !== null) lines.push(`≈ ${fmt(order.total)} ${tx(T.somoni)}`);
    }
    if (comment.trim()) lines.push(comment.trim());
    return lines.join("\n");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = { name: name.trim().length < 2, phone: phoneDigits(phone).length < 9 };
    setErrors(next);
    if (next.name || next.phone) return;
    setStatus("sending");
    try {
      const result = await sendLead({
        data: {
          name: name.trim(),
          phone: `+992 ${phone}`,
          when: whenEntry.ru,
          comment: comment.trim(),
          items: order?.lines ?? [],
          total: order?.total ?? null,
          offer: offerText,
          lang,
          source,
          website: honey,
        },
      });
      setStatus(result.ok ? "sent" : result.reason === "not_configured" ? "wa" : "failed");
      if (result.ok) {
        track("Lead", { value: Math.round(order?.total ?? 0), currency: "TJS", content_name: "site_form" });
      }
    } catch {
      setStatus("failed");
    }
  }

  return (
    <section id="zayavka" className="ornament bg-navy text-on-navy">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[0.8fr_1.2fr] md:gap-12 md:px-6 md:py-20">
        <div>
          <h2 className={h2}>{tx(T.form.title)}</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-on-navy/80">{tx(T.form.sub)}</p>
          {OFFER_PERCENT ? (
            <p className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-sun px-4 py-3 text-navy">
              <span className="text-2xl font-extrabold">−{OFFER_PERCENT}%</span>
              <span className="text-sm leading-tight font-semibold">{tx(T.hero.offer)}</span>
            </p>
          ) : null}
          <div className="mt-6 hidden gap-3 md:grid">
            <a href={TEL} className={`${btn} border border-white/25 text-on-navy hover:bg-white/10`}>
              <Phone className="size-5" aria-hidden="true" />
              {PHONE}
            </a>
          </div>
        </div>

        <div className="rounded-[28px] bg-surface p-4 text-fg md:p-7">
          {status === "sent" ? (
            <div className="pop-in py-2">
              <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                <Check className="size-8" aria-hidden="true" />
              </span>
              <p className="mt-4 text-2xl font-extrabold">{tx(T.form.okTitle)}</p>
              <p className="mt-1 text-[17px] text-muted">{tx(T.form.okText)}</p>
              {order && hasOrder && (
                <div className="mt-5">
                  <OrderBox order={order} />
                </div>
              )}
              <button
                type="button"
                onClick={() => setStatus("form")}
                className={`${btn} mt-5 border border-line text-fg hover:border-fg/30`}
              >
                {tx(T.form.edit)}
              </button>
            </div>
          ) : status === "failed" || status === "wa" ? (
            <div className="pop-in py-2">
              <p className="text-2xl font-extrabold">{status === "wa" ? tx(T.form.waTitle) : tx(T.form.failTitle)}</p>
              <p className="mt-1 text-[17px] text-muted">{status === "wa" ? tx(T.form.waText) : tx(T.form.failText)}</p>
              <div className="mt-5 grid gap-3">
                <a href={waLink(waText())} target="_blank" rel="noopener noreferrer" className={btnWa}>
                  <WaIcon />
                  {tx(T.form.sendWa)}
                </a>
                <a href={TEL} className={`${btn} border border-line text-fg`}>
                  <Phone className="size-5 text-primary" aria-hidden="true" />
                  {PHONE}
                </a>
                <button type="button" onClick={() => setStatus("form")} className="h-11 text-base font-semibold text-muted">
                  {tx(T.form.back)}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="hidden" aria-hidden="true">
                <label>
                  Website
                  <input {...calm} tabIndex={-1} autoComplete="off" value={honey} onChange={(e) => setHoney(e.target.value)} />
                </label>
              </div>

              {order && hasOrder && (
                <div className="mb-4">
                  <OrderBox
                    order={order}
                    onEdit={() => {
                      onClearOrder();
                      scrollToId("raschet");
                    }}
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-base font-semibold">
                  {tx(T.form.name)}
                  <input
                    {...calm}
                    ref={nameRef}
                    autoComplete="name"
                    className={`${field} mt-1.5 ${errors.name ? "border-bad" : ""}`}
                    value={name}
                    aria-invalid={errors.name || undefined}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((p) => ({ ...p, name: false }));
                    }}
                  />
                  {errors.name && <span className="mt-1 block text-sm font-medium text-bad">{tx(T.form.errName)}</span>}
                </label>
                <label className="block text-base font-semibold">
                  {tx(T.form.phone)}
                  <span className="relative mt-1.5 block">
                    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[17px] font-medium text-muted">
                      +992
                    </span>
                    <input
                      {...calm}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="92 123 45 67"
                      className={`${field} pl-16 tabular-nums ${errors.phone ? "border-bad" : ""}`}
                      value={phone}
                      aria-invalid={errors.phone || undefined}
                      onChange={(e) => {
                        setPhone(formatPhone(e.target.value));
                        if (errors.phone) setErrors((p) => ({ ...p, phone: false }));
                      }}
                    />
                  </span>
                  {errors.phone && <span className="mt-1 block text-sm font-medium text-bad">{tx(T.form.errPhone)}</span>}
                </label>
              </div>

              <fieldset className="mt-4">
                <legend className="text-base font-semibold">{tx(T.form.when)}</legend>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {WHENS.map((w) => {
                    const on = w.id === when;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setWhen(w.id)}
                        className={`press h-12 rounded-2xl px-4 text-base font-semibold ${focusRing} ${
                          on ? "bg-navy text-white" : "border border-line bg-bg text-fg hover:border-fg/25"
                        }`}
                      >
                        {w[lang]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {showComment ? (
                <label className="mt-4 block text-base font-semibold">
                  {tx(T.form.comment)}
                  <textarea
                    {...calm}
                    autoFocus
                    className={`${field} mt-1.5 h-auto min-h-24 py-3`}
                    placeholder={tx(T.form.commentHint)}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowComment(true)}
                  className="mt-3 inline-flex h-11 items-center gap-1.5 text-base font-semibold text-primary"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {tx(T.form.addComment)}
                </button>
              )}

              <button type="submit" disabled={status === "sending"} className={`${btnPrimary} mt-4 w-full disabled:opacity-70`}>
                {status === "sending" ? tx(T.form.sending) : tx(T.form.submit)}
              </button>

              <div className="mt-4 flex items-center gap-3 text-sm text-muted">
                <span className="h-px flex-1 bg-line" />
                {tx(T.form.or)}
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <a href={waLink(tx(T.wa.hello))} target="_blank" rel="noopener noreferrer" className={`${btnWa} px-3`}>
                  <WaIcon />
                  WhatsApp
                </a>
                <a href={TEL} className={`${btn} border border-line px-3 text-fg`}>
                  <Phone className="size-5 text-primary" aria-hidden="true" />
                  {tx(T.call)}
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- footer & dock ---------- */

function Footer() {
  const tx = useTx();
  return (
    <footer className="bg-navy text-on-navy/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 border-t border-white/10 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="flex items-center gap-2 text-lg font-extrabold text-white">
            <LogoMark className="size-8 text-white" />
            Покизакор
          </p>
          <p className="mt-1.5 text-[15px]">{tx(T.footer.about)}</p>
        </div>
        <div className="flex flex-col gap-1 md:items-end">
          <a href={TEL} className="text-lg font-bold text-white">
            {PHONE}
          </a>
          <p className="text-[15px]">{tx(T.footer.hours)}</p>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-white">
            Instagram @pokizakor
          </a>
        </div>
      </div>
    </footer>
  );
}

function Dock({ onLead }: { onLead: () => void }) {
  const tx = useTx();
  return (
    <div className="dock fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 px-3 pt-2.5 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <a
          href={TEL}
          aria-label={tx(T.call)}
          className={`press grid size-13 shrink-0 place-items-center rounded-2xl border border-line text-primary ${focusRing}`}
        >
          <Phone className="size-5" />
        </a>
        <a
          href={waLink(tx(T.wa.hello))}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnWa} flex-1 px-3 text-base`}
        >
          <WaIcon />
          WhatsApp
        </a>
        <button type="button" onClick={onLead} className={`${btnPrimary} flex-1 px-3 text-base`}>
          {tx(T.lead)}
        </button>
      </div>
    </div>
  );
}
