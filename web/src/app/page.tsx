
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Heart, Sparkles } from "lucide-react";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    console.log("Login form validated:", data.email);
    alert("Login UI is ready! Authentication will be connected next.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf8ff] px-5 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-purple-100 lg:grid-cols-2">

        <div className="hidden flex-col justify-between bg-gradient-to-br from-[#7655c9] to-[#c18acb] p-12 text-white lg:flex">
          <Link href="/" className="text-xl font-black">
            ✿ hangout.space
          </Link>

          <div>
            <div className="mb-8 text-8xl">☁️</div>
            <h1 className="text-4xl font-black leading-tight">
              Your people.
              <br />Your happy place.
            </h1>
            <p className="mt-5 leading-7 text-white/80">
              Come back to your favourite corner of the internet.
              Your friends and memories are waiting.
            </p>
            <div className="mt-8 flex gap-3 text-3xl">
              🧸 💗 🌷
            </div>
          </div>

          <p className="text-sm text-white/70">
            Made with ♡ for the people who matter.
          </p>
        </div>

        <div className="flex flex-col justify-center px-7 py-12 sm:px-12 lg:px-14">
          <Link href="/" className="mb-12 flex items-center gap-2 text-sm font-semibold text-[#82768f] hover:text-[#7655c9]">
            <ArrowLeft size={17} /> Back to home
          </Link>

          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eee6ff] text-[#7655c9]">
              <Heart size={24} />
            </div>

            <p className="text-sm font-bold text-[#9271d4]">
              WELCOME BACK!
            </p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-[#29213c]">
              Hey, friend! ♡
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#81788f]">
              Log in and pick up right where you left off.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#403451]">
                Email address
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-purple-100 bg-[#fcfaff] px-5 py-4 text-sm outline-none transition focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
              />
              {errors.email && (
                <p className="mt-2 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#403451]">
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-purple-100 bg-[#fcfaff] px-5 py-4 pr-12 text-sm outline-none transition focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9286a2]"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-xs font-bold text-[#8061c5] hover:underline">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#7655c9] py-4 font-bold text-white shadow-lg shadow-purple-200 transition hover:-translate-y-0.5 hover:bg-[#6342b4] disabled:opacity-50"
            >
              Log in to your space →
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-purple-100" />
            <span className="text-xs text-[#a198ae]">YOUR PEOPLE MISS YOU</span>
            <div className="h-px flex-1 bg-purple-100" />
          </div>

          <p className="text-center text-sm text-[#81788f]">
            New around here?{" "}
            <Link href="/register" className="font-bold text-[#7655c9] hover:underline">
              Create an account
            </Link>
          </p>

          <div className="mt-8 flex justify-center gap-2 text-xs text-[#a198ae]">
            <Sparkles size={14} /> A little space just for you.
          </div>
        </div>
      </div>
    </main>
  );
}
