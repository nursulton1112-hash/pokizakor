import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import {
  ArrowRight,
  Calculator as CalculatorIcon,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  Minus,
  Phone,
  PhoneCall,
  Plus,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

const PHONE = "+992 92 000 00 00";
const TEL = "tel:+992920000000";

type Unit = "m2" | "item";

type Service = {
  id: string;
  name: string;
  unit: Unit;
  price: number;
  hint: string;
  note: string;
  photo: string;
  photoAlt: string;
  qtyLabel?: string;
};

const SERVICES: Service[] = [
  {
    id: "wash",
    name: "Стирка ковра",
    unit: "m2",
    price: 10,
    hint: "сомони / м²",
    note: "Заберём и привезём",
    photo: "/photos/wash.jpg",
    photoAlt: "Ковёр на промышленной мойке",
  },
  {
    id: "delicate",
    name: "Шёлк и длинный ворс",
    unit: "m2",
    price: 15,
    hint: "сомони / м²",
    note: "Отдельный деликатный режим",
    photo: "/photos/pile.jpg",
    photoAlt: "Чистый длинный ворс ковра",
  },
  {
    id: "home",
    name: "Ковролин на дому",
    unit: "m2",
    price: 15,
    hint: "сомони / м²",
    note: "Не снимаем с пола",
    photo: "/photos/home.jpg",
    photoAlt: "Чистка ковролина на дому",
  },
  {
    id: "sofa",
    name: "Диван",
    unit: "item",
    price: 80,
    hint: "сомони / место",
    note: "Цена за посадочное место",
    photo: "/photos/sofa.jpg",
    photoAlt: "Диван после чистки",
    qtyLabel: "Сколько мест?",
  },
  {
    id: "chair",
    name: "Кресло",
    unit: "item",
    price: 50,
    hint: "сомони / шт.",
    note: "Чистим на дому",
    photo: "/photos/ba/chairs-after.jpg",
    photoAlt: "Мягкая мебель после чистки",
    qtyLabel: "Сколько кресел?",
  },
  {
    id: "textile",
    name: "Одеяло и курпача",
    unit: "item",
    price: 25,
    hint: "сомони / шт.",
    note: "Можно вместе с ковром",
    photo: "/photos/packed.jpg",
    photoAlt: "Одеяла упакованы после чистки",
    qtyLabel: "Сколько штук?",
  },
];

const NAV = [
  { href: "#uslugi", label: "Услуги" },
  { href: "#raschet", label: "Расчёт" },
  { href: "#kak", label: "Как проходит" },
  { href: "#voprosy", label: "Вопросы" },
];

const DISTRICTS = [
  "Худжанд",
  "34-й микрорайон",
  "Центр",
  "Бустон",
  "Гулистон",
  "Другой район Согда",
];

const WHENS = ["Сегодня", "Завтра", "На этой неделе", "Не срочно"];

const STEPS = [
  { n: "01", icon: CalculatorIcon, title: "Считаете", text: "Выбираете услугу и размер — цена видна сразу." },
  { n: "02", icon: PhoneCall, title: "Звоним", text: "Подтверждаем время и стоимость." },
  { n: "03", icon: Truck, title: "Забираем", text: "Приезжаем в удобное время." },
  { n: "04", icon: Sparkles, title: "Привозим", text: "Вернём чистым и упакованным." },
];

const FAQ = [
  { q: "Когда заберёте ковёр?", a: "Сегодня или завтра. Точное время согласуем по телефону." },
  { q: "Как оплатить?", a: "Когда ковёр уже чистый — без предоплаты." },
  { q: "Цвет не сядет?", a: "Проверяем стойкость краски до стирки. Если есть риск — предупредим заранее." },
  {
    q: "Будет ли запах после стирки?",
    a: "Сушим в цехе и проветриваем. Если у ковра сложное загрязнение — скажем до стирки.",
  },
];

const WHY = [
  { icon: Clock, text: "Заберём сегодня или завтра" },
  { icon: ShieldCheck, text: "Оплата после чистки" },
  { icon: MapPin, text: "Худжанд и районы Согда" },
];

type Draft = {
  name: string;
  phone: string;
  service: string;
  size: string;
  district: string;
  when: string;
  comment: string;
};

const INITIAL_DRAFT: Draft = {
  name: "",
  phone: "",
  service: "wash",
  size: "",
  district: "",
  when: "Сегодня",
  comment: "",
};

type CalcItem = {
  id: string;
  serviceId: string;
  length: string;
  width: string;
  qty: number;
};

type OrderLine = { name: string; detail: string; total: number | null };
type OrderSummary = { lines: OrderLine[]; total: number | null };

const INITIAL_ITEM: CalcItem = { id: "item-1", serviceId: "wash", length: "2", width: "3", qty: 1 };

function serviceById(id: string) {
  return SERVICES.find((item) => item.id === id) ?? SERVICES[0];
}

function parseMeters(value: string) {
  const n = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(n);
}

function somoni(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("992") ? digits.slice(3) : digits;
}

function formatPhoneInput(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("992")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  if (!digits) return "";
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return `+992 ${parts.join(" ")}`;
}

function itemTotal(item: CalcItem): number | null {
  const service = serviceById(item.serviceId);
  if (service.unit === "m2") {
    const len = parseMeters(item.length);
    const wid = parseMeters(item.width);
    if (!len || !wid) return null;
    return len * wid * service.price;
  }
  return item.qty * service.price;
}

function itemDetail(item: CalcItem): string {
  const service = serviceById(item.serviceId);
  if (service.unit === "m2") {
    const len = parseMeters(item.length);
    const wid = parseMeters(item.width);
    return len && wid ? `${formatNumber(len)} × ${formatNumber(wid)} м` : "";
  }
  return `${item.qty} шт.`;
}

function isPristine(item: CalcItem) {
  return (
    item.serviceId === INITIAL_ITEM.serviceId &&
    item.length === INITIAL_ITEM.length &&
    item.width === INITIAL_ITEM.width &&
    item.qty === INITIAL_ITEM.qty
  );
}

function scrollToId(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({
    behavior: reduce ? "auto" : "smooth",
    block: "start",
  });
}

const btnPrimary =
  "press inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-primary-fg hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const btnGhost =
  "press inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 text-base font-semibold text-fg hover:border-fg/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const btnOnPhoto =
  "press inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-on-ink/50 bg-ink/25 px-5 text-base font-semibold text-on-ink backdrop-blur-md hover:bg-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink";
const fieldClass =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-fg outline-none placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10";
const sectionTitle = "text-3xl font-semibold leading-tight md:text-4xl";
const kicker = "text-sm font-semibold uppercase tracking-[0.14em] text-primary";
const calm = { suppressHydrationWarning: true } as const;

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "is-in" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function useCountUp(target: number | null) {
  const [value, setValue] = useState<number | null>(target);
  const fromRef = useRef<number | null>(target);

  useEffect(() => {
    if (target === null) {
      fromRef.current = null;
      setValue(null);
      return;
    }
    const from = fromRef.current ?? 0;
    if (from === target) {
      setValue(target);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    const started = performance.now();
    const duration = 360;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return value;
}

export function HomePage() {
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [status, setStatus] = useState<"form" | "sent">("form");
  const [items, setItems] = useState<CalcItem[]>([INITIAL_ITEM]);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [pulse, setPulse] = useState(0);
  const [honey, setHoney] = useState("");
  const itemSeq = useRef(1);
  const nameRef = useRef<HTMLInputElement>(null);

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function focusNameSoon() {
    window.setTimeout(() => nameRef.current?.focus(), 380);
  }

  function goToForm() {
    setStatus("form");
    scrollToId("zayavka");
    focusNameSoon();
  }

  function addItem(serviceId?: string) {
    setItems((current) => {
      const service = serviceId ?? current[current.length - 1]?.serviceId ?? SERVICES[0].id;
      itemSeq.current += 1;
      return [
        ...current,
        { id: `item-${itemSeq.current}`, serviceId: service, length: "2", width: "3", qty: 1 },
      ];
    });
    setOrder(null);
  }

  function updateItem(id: string, partial: Partial<CalcItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...partial } : item)));
    setOrder(null);
  }

  function removeItem(id: string) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
    setOrder(null);
  }

  function pickService(id: string) {
    setItems((current) => {
      if (current.length === 1 && isPristine(current[0])) {
        return [{ ...current[0], serviceId: id }];
      }
      itemSeq.current += 1;
      return [
        ...current,
        { id: `item-${itemSeq.current}`, serviceId: id, length: "2", width: "3", qty: 1 },
      ];
    });
    setOrder(null);
    setPulse((value) => value + 1);
    scrollToId("raschet");
  }

  function orderFromCalculator(summary: OrderSummary & { size: string }) {
    setDraft((current) => ({ ...current, size: summary.size || current.size }));
    setOrder({ lines: summary.lines, total: summary.total });
    setStatus("form");
    scrollToId("zayavka");
    focusNameSoon();
  }

  return (
    <div className="carpet-page page-pad min-h-screen text-fg">
      <Header onLead={goToForm} />
      <main>
        <Hero onLead={goToForm} />
        <Services onPick={pickService} />
        <Calculator
          items={items}
          pulse={pulse}
          onUpdate={updateItem}
          onRemove={removeItem}
          onAdd={addItem}
          onOrder={orderFromCalculator}
        />
        <Process />
        <BeforeAfter />
        <Faq />
        <Lead
          draft={draft}
          status={status}
          order={order}
          honey={honey}
          nameRef={nameRef}
          onPatch={patch}
          onHoney={setHoney}
          onStatus={setStatus}
          onClearOrder={() => setOrder(null)}
        />
      </main>
      <Footer />
      <Dock onLead={goToForm} />
    </div>
  );
}

