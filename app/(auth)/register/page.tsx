"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Moon,
  Phone,
  Plus,
  Search,
  Sun,
  User,
  UserRound,
  X,
} from "lucide-react";


import {
  EMAIL_RE,
  GENDERS,
  MAX_AGE,
  MAX_PASSWORD_LENGTH,
  MIN_AGE,
  MIN_PASSWORD_LENGTH,
  ageFromBirthDate,
} from "@/lib/register-rules";

const BG_IMAGE =
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80";

const inputClass =
  "h-14 w-full rounded-2xl border border-white/20 bg-white/10 pl-12 pr-4 text-base text-white placeholder:text-white/45 outline-none transition focus:border-white/60 focus:bg-white/15 focus:ring-4 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60";

const iconClass = "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60";
const labelClass = "mb-1.5 block text-sm font-medium text-white/80";

const HIGHLIGHTS = ["Local news", "Groups", "Community action"];
const STEP_TITLES = ["Create account", "Your details", "Your interests", "Set password"];
const MAX_HANDLE = 15;

const MIN_INTERESTS = 10;

const INTEREST_SECTIONS = [
  {
    id: "community",
    title: "Community",
    blurb: "Stay connected with what's happening near you",
    topics: [
      ["local-news", "Local news"],
      ["community-events", "Community events"],
      ["volunteering", "Volunteering"],
      ["neighborhood-watch", "Neighborhood watch"],
      ["block-parties", "Block parties"],
      ["community-gardens", "Community gardens"],
      ["local-history", "Local history"],
      ["street-cleanup", "Street cleanup"],
      ["yard-sales", "Yard sales"],
      ["lost-and-found", "Lost and found"],
    ],
  },
  {
    id: "food",
    title: "Food & Drink",
    blurb: "Find the best bites and drinks around town",
    topics: [
      ["restaurants", "Restaurants"],
      ["cafes", "Cafes"],
      ["food-trucks", "Food trucks"],
      ["farmers-markets", "Farmers markets"],
      ["bakeries", "Bakeries"],
      ["breweries", "Breweries"],
      ["coffee-shops", "Coffee shops"],
      ["ice-cream", "Ice cream"],
      ["tacos", "Tacos"],
      ["pizza", "Pizza"],
    ],
  },
  {
    id: "outdoors",
    title: "Outdoors & Recreation",
    blurb: "Get outside and enjoy your neighborhood",
    topics: [
      ["parks", "Parks"],
      ["hiking", "Hiking"],
      ["biking", "Biking"],
      ["fishing", "Fishing"],
      ["kayaking", "Kayaking"],
      ["camping", "Camping"],
      ["skate-parks", "Skate parks"],
      ["playgrounds", "Playgrounds"],
      ["tennis-courts", "Tennis courts"],
      ["basketball-courts", "Basketball courts"],
    ],
  },
  {
    id: "arts",
    title: "Arts & Culture",
    blurb: "Discover creative energy in your area",
    topics: [
      ["live-music", "Live music"],
      ["art-galleries", "Art galleries"],
      ["theater", "Theater"],
      ["museums", "Museums"],
      ["murals", "Murals"],
      ["street-art", "Street art"],
      ["poetry-slams", "Poetry slams"],
      ["open-mic", "Open mic"],
      ["dance-classes", "Dance classes"],
      ["craft-fairs", "Craft fairs"],
    ],
  },
  {
    id: "wellness",
    title: "Health & Wellness",
    blurb: "Take care of yourself and your community",
    topics: [
      ["yoga", "Yoga"],
      ["running-clubs", "Running clubs"],
      ["gyms", "Gyms"],
      ["meditation", "Meditation"],
      ["farmers-markets", "Farmers markets"],
      ["mental-health", "Mental health"],
      ["yoga-in-the-park", "Yoga in the park"],
      ["walking-groups", "Walking groups"],
      ["cycling-groups", "Cycling groups"],
      ["wellness-workshops", "Wellness workshops"],
    ],
  },
  {
    id: "family",
    title: "Family & Kids",
    blurb: "Fun for the whole family",
    topics: [
      ["story-time", "Story time"],
      ["kids-activities", "Kids activities"],
      ["family-events", "Family events"],
      ["playdates", "Playdates"],
      ["parent-groups", "Parent groups"],
      ["library-events", "Library events"],
      ["zoo-visits", "Zoo visits"],
      ["aquarium", "Aquarium"],
      ["science-museums", "Science museums"],
      ["family-hikes", "Family hikes"],
    ],
  },
  {
    id: "services",
    title: "Services & Resources",
    blurb: "Practical resources for everyday life",
    topics: [
      ["libraries", "Libraries"],
      ["community-centers", "Community centers"],
      ["pet-services", "Pet services"],
      ["car-repair", "Car repair"],
      ["hardware-stores", "Hardware stores"],
      ["pharmacies", "Pharmacies"],
      ["grocery-stores", "Grocery stores"],
      ["laundromats", "Laundromats"],
      ["bike-repair", "Bike repair"],
      ["computer-repair", "Computer repair"],
    ],
  },
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Costa Rica", "Côte d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos",
  "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Republic of the Congo", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "São Tomé and Príncipe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe",
];

