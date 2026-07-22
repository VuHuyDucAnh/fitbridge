export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 px-6 py-10">
      {/* Background Blur */}
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="absolute -bottom-32 -right-32 h-[450px] w-[450px] rounded-full bg-purple-500/20 blur-3xl" />

      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

      {/* Content */}
      <div className="relative flex w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-2xl">
        {/* Left Side */}
        <div className="hidden flex-1 flex-col justify-center p-14 text-white lg:flex">
          <span className="mb-6 w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            AI FITNESS COACH
          </span>

          <h1 className="text-5xl font-bold leading-tight">
            Train Smarter.
            <br />
            Improve Faster.
          </h1>

          <p className="mt-8 max-w-md text-lg leading-8 text-slate-300">
            Upload your workout videos, receive AI-powered posture analysis,
            track your progress, and become stronger every day.
          </p>

          {/* Features */}
          <div className="mt-12 space-y-5">
            <Feature text="AI Motion Analysis" />
            <Feature text="Workout Progress Tracking" />
            <Feature text="Personalized Feedback" />
            <Feature text="Smart Workout Summary" />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex w-full items-center justify-center bg-white p-8 md:p-12 lg:w-[500px]">
          {children}
        </div>
      </div>
    </div>
  );
}

function Feature({ text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-3 w-3 rounded-full bg-cyan-400" />

      <p className="text-slate-200">{text}</p>
    </div>
  );
}