function Header({ onLead }: { onLead: () => void }) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      id="top"
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,color,box-shadow] duration-300 ${
        solid
          ? "border-line bg-bg/95 text-fg shadow-[0_18px_40px_-32px_rgba(20,33,27,0.6)] backdrop-blur-md"
          : "border-transparent text-on-ink"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <a href="#top" className="text-lg font-semibold tracking-tight">
          Pokizakor<span className="text-primary">.tj</span>
        </a>
        <nav className="hidden items-center gap-6 text-base lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="navlink opacity-80 hover:opacity-100">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <a href={TEL} className="hidden items-center gap-2 text-base font-medium lg:inline-flex">
            <Phone className="size-4 text-primary" aria-hidden="true" />
            <span className="whitespace-nowrap">{PHONE}</span>
          </a>
          <button type="button" className={btnPrimary} onClick={onLead}>
            Заявка
          </button>
        </div>
      </div>
    </header>
  );
}

const ROLL = ["ковров.", "одеял.", "курпача.", "диванов.", "кресел."];

function RollingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % ROLL.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, []);

  const previous = (index + ROLL.length - 1) % ROLL.length;

  return (
    <span className="mt-1 block">
      <span className="grid h-[1.08em] overflow-hidden">
        {ROLL.map((word, item) => {
          const place =
            item === index
              ? "translate-y-0 opacity-100"
              : item === previous
                ? "-translate-y-full opacity-0"
                : "translate-y-full opacity-0";
          return (
            <span
              key={word}
              className={`col-start-1 row-start-1 transition-all duration-300 ease-out motion-reduce:transition-none ${place}`}
              aria-hidden={item !== index}
            >
              {word}
            </span>
          );
        })}
      </span>
      <span className="mt-2 block h-1 w-14 rounded-full bg-primary" aria-hidden="true" />
    </span>
  );
}