const HERO = [
  { title: "Build your local network.", body: "Follow community updates, discover events and connect with people nearby." },
  { title: "Tell us about you.", body: "A few details so your neighbours can find and trust you." },
  { title: "Make your feed yours.", body: "Pick the topics you care about and we will fill your feed with them." },
  { title: "Almost there.", body: "Set a password and choose how Netizen looks." },
];

type HandleStatus = "idle" | "checking" | "available" | "taken" | "error";
type UiMode = "light" | "dark";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const generateHandle = (value: string) => {
  const handle = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, MAX_HANDLE);
  return handle ? `@${handle}` : "";
};

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** File -> square-cropped JPEG Blob -> base64 data URL (string stored in the user's `image` field). */
async function processImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image. Try a JPG or PNG."));
      el.src = objectUrl;
    });

    const size = 320;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that image.");

    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("Could not process that image.");

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that image."));
      reader.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/* ------------------------------------------------------------------ */
/* Custom gender dropdown (opens upward, since it lives at sheet bottom) */
/* ------------------------------------------------------------------ */
function GenderDropdown({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <UserRound className={iconClass} />
      <button
        id="reg-gender"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${inputClass} flex cursor-pointer items-center pr-10 text-left`}
      >
        <span className={`truncate ${value ? "text-white" : "text-white/45"}`}>{value || "Select"}</span>
        <ChevronDown
          className={`absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby="reg-gender"
          className="absolute bottom-full left-0 z-40 mb-2 w-full min-w-[190px] overflow-hidden rounded-2xl border border-white/20 bg-[#0d2a1d]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
        >
          {GENDERS.map((option) => {
            const selected = option === value;
            return (
              <li key={option} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${
                    selected ? "bg-white/15 font-semibold text-white" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {option}
                  {selected && <Check className="h-4 w-4 text-[#86efac]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom-sheet modal with search (used for country)                   */
/* Rendered in a portal: the glass sheet's backdrop-filter would       */
/* otherwise trap position:fixed children inside it.                   */
/* ------------------------------------------------------------------ */
function SelectSheet({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return q ? options.filter((option) => normalize(option).includes(q)) : options;
  }, [options, query]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-[430px] flex-col rounded-t-[2rem] border border-white/20 bg-[#0d2a1d]/95 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-2xl backdrop-blur-2xl sm:rounded-[2rem]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/30" />

        <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-4">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative shrink-0 px-6 pb-3">
          <Search className="pointer-events-none absolute left-10 top-1/2 h-5 w-5 -translate-y-[calc(50%+6px)] text-white/60" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search country"
            className={inputClass}
          />
        </div>

        <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-white/55">No matches for “{query}”.</li>
          )}
          {filtered.map((option) => {
            const selected = option === value;
            return (
              <li key={option} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-base transition ${
                    selected ? "bg-white/15 font-semibold" : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  {option}
                  {selected && <Check className="h-5 w-5 text-[#86efac]" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Page 1: account
  const [image, setImage] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [userHandle, setUserHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [handleStatus, setHandleStatus] = useState<HandleStatus>("idle");
  const [handleNote, setHandleNote] = useState<{ base: string; suffix: string } | null>(null);
  const verifiedHandle = useRef("");

  // Page 2: details (contact + about you)
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);

  // Page 3: interests
  const [interests, setInterests] = useState<string[]>([]);
  const selectedInterests = useMemo(() => new Set(interests), [interests]);

  // Earliest / latest dates the date picker allows (13 to 120 years old)
  const dateBounds = useMemo(() => {
    const today = new Date();
    return {
      min: toDateInputValue(new Date(today.getFullYear() - MAX_AGE, today.getMonth(), today.getDate())),
      max: toDateInputValue(new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate())),
    };
  }, []);

  // Page 4: password + display mode
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [uiMode, setUiMode] = useState<UiMode>("light"); // default: bright mode

  const totalSteps = 4;
  const remainingInterests = Math.max(0, MIN_INTERESTS - interests.length);

  // Bring the sheet back into view whenever the step changes
  const sheetRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  /* ---- handle auto-generation ---- */
  const applyGeneratedHandle = (source: string) => {
    if (handleTouched) return;
    setHandleNote(null);
    setUserHandle(generateHandle(source));
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    applyGeneratedHandle(event.target.value);
  };

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
    applyGeneratedHandle(event.target.value);
  };

  const handleUserHandleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHandleTouched(true);
    setHandleNote(null);
    setUserHandle(generateHandle(event.target.value));
  };

  /* ---- live uniqueness check against the db ---- */
  useEffect(() => {
    const base = userHandle.replace("@", "");

    if (base.length < 2) {
      setHandleStatus("idle");
      return;
    }

    // Already verified as free (e.g. the suggestion we just applied)
    if (verifiedHandle.current === userHandle) {
      setHandleStatus("available");
      return;
    }

    setHandleStatus("checking");
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/check-handle?handle=${encodeURIComponent(base)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) throw new Error("check failed");

        if (data.available) {
          verifiedHandle.current = userHandle;
          setHandleStatus("available");
        } else if (typeof data.suggestion === "string" && data.suggestion.startsWith(base)) {
          // Taken: show the user the numbers we appended
          const suggestion: string = data.suggestion;
          verifiedHandle.current = `@${suggestion}`;
          setHandleNote({ base, suffix: suggestion.slice(base.length) });
          setUserHandle(`@${suggestion}`);
        } else {
          setHandleStatus("taken");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setHandleStatus("error");
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [userHandle]);

  /* ---- profile image ---- */
  async function handleImageChange(file?: File) {
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("That image is too large. Please choose one under 10 MB.");
      return;
    }

    setImageBusy(true);
    try {
      setImage(await processImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setImageBusy(false);
    }
  }

  /* ---- interests ---- */
  const toggleInterest = (id: string) => {
    setError("");
    setInterests((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  /* ---- display mode ---- */
  function chooseUiMode(mode: UiMode) {
    setUiMode(mode);
    try {
      localStorage.setItem("netizen-ui-mode", mode);
    } catch {
      /* storage unavailable, ignore */
    }
  }

  /* ---- validation / navigation ---- */
  const ageNumber = ageFromBirthDate(birthDate);
  const isAgeValid = ageNumber !== null && ageNumber >= MIN_AGE && ageNumber <= MAX_AGE;

  const isPage1Valid = () =>
    name.trim().length > 0 &&
    userHandle.replace("@", "").length >= 2 &&
    handleStatus !== "checking" &&
    handleStatus !== "taken" &&
    !imageBusy;
  const isContactValid = () => EMAIL_RE.test(email.trim()) && phone.trim().length > 0;
  const isPage2Valid = () => isContactValid() && isAgeValid && gender.length > 0 && country.trim().length > 0;
  const isPage3Valid = () => interests.length >= MIN_INTERESTS;
  const isPage4Valid = () =>
    password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;

  const stepValid = step === 1 ? isPage1Valid() : step === 2 ? isPage2Valid() : step === 3 ? isPage3Valid() : true;

  const nextStep = () => {
    if (step === 1 && !isPage1Valid()) {
      setError("Please enter your name and wait for your handle to be confirmed.");
      return;
    }
    if (step === 2 && !isPage2Valid()) {
      if (!isContactValid()) setError("Please enter a valid email and phone number.");
      else if (ageNumber === null) setError("Please enter your date of birth.");
      else if (ageNumber < MIN_AGE) setError(`You must be at least ${MIN_AGE} years old to join Netizen.`);
      else if (!isAgeValid) setError("Please check your date of birth.");
      else setError("Please choose your gender and country.");
      return;
    }
    if (step === 3 && !isPage3Valid()) {
      setError(`Pick at least ${MIN_INTERESTS} topics (${remainingInterests} more to go).`);
      return;
    }
    setError("");
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    // Pressing Enter on steps 1-3 should advance, not submit
    if (step < totalSteps) {
      nextStep();
      return;
    }

    if (!isPage4Valid()) {
      setError(
        `Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          userHandle,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          birthDate,
          gender,
          country: country.trim(),
          interests,
          password,
          uiMode,
          ...(image ? { image } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Registration failed.");
      }

      router.push("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const handleBase = userHandle.replace("@", "");
  const hero = HERO[step - 1];

  return (
    <main className="relative isolate min-h-[100dvh] overflow-x-clip bg-[#0b3d27] text-white">
      <img
        src={BG_IMAGE}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b3d27]/30 via-[#0b3d27]/40 to-[#04170f]/95" />
      <div className="absolute -left-24 top-1/4 -z-10 h-72 w-72 rounded-full bg-[#22c55e]/30 blur-3xl" />
      <div className="absolute -right-24 top-10 -z-10 h-64 w-64 rounded-full bg-[#86efac]/20 blur-3xl" />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        <header className="flex items-center gap-2.5 px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <img
            src="/netwhite.png"
            alt="Netizen logo"
            className="h-10 w-10 rounded-xl border border-white/25 bg-white/10 object-cover backdrop-blur-md"
          />
          <span className="text-xl font-semibold tracking-tight">Netizen</span>
        </header>

        <section className="flex flex-1 flex-col justify-end px-6 pb-6 pt-14">
          <h1 className="text-[2.25rem] font-semibold leading-[1.05] tracking-tight">{hero.title}</h1>
          <p className="mt-3 max-w-[32ch] text-base text-white/75">{hero.body}</p>

          {step === 1 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-sm text-white/90 backdrop-blur-md"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}

          {/* Progress strips */}
          <div className="mt-8">
            <p className="mb-2 text-xs text-white/60">
              Step {step} of {totalSteps}
            </p>
            <div
              className="flex gap-2"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-valuenow={step}
              aria-label="Registration progress"
            >
              {Array.from({ length: totalSteps }, (_, index) => {
                const position = index + 1;
                const done = position < step;
                const current = position === step;
                return (
                  <span
                    key={position}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      done
                        ? "bg-[#22c55e]"
                        : current
                          ? "bg-[#86efac] shadow-[0_0_12px_rgba(134,239,172,0.7)]"
                          : "bg-white/15"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* Glass sheet */}
        <section
          ref={sheetRef}
          className="scroll-mt-4 rounded-t-[2rem] border-x border-t border-white/25 bg-white/10 px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-7 shadow-[0_-24px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
        >
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/30" />

          <h2 className="text-2xl font-semibold tracking-tight">{STEP_TITLES[step - 1]}</h2>

          <form onSubmit={handleRegister} className="mt-5 space-y-4" noValidate>
            {/* PAGE 1: Photo, Name, Username, Handle */}
            {step === 1 && (
              <>
                <div className="flex flex-col items-center gap-2 pb-1">
                  <label className="group relative block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={loading || imageBusy}
                      onChange={(event) => {
                        handleImageChange(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                    <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-dashed border-white/35 bg-white/10 text-white/60 transition group-hover:bg-white/15">
                      {imageBusy ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : image ? (
                        <img src={image} alt="Profile preview" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-9 w-9" />
                      )}
                    </span>
                    <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-[#0b3d27] bg-[#22c55e] text-white">
                      <Camera className="h-4 w-4" />
                    </span>
                  </label>
                  {image ? (
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      className="text-xs font-medium text-white/70 underline-offset-4 hover:underline"
                    >
                      Remove photo
                    </button>
                  ) : (
                    <p className="text-xs text-white/55">Add a profile photo (optional)</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-name" className={labelClass}>
                    Full name
                  </label>
                  <div className="relative">
                    <User className={iconClass} />
                    <input
                      id="reg-name"
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="Jane Smith"
                      autoComplete="name"
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-username" className={labelClass}>
                    Account username <span className="font-normal text-white/45">(optional)</span>
                  </label>
                  <div className="relative">
                    <User className={iconClass} />
                    <input
                      id="reg-username"
                      type="text"
                      value={username}
                      onChange={handleUsernameChange}
                      placeholder="janesmith"
                      autoComplete="username"
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-handle" className={labelClass}>
                    User handle
                  </label>
                  <div className="relative">
                    <AtSign className={iconClass} />
                    <input
                      id="reg-handle"
                      type="text"
                      value={handleBase}
                      onChange={handleUserHandleChange}
                      placeholder="janesmith"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      disabled={loading}
                      className={`${inputClass} pr-12`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {handleStatus === "checking" && <Loader2 className="h-5 w-5 animate-spin text-white/60" />}
                      {handleStatus === "available" && <Check className="h-5 w-5 text-[#86efac]" />}
                      {handleStatus === "taken" && <X className="h-5 w-5 text-red-300" />}
                    </span>
                  </div>

                  <div className="mt-2 min-h-[1.25rem] text-xs" aria-live="polite">
                    {handleStatus === "idle" && (
                      <p className="text-white/50">Auto-generated from your name. Letters and numbers only.</p>
                    )}
                    {handleStatus === "checking" && <p className="text-white/60">Checking availability...</p>}
                    {handleStatus === "available" && handleNote && (
                      <p className="text-white/70">
                        <span className="text-white/90">@{handleNote.base}</span> was taken, so we added{" "}
                        <span className="rounded-md bg-[#22c55e]/25 px-1.5 py-0.5 font-bold text-[#86efac]">
                          {handleNote.suffix}
                        </span>
                        . Your handle is{" "}
                        <span className="font-semibold text-white">
                          @{handleNote.base}
                          <span className="text-[#86efac]">{handleNote.suffix}</span>
                        </span>
                        .
                      </p>
                    )}
                    {handleStatus === "available" && !handleNote && (
                      <p className="text-[#86efac]">@{handleBase} is available</p>
                    )}
                    {handleStatus === "taken" && <p className="text-red-200">@{handleBase} is already taken.</p>}
                    {handleStatus === "error" && (
                      <p className="text-amber-200">
                        Could not check availability right now. We will confirm when you finish.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* PAGE 2: Email, Phone, Age, Gender, Country */}
            {step === 2 && (
              <>
                <div>
                  <label htmlFor="reg-email" className={labelClass}>
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className={iconClass} />
                    <input
                      id="reg-email"
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-phone" className={labelClass}>
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone className={iconClass} />
                    <input
                      id="reg-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+27 82 000 0000"
                      autoComplete="tel"
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-dob" className={labelClass}>
                    Date of birth
                  </label>
                  <div className="relative">
                    <Calendar className={iconClass} />
                    <input
                      id="reg-dob"
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                      min={dateBounds.min}
                      max={dateBounds.max}
                      autoComplete="bday"
                      required
                      disabled={loading}
                      className={`${inputClass} appearance-none text-left [color-scheme:dark]`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-white/55">
                    {ageNumber !== null && isAgeValid
                      ? `You are ${ageNumber}.`
                      : `You must be ${MIN_AGE} or older. We only use this to work out your age.`}
                  </p>
                </div>

                <div>
                  <label htmlFor="reg-gender" className={labelClass}>
                    Gender
                  </label>
                  <GenderDropdown value={gender} onChange={setGender} disabled={loading} />
                </div>

                <div>
                  <label htmlFor="reg-country" className={labelClass}>
                    Country
                  </label>
                  <div className="relative">
                    <MapPin className={iconClass} />
                    <button
                      id="reg-country"
                      type="button"
                      disabled={loading}
                      aria-haspopup="dialog"
                      onClick={() => setCountryOpen(true)}
                      className={`${inputClass} flex cursor-pointer items-center pr-10 text-left`}
                    >
                      <span className={`truncate ${country ? "text-white" : "text-white/45"}`}>
                        {country || "Select your country"}
                      </span>
                      <ChevronDown className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* PAGE 3: Interests wall */}
            {step === 3 && (
              <div className="space-y-7 pt-1">
                <p className="text-sm leading-relaxed text-white/70">
                  Pick at least {MIN_INTERESTS} topics. We use them to shape your feed, and you can change them any
                  time.
                </p>

                {INTEREST_SECTIONS.map((section) => {
                  const pickedHere = section.topics.filter(([id]) => selectedInterests.has(id)).length;

                  return (
                    <div key={section.id} role="group" aria-labelledby={`interest-${section.id}`}>
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                          <h3
                            id={`interest-${section.id}`}
                            className="flex items-center gap-2 text-base font-semibold tracking-tight"
                          >
                            {section.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-white/55">{section.blurb}</p>
                        </div>
                        {pickedHere > 0 && (
                          <span className="shrink-0 rounded-full bg-[#22c55e]/20 px-2.5 py-1 text-xs font-semibold text-[#86efac]">
                            {pickedHere} picked
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {section.topics.map(([id, label]) => {
                          const selected = selectedInterests.has(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleInterest(id)}
                              disabled={loading}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition active:scale-95 ${
                                selected
                                  ? "border-[#22c55e] bg-[#22c55e] font-semibold text-[#04170f] shadow-[0_4px_16px_rgba(34,197,94,0.35)]"
                                  : "border-white/20 bg-white/10 font-medium text-white/85 hover:bg-white/15"
                              }`}
                            >
                              {selected ? (
                                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                              ) : (
                                <Plus className="h-4 w-4 text-white/60" aria-hidden="true" />
                              )}
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGE 4: Password + display mode */}
            {step === 4 && (
              <>
                <div>
                  <label htmlFor="reg-password" className={labelClass}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={iconClass} />
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      maxLength={MAX_PASSWORD_LENGTH}
                      required
                      disabled={loading}
                      className={`${inputClass} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/60 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className={labelClass}>App display mode</span>
                  <div
                    role="radiogroup"
                    aria-label="App display mode"
                    className="grid grid-cols-2 gap-2 rounded-2xl border border-white/20 bg-white/10 p-1.5"
                  >
                    {(
                      [
                        { id: "light", label: "Bright", Icon: Sun },
                        { id: "dark", label: "Dark", Icon: Moon },
                      ] as const
                    ).map(({ id, label, Icon }) => {
                      const active = uiMode === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => chooseUiMode(id)}
                          disabled={loading}
                          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                            active ? "bg-white text-[#0b3d27] shadow-md shadow-black/20" : "text-white/75 hover:bg-white/10"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Mini preview */}
                  <div
                    className={`mt-3 flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                      uiMode === "light" ? "border-black/5 bg-white" : "border-white/10 bg-[#0f1a14]"
                    }`}
                    aria-hidden="true"
                  >
                    <span className="h-9 w-9 shrink-0 rounded-full bg-[#22c55e]" />
                    <span className="flex-1 space-y-1.5">
                      <span
                        className={`block h-2.5 w-2/3 rounded-full ${uiMode === "light" ? "bg-slate-800" : "bg-white/85"}`}
                      />
                      <span
                        className={`block h-2 w-1/2 rounded-full ${uiMode === "light" ? "bg-slate-300" : "bg-white/25"}`}
                      />
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/55">You can change this any time in settings.</p>
                </div>
              </>
            )}

            {error && (
              <p className="rounded-2xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-red-50" role="alert">
                {error}
              </p>
            )}

            {/* Action bar: sticks to the bottom of the screen while the form is on screen */}
            <div className="sticky bottom-0 z-20 -mx-6 bg-gradient-to-t from-[#06190f] via-[#06190f]/95 to-transparent px-6 pb-3 pt-6">
              {step === 3 && (
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex flex-1 gap-1" aria-hidden="true">
                    {Array.from({ length: MIN_INTERESTS }, (_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                          index < interests.length ? "bg-[#22c55e]" : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="shrink-0 text-xs font-medium text-white/75" aria-live="polite">
                    {remainingInterests > 0
                      ? `${interests.length}/${MIN_INTERESTS} picked`
                      : `${interests.length} picked`}
                  </p>
                  {interests.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setInterests([])}
                      className="shrink-0 text-xs font-medium text-white/60 underline-offset-4 hover:text-white hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 text-base font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Back
                  </button>
                )}

                {step < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={loading || !stepValid}
                    className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-base font-semibold text-[#0b3d27] shadow-lg shadow-black/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {step === 3 && remainingInterests > 0 ? (
                      `Pick ${remainingInterests} more`
                    ) : (
                      <>
                        Next
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-14 flex-[1.6] items-center justify-center rounded-2xl bg-white px-6 text-base font-semibold text-[#0b3d27] shadow-lg shadow-black/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Creating account..." : "Create account"}
                  </button>
                )}
              </div>
            </div>
          </form>

          <p className="mt-4 text-center text-sm text-white/70">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>

      <SelectSheet
        open={countryOpen}
        title="Select your country"
        options={COUNTRIES}
        value={country}
        onSelect={setCountry}
        onClose={() => setCountryOpen(false)}
      />
    </main>
  );
}