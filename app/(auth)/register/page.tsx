"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User, MapPin, GraduationCap, UserRound } from "lucide-react";

const BG_IMAGE =
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80";

const inputClass =
  "h-14 w-full rounded-2xl border border-white/20 bg-white/10 pl-12 pr-4 text-base text-white placeholder:text-white/45 outline-none transition focus:border-white/60 focus:bg-white/15 focus:ring-4 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60";

const HIGHLIGHTS = ["Local news", "Groups", "Community action"];

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Page 1
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [userHandle, setUserHandle] = useState("");

  // Page 2
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Page 3
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");

  // Page 4
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const totalSteps = 4;

  const generateHandle = (value: string) => {
    const handle = value.trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
    return handle ? `@${handle}` : "";
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    setUserHandle(generateHandle(event.target.value));
  };

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
    setUserHandle(generateHandle(event.target.value));
  };

  const handleUserHandleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserHandle(generateHandle(event.target.value));
  };

  const isPage1Valid = () => name.trim().length > 0 && userHandle.length > 1;
  const isPage2Valid = () => email.includes("@") && phone.trim().length > 0;
  const isPage3Valid = () => age.trim().length > 0 && gender.length > 0 && country.trim().length > 0;
  const isPage4Valid = () => password.length >= 8;

  const nextStep = () => {
    if (step === 1 && !isPage1Valid()) {
      setError("Please enter your name and a valid user handle.");
      return;
    }
    if (step === 2 && !isPage2Valid()) {
      setError("Please enter a valid email and phone number.");
      return;
    }
    if (step === 3 && !isPage3Valid()) {
      setError("Please fill in age, gender, and country.");
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

    if (!isPage4Valid()) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          userHandle,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          age: Number(age),
          gender,
          country: country.trim(),
          password,
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
  };

  const progress = (step / totalSteps) * 100;

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#0b3d27] text-white">
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
          <h1 className="text-[2.25rem] font-semibold leading-[1.05] tracking-tight">
            Build your local network.
          </h1>
          <p className="mt-3 max-w-[32ch] text-base text-white/75">
            Follow community updates, discover events and connect with people nearby.
          </p>
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

          {/* Progress */}
          <div className="mt-8 px-6">
            <div className="flex items-center justify-between text-xs text-white/50 mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#22c55e] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        {/* Glass sheet */}
        <section className="rounded-t-[2rem] border-x border-t border-white/25 bg-white/10 px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-7 shadow-[0_-24px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/30" />

          <h2 className="text-2xl font-semibold tracking-tight">
            {step === 1 ? "Create account" : step === 2 ? "Contact info" : step === 3 ? "About you" : "Set password"}
          </h2>

          <form onSubmit={handleRegister} className="mt-5 space-y-4" noValidate>
            {/* PAGE 1: Name, Username, User Handle */}
            {step === 1 && (
              <>
                <div>
                  <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-white/80">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
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
                  <label htmlFor="reg-username" className="mb-1.5 block text-sm font-medium text-white/80">
                    Account username
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                    <input
                      id="reg-username"
                      type="text"
                      value={username}
                      onChange={handleUsernameChange}
                      placeholder="janesmith"
                      autoComplete="username"
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-handle" className="mb-1.5 block text-sm font-medium text-white/80">
                    User handle
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60">
                      @
                    </span>
                    <input
                      id="reg-handle"
                      type="text"
                      value={userHandle.replace("@", "")}
                      onChange={handleUserHandleChange}
                      placeholder="drake6664"
                      autoComplete="username"
                      required
                      disabled={loading}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    Auto-generated from your name. No spaces, numbers may be added if taken.
                  </p>
                </div>
              </>
            )}

            {/* PAGE 2: Email, Phone */}
            {step === 2 && (
              <>
                <div>
                  <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-white/80">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
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
                  <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium text-white/80">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                    <input
                      id="reg-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+1 (555) 000-0000"
                      autoComplete="tel"
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>
              </>
            )}

            {/* PAGE 3: Age, Gender, Country */}
            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-age" className="mb-1.5 block text-sm font-medium text-white/80">
                      Age
                    </label>
                    <div className="relative">
                      <GraduationCap className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                      <input
                        id="reg-age"
                        type="number"
                        min="13"
                        max="120"
                        value={age}
                        onChange={(event) => setAge(event.target.value)}
                        placeholder="25"
                        autoComplete="age"
                        required
                        disabled={loading}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-gender" className="mb-1.5 block text-sm font-medium text-white/80">
                      Gender
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                      <select
                        id="reg-gender"
                        value={gender}
                        onChange={(event) => setGender(event.target.value)}
                        required
                        disabled={loading}
                        className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                      >
                        <option value="">Select gender</option>
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-country" className="mb-1.5 block text-sm font-medium text-white/80">
                    Country
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                    <input
                      id="reg-country"
                      type="text"
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      placeholder="South Africa"
                      autoComplete="country"
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>
              </>
            )}

            {/* PAGE 4: Password */}
            {step === 4 && (
              <>
                <div>
                  <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-white/80">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={8}
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
              </>
            )}

            {error && (
              <p className="rounded-2xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-red-50" role="alert">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  className="h-14 rounded-2xl border border-white/25 bg-white/10 px-6 text-base font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" /> Back
                </button>
              )}
              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={loading || (step === 1 ? !isPage1Valid() : step === 2 ? !isPage2Valid() : !isPage3Valid())}
                  className="h-14 rounded-2xl bg-white text-base font-semibold text-[#0b3d27] shadow-lg shadow-black/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#0b3d27] shadow-lg shadow-black/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-white/70">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