function Hero({ onLead }: { onLead: () => void }) {
  return (
    <section className="relative min-h-svh overflow-hidden">
      <img
        src="/photos/hero.jpg"
        alt="Чистый ковёр в светлой комнате"
        className="hero-zoom absolute inset-0 h-full w-full object-cover"
        width={1600}
        height={900}
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/50 to-ink/20" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/60 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col px-5 pt-28 pb-14 md:min-h-svh md:justify-center md:pt-24">
        <Reveal>
          <p className="text-base font-medium text-on-ink/80">Худжанд</p>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="mt-2 max-w-4xl text-4xl leading-[1.08] font-semibold text-on-ink md:text-5xl lg:text-6xl [text-wrap:normal]">
            Профессиональная чистка
            <RollingWord />
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-3 max-w-md text-lg leading-snug text-on-ink/85">
            Более 3 лет наводим чистоту в Согде!
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="mt-6 inline-flex w-fit items-end gap-2 rounded-2xl bg-surface px-5 py-3.5 text-fg shadow-card">
            <p className="pb-2 text-base font-semibold text-muted">от</p>
            <p className="text-5xl leading-none font-bold tabular-nums">10</p>
            <p className="pb-1 text-base leading-tight font-medium">
              сомони
              <br />
              за м²
            </p>
          </div>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a href="#raschet" className={`${btnPrimary} w-full sm:w-auto`}>
              Рассчитать
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <button type="button" className={`${btnOnPhoto} w-full sm:w-auto`} onClick={onLead}>
              Оставить заявку
            </button>
          </div>
        </Reveal>
        <Reveal delay={300}>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-medium text-on-ink/75">
            {WHY.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-on-ink/60" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function Services({ onPick }: { onPick: (id: string) => void }) {
  return (
    <section id="uslugi" className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <Reveal>
        <p className={kicker}>Услуги и цены</p>
        <h2 className={`${sectionTitle} mt-2`}>Что чистим</h2>
        <p className="mt-2 max-w-xl text-base text-muted">
          Нажмите на услугу — она добавится в расчёт.
        </p>
      </Reveal>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((item, index) => (
          <Reveal key={item.id} delay={index * 60}>
            <button
              type="button"
              onClick={() => onPick(item.id)}
              className="press group relative block w-full overflow-hidden rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <img
                src={item.photo}
                alt={item.photoAlt}
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                width={1200}
                height={900}
                loading="lazy"
              />
              <span
                className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/5"
                aria-hidden="true"
              />
              <span className="absolute top-3 right-3 rounded-full bg-surface/95 px-3 py-1 text-sm font-semibold tabular-nums shadow-card">
                {item.price} <span className="font-medium text-muted">{item.hint}</span>
              </span>
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-on-ink">
                <span className="min-w-0">
                  <span className="block text-2xl leading-tight font-semibold">{item.name}</span>
                  <span className="mt-1 block text-sm font-medium text-on-ink/75">{item.note}</span>
                </span>
                <span className="flex h-9 shrink-0 translate-y-1 items-center gap-1 rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-fg opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  <Plus className="size-3.5" aria-hidden="true" />
                  Добавить
                </span>
              </span>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Calculator({
  items,
  pulse,
  onUpdate,
  onRemove,
  onAdd,
  onOrder,
}: {
  items: CalcItem[];
  pulse: number;
  onUpdate: (id: string, partial: Partial<CalcItem>) => void;
  onRemove: (id: string) => void;
  onAdd: (serviceId?: string) => void;
  onOrder: (summary: OrderSummary & { size: string }) => void;
}) {
  const [flash, setFlash] = useState(false);
  const totals = items.map(itemTotal);
  const valid = totals.some((total) => total !== null);
  const grandTotal = valid ? totals.reduce<number>((sum, total) => sum + (total ?? 0), 0) : null;
  const hasInvalid = totals.some((total) => total === null);
  const shownTotal = useCountUp(grandTotal);

  useEffect(() => {
    if (!pulse) return;
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 900);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  function submitOrder() {
    const lines: OrderLine[] = items.map((item) => ({
      name: serviceById(item.serviceId).name,
      detail: itemDetail(item),
      total: itemTotal(item),
    }));
    const sum = lines.reduce((acc, line) => acc + (line.total ?? 0), 0);
    const anyValid = lines.some((line) => line.total !== null);
    onOrder({
      lines,
      total: anyValid ? sum : null,
      size: lines.length === 1 ? lines[0].detail : "",
    });
  }

  return (
    <section id="raschet">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:py-16 lg:grid-cols-12">
        <Reveal className="min-w-0 lg:col-span-4">
          <p className={kicker}>Калькулятор</p>
          <h2 className={`${sectionTitle} mt-2`}>Сколько выйдет</h2>
          <p className="mt-2 max-w-xs text-base leading-relaxed text-muted">
            Добавьте позиции — стоимость посчитается сразу.
          </p>
          <ul className="mt-5 space-y-1.5 text-base text-muted">
            {["Вывоз и доставка по Худжанду", "От 15 м² — бесплатно", "Оплата после чистки"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={80} className="min-w-0 lg:col-span-8">
          <div
            className={`rounded-2xl border border-line bg-surface p-5 shadow-card md:p-7 ${flash ? "flash" : ""}`}
          >
            <p className="text-base font-medium">Что чистим</p>
            <ul className="mt-3 space-y-3">
              {items.map((item, index) => {
                const service = serviceById(item.serviceId);
                const total = itemTotal(item);
                const len = parseMeters(item.length);
                const wid = parseMeters(item.width);
                const area = len && wid ? len * wid : null;
                return (
                  <li key={item.id} className="rounded-xl border border-line bg-bg p-4">
                    <div className="flex items-center gap-2.5">
                      {items.length > 1 && (
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {index + 1}
                        </span>
                      )}
                      <div className="relative min-w-0 flex-1">
                        <select
                          {...calm}
                          aria-label="Услуга"
                          className={`${fieldClass} appearance-none pr-10`}
                          value={item.serviceId}
                          onChange={(event) => onUpdate(item.id, { serviceId: event.target.value })}
                        >
                          {SERVICES.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name} — {entry.price} {entry.hint}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          aria-label="Убрать позицию"
                          className="press grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted hover:border-primary/40 hover:text-primary"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3">
                      {service.unit === "m2" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <label className="block text-base font-medium">
                            Длина, м
                            <input
                              {...calm}
                              className={`${fieldClass} mt-1.5`}
                              inputMode="decimal"
                              value={item.length}
                              onChange={(event) => onUpdate(item.id, { length: event.target.value })}
                            />
                          </label>
                          <label className="block text-base font-medium">
                            Ширина, м
                            <input
                              {...calm}
                              className={`${fieldClass} mt-1.5`}
                              inputMode="decimal"
                              value={item.width}
                              onChange={(event) => onUpdate(item.id, { width: event.target.value })}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-base text-muted">{service.qtyLabel ?? "Сколько?"}</p>
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              className="press inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface hover:border-fg/25 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => onUpdate(item.id, { qty: Math.max(1, item.qty - 1) })}
                              disabled={item.qty <= 1}
                              aria-label="Меньше"
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="w-10 text-center text-3xl font-bold tabular-nums">{item.qty}</span>
                            <button
                              type="button"
                              className="press inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface hover:border-fg/25 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => onUpdate(item.id, { qty: Math.min(12, item.qty + 1) })}
                              disabled={item.qty >= 12}
                              aria-label="Больше"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="mt-2.5 flex items-center justify-between gap-3 text-base">
                      <span className="min-w-0 text-muted">
                        {service.unit === "m2"
                          ? area
                            ? `${formatNumber(area)} м² × ${service.price} сомони`
                            : "Впишите размер"
                          : `${item.qty} × ${service.price} сомони`}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {total === null ? "—" : `${somoni(total)} сомони`}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => onAdd()}
              className="press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-base font-medium text-muted hover:border-primary/50 hover:text-primary"
            >
              <Plus className="size-4" aria-hidden="true" />
              Добавить ещё
            </button>

            <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-5">
              <div>
                <p className="text-base text-muted">Ориентир</p>
                {hasInvalid && (
                  <p className="mt-1 max-w-[16rem] text-sm text-muted">
                    Впишите размер, чтобы учесть все позиции.
                  </p>
                )}
              </div>
              <p className="text-right text-4xl leading-none font-bold tabular-nums">
                {shownTotal === null ? "—" : somoni(shownTotal)}
                {shownTotal !== null && <span className="ml-1.5 text-base font-medium text-muted">сомони</span>}
              </p>
            </div>
            <button type="button" className={`${btnPrimary} mt-5 w-full`} onClick={submitOrder}>
              {grandTotal === null ? (
                "Оформить заявку"
              ) : (
                <>
                  Оформить заявку · {somoni(grandTotal)} сомони
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section id="kak" className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <Reveal>
        <p className={kicker}>Процесс</p>
        <h2 className={`${sectionTitle} mt-2`}>Как проходит</h2>
        <p className="mt-2 max-w-xl text-base text-muted">От заявки до чистого ковра — четыре шага.</p>
      </Reveal>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <Reveal key={step.n} delay={index * 70}>
              <div className="h-full rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-muted">{step.n}</span>
                </div>
                <p className="mt-3 text-xl font-semibold">{step.title}</p>
                <p className="mt-1 text-base leading-relaxed text-muted">{step.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

const CASES = [
  { id: "rug", name: "Ковёр", before: "/photos/ba/rug-before.jpg", after: "/photos/ba/rug-after.jpg" },
  { id: "light", name: "Светлый ковёр", before: "/photos/ba/light-before.jpg", after: "/photos/ba/light-after.jpg" },
  { id: "sofa", name: "Диван", before: "/photos/ba/sofa-before.jpg", after: "/photos/ba/sofa-after.jpg" },
  { id: "corner", name: "Угловой диван", before: "/photos/ba/corner-before.jpg", after: "/photos/ba/corner-after.jpg" },
  { id: "chairs", name: "Стулья", before: "/photos/ba/chairs-before.jpg", after: "/photos/ba/chairs-after.jpg" },
];

function BeforeAfter() {
  const [id, setId] = useState(CASES[0].id);
  const item = CASES.find((entry) => entry.id === id) ?? CASES[0];

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 md:py-16" aria-labelledby="before-title">
      <Reveal>
        <p className={kicker}>Результаты</p>
        <h2 id="before-title" className={`${sectionTitle} mt-2`}>
          До и после
        </h2>
        <p className="mt-2 max-w-xl text-base text-muted">
          Фото с наших заказов: слева — до чистки, справа — после.
        </p>
      </Reveal>
      <Reveal delay={80} className="mt-6">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div key={item.id} className="case-in overflow-hidden rounded-2xl border border-line shadow-card">
            <div className="grid sm:grid-cols-2">
              <figure className="relative m-0">
                <img
                  src={item.before}
                  alt={`${item.name}: до чистки`}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.03]"
                  width={1200}
                  height={900}
                  loading="lazy"
                />
                <figcaption className="absolute top-3 left-3 rounded-full bg-ink/75 px-3 py-1 text-sm font-medium text-on-ink">
                  До
                </figcaption>
              </figure>
              <figure className="relative m-0 border-t border-line sm:border-t-0 sm:border-l">
                <img
                  src={item.after}
                  alt={`${item.name}: после чистки`}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.03]"
                  width={1200}
                  height={900}
                  loading="lazy"
                />
                <figcaption className="absolute top-3 right-3 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-fg">
                  После
                </figcaption>
              </figure>
            </div>
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {CASES.map((entry) => {
              const on = entry.id === item.id;
              return (
                <li key={entry.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => setId(entry.id)}
                    aria-pressed={on}
                    className={`press flex items-center gap-3 rounded-xl border bg-surface py-2 pr-4 pl-2 text-left ${
                      on ? "border-primary bg-primary/5" : "border-line hover:border-fg/25"
                    }`}
                  >
                    <img
                      src={entry.after}
                      alt=""
                      className="size-14 rounded-lg object-cover"
                      width={56}
                      height={56}
                      loading="lazy"
                    />
                    <span className="text-base font-medium">{entry.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

function Faq() {
  return (
    <section id="voprosy" className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <Reveal>
        <p className={kicker}>Вопросы</p>
        <h2 className={`${sectionTitle} mt-2`}>Частые вопросы</h2>
      </Reveal>
      <Reveal delay={80}>
        <Accordion.Root
          type="single"
          collapsible
          className="mt-6 rounded-2xl border border-line bg-surface px-5 md:px-7"
        >
          {FAQ.map((item) => (
            <Accordion.Item key={item.q} value={item.q} className="border-b border-line last:border-b-0">
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-4 text-left text-lg font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  {item.q}
                  <ChevronDown
                    className="size-5 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="acc-content">
                <div className="pb-4 text-base leading-relaxed text-muted">{item.a}</div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Reveal>
    </section>
  );
}

function Lead({
  draft,
  status,
  order,
  honey,
  nameRef,
  onPatch,
  onHoney,
  onStatus,
  onClearOrder,
}: {
  draft: Draft;
  status: "form" | "sent";
  order: OrderSummary | null;
  honey: string;
  nameRef: RefObject<HTMLInputElement | null>;
  onPatch: (partial: Partial<Draft>) => void;
  onHoney: (value: string) => void;
  onStatus: (status: "form" | "sent") => void;
  onClearOrder: () => void;
}) {
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const service = serviceById(draft.service);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: { name?: string; phone?: string } = {};
    if (draft.name.trim().length < 2) next.name = "Как к вам обращаться?";
    if (phoneDigits(draft.phone).length < 9) next.phone = "Впишите номер телефона";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (honey) {
      onStatus("sent");
      return;
    }
    onStatus("sent");
  }

  const recap: Array<{ label: string; value: string }> = [
    { label: "Имя", value: draft.name.trim() },
    { label: "Телефон", value: draft.phone.trim() },
    { label: "Услуга", value: service.name },
  ];
  if (draft.size.trim()) recap.push({ label: "Размер", value: draft.size.trim() });
  if (draft.district) recap.push({ label: "Район", value: draft.district });
  recap.push({ label: "Когда", value: draft.when });
  if (draft.comment.trim()) recap.push({ label: "Комментарий", value: draft.comment.trim() });

  return (
    <section id="zayavka" className="relative overflow-hidden bg-ink text-on-ink">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(620px_320px_at_18%_0%,rgba(194,75,40,0.18),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-12 md:py-16">
        <Reveal className="min-w-0 md:col-span-5">
          <p className={kicker}>Заявка</p>
          <h2 className={`${sectionTitle} mt-2 text-on-ink`}>Оставить заявку</h2>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-on-ink/75">
            Заполните форму — перезвоним и подтвердим время. Или позвоните сами:
          </p>
          <a
            href={TEL}
            className="press mt-5 inline-flex h-12 items-center gap-2 rounded-xl border border-on-ink/30 px-5 text-base font-medium text-on-ink hover:bg-on-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink"
          >
            <Phone className="size-4" aria-hidden="true" />
            {PHONE}
          </a>
          <p className="mt-2.5 text-sm text-on-ink/60">Ежедневно 8:00–20:00 · Худжанд и Согд</p>
        </Reveal>
        <Reveal delay={80} className="min-w-0 md:col-span-7">
          <div className="rounded-2xl bg-surface p-5 text-fg md:p-7">
            {status === "sent" ? (
              <div className="pop-in">
                <div className="flex items-center gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <svg viewBox="0 0 52 52" fill="none" className="size-8" aria-hidden="true">
                      <circle
                        className="check-circle"
                        cx="26"
                        cy="26"
                        r="24"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="check-path"
                        d="M16 27l7 7 14-15"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-2xl font-semibold">Заявка принята</p>
                    <p className="mt-1 text-base text-muted">Перезвоним и подтвердим время.</p>
                  </div>
                </div>
                <dl className="mt-5 space-y-2 rounded-xl border border-line bg-bg p-4 text-base">
                  {recap.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4">
                      <dt className="shrink-0 text-muted">{row.label}</dt>
                      <dd className="text-right font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {order && order.lines.length > 0 && (
                  <div className="mt-3 rounded-xl border border-line bg-bg p-4">
                    <p className="text-sm font-semibold text-primary">Расчёт из калькулятора</p>
                    <ul className="mt-2 space-y-1 text-base">
                      {order.lines.map((line, index) => (
                        <li key={index} className="flex justify-between gap-3">
                          <span className="min-w-0">
                            {line.name}
                            {line.detail ? ` · ${line.detail}` : ""}
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {line.total === null ? "—" : `${somoni(line.total)} сомони`}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {order.total !== null && (
                      <p className="mt-2 flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold">
                        <span>Итого</span>
                        <span className="tabular-nums">{somoni(order.total)} сомони</span>
                      </p>
                    )}
                  </div>
                )}
                <button type="button" className={`${btnGhost} mt-5`} onClick={() => onStatus("form")}>
                  Изменить заявку
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                <div className="hidden" aria-hidden="true">
                  <label>
                    Сайт
                    <input
                      {...calm}
                      tabIndex={-1}
                      autoComplete="off"
                      value={honey}
                      onChange={(event) => onHoney(event.target.value)}
                    />
                  </label>
                </div>
                {order && order.lines.length > 0 && (
                  <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-primary">Расчёт из калькулятора</p>
                      <button
                        type="button"
                        className="press shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-fg/25"
                        onClick={() => scrollToId("raschet")}
                      >
                        Изменить
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1 text-base">
                      {order.lines.map((line, index) => (
                        <li key={index} className="flex justify-between gap-3">
                          <span className="min-w-0">
                            {line.name}
                            {line.detail ? ` · ${line.detail}` : ""}
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {line.total === null ? "—" : `${somoni(line.total)} сомони`}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {order.lines.length > 1 && order.total !== null && (
                      <p className="mt-2 flex justify-between gap-3 border-t border-primary/20 pt-2 text-base font-semibold">
                        <span>Итого</span>
                        <span className="tabular-nums">{somoni(order.total)} сомони</span>
                      </p>
                    )}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-base font-medium">
                    Имя
                    <input
                      {...calm}
                      id="lead-name"
                      ref={nameRef}
                      className={`${fieldClass} mt-1.5 ${errors.name ? "border-primary" : ""}`}
                      autoComplete="name"
                      value={draft.name}
                      onChange={(event) => {
                        onPatch({ name: event.target.value });
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                    />
                    {errors.name && <span className="mt-1 block text-sm text-primary">{errors.name}</span>}
                  </label>
                  <label className="block text-base font-medium">
                    Телефон
                    <input
                      {...calm}
                      className={`${fieldClass} mt-1.5 ${errors.phone ? "border-primary" : ""}`}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="92 123 45 67"
                      value={draft.phone}
                      onChange={(event) => {
                        onPatch({ phone: formatPhoneInput(event.target.value) });
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                      }}
                    />
                    {errors.phone && <span className="mt-1 block text-sm text-primary">{errors.phone}</span>}
                  </label>
                </div>
                <label className="mt-4 block text-base font-medium">
                  Услуга
                  <div className="relative mt-1.5">
                    <select
                      {...calm}
                      className={`${fieldClass} appearance-none pr-10`}
                      value={draft.service}
                      onChange={(event) => {
                        onPatch({ service: event.target.value });
                        onClearOrder();
                      }}
                    >
                      {SERVICES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — {item.price} {item.hint}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
                  </div>
                </label>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-base font-medium">
                    Размер
                    <input
                      {...calm}
                      className={`${fieldClass} mt-1.5`}
                      placeholder="2 × 3 м"
                      value={draft.size}
                      onChange={(event) => {
                        onPatch({ size: event.target.value });
                        onClearOrder();
                      }}
                    />
                  </label>
                  <label className="block text-base font-medium">
                    Район
                    <div className="relative mt-1.5">
                      <select
                        {...calm}
                        className={`${fieldClass} appearance-none pr-10`}
                        value={draft.district}
                        onChange={(event) => onPatch({ district: event.target.value })}
                      >
                        <option value="">Не указан</option>
                        {DISTRICTS.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
                    </div>
                  </label>
                </div>
                <fieldset className="mt-4">
                  <legend className="text-base font-medium">Когда забрать</legend>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {WHENS.map((when) => {
                      const on = draft.when === when;
                      return (
                        <button
                          key={when}
                          type="button"
                          onClick={() => onPatch({ when })}
                          className={`press h-12 rounded-full px-4 text-base font-medium ${
                            on ? "bg-ink text-on-ink" : "border border-line bg-bg text-fg hover:border-fg/25"
                          }`}
                        >
                          {when}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="mt-4 block text-base font-medium">
                  Комментарий
                  <textarea
                    {...calm}
                    className={`${fieldClass} mt-1.5 h-auto min-h-24 py-3`}
                    placeholder="Пятна, животные, подъезд"
                    value={draft.comment}
                    onChange={(event) => onPatch({ comment: event.target.value })}
                  />
                </label>
                <button type="submit" className={`${btnPrimary} mt-4 w-full`}>
                  Отправить заявку
                </button>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <p className="text-xl font-semibold">
            Pokizakor<span className="text-primary">.tj</span>
          </p>
          <p className="mt-1.5 text-base text-muted">
            Стирка и химчистка ковров, диванов и ковролина в Худжанде.
          </p>
        </div>
        <nav className="flex flex-col gap-1.5 text-base" aria-label="Разделы">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="w-fit text-muted hover:text-fg">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col items-start gap-1.5">
          <a href={TEL} className="text-lg font-semibold">
            {PHONE}
          </a>
          <p className="text-base text-muted">Ежедневно 8:00–20:00</p>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-5 pb-6 text-sm text-muted">© Pokizakor.tj — чистые ковры в Худжанде</p>
    </footer>
  );
}

function Dock({ onLead }: { onLead: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="dock pointer-events-auto mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
        <a
          href={TEL}
          className="press inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface/95 text-base font-medium shadow-card backdrop-blur-md"
        >
          <Phone className="size-5 text-primary" aria-hidden="true" />
          Позвонить
        </a>
        <button
          type="button"
          onClick={onLead}
          className="press inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-base font-medium text-primary-fg shadow-card"
        >
          Заявка
        </button>
      </div>
    </div>
  );
}
