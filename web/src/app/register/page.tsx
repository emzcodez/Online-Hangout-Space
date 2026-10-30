
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Sparkles } from "lucide-react";

const schema = z.object({
  displayName: z.string().min(2, "Name must have at least 2 characters"),
  username: z.string()
    .min(3, "Username must have at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers and underscores"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must have at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    console.log("Registration form validated:", data.email);
    alert("Registration UI is ready! Account creation will be connected next.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf8ff] px-5 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-purple-100 lg:grid-cols-2">

        <div className="hidden flex-col justify-between bg-gradient-to-br from-[#7655c9] via-[#9971d1] to-[#e3a4c8] p-12 text-white lg:flex">
          <Link href="/" className="text-xl font-black">
            ✿ hangout.space
          </Link>

          <div>
            <div className="mb-8 text-8xl">🌷</div>
            <h1 className="text-4xl font-black leading-tight">
              Your space.
              <br />Your rules.
              <br />Your people.
            </h1>
            <p className="mt-5 leading-7 text-white/80">
              Build your own little world. Invite your friends.
              Make memories that last.
            </p>
            <div className="mt-8 text-3xl">🧸 ☁️ 💗 ✨</div>
          </div>

          <p className="text-sm text-white/70">
            There is always room for one more friend.
          </p>
        </div>

        <div className="flex flex-col justify-center px-7 py-12 sm:px-12 lg:px-14">
          <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-semibold text-[#82768f] hover:text-[#7655c9]">
            <ArrowLeft size={17} /> Back to home
          </Link>

          <div className="mb-7">
            <p className="text-sm font-bold text-[#9271d4]">
              LET US MAKE IT OFFICIAL!
            </p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-[#29213c]">
              Join the fun! ♡
            </h2>
            <p className="mt-3 text-sm text-[#81788f]">
              Create an account and find your happy place.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#403451]">Display name</label>
              <input
                {...register("displayName")}
                placeholder="What should we call you?"
                className="w-full rounded-2xl border border-purple-100 bg-[#fcfaff] px-5 py-3.5 text-sm outline-none focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
              />
              {errors.displayName && <p className="mt-1 text-xs text-red-500">{errors.displayName.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#403451]">Username</label>
              <input
                {...register("username")}
                placeholder="@yourusername"
                className="w-full rounded-2xl border border-purple-100 bg-[#fcfaff] px-5 py-3.5 text-sm outline-none focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
              />
              {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#403451]">Email address</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-purple-100 bg-[#fcfaff] px-5 py-3.5 text-sm outline-none focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#403451]">Password</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-purple-100 bg-[#fcfaff] px-5 py-3.5 pr-12 text-sm outline-none focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9286a2]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#403451]">Confirm password</label>
              <input
                {...register("confirmPassword")}
                type="password"
                placeholder="Enter your password again"
                className="w-full rounded-2xl border border-purple-100 bg-[#fcfaff] px-5 py-3.5 text-sm outline-none focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 w-full rounded-2xl bg-[#7655c9] py-4 font-bold text-white shadow-lg shadow-purple-200 transition hover:-translate-y-0.5 hover:bg-[#6342b4] disabled:opacity-50"
            >
              Create my account →
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#81788f]">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#7655c9] hover:underline">
              Log in
            </Link>
          </p>

          <div className="mt-6 flex justify-center gap-2 text-xs text-[#a198ae]">
            <Sparkles size={14} /> Your little world starts here.
          </div>
        </div>
      </div>
    </main>
  );
}
