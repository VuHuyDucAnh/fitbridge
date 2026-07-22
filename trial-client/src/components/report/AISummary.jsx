export default function AISummary({ summary }) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-lg">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">
          AI Workout Summary
        </h2>

        <p className="mt-2 text-slate-500">
          Here's an overview of today's training session.
        </p>
      </div>

      {/* AI Summary */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <h3 className="mb-4 text-xl font-semibold text-blue-700">
          🤖 AI Summary
        </h3>

        <p className="leading-8 text-slate-700">{summary.overview}</p>
      </div>

      {/* Session Highlights */}
      <div className="mt-8">
        <h3 className="mb-5 text-xl font-semibold">📊 Session Highlights</h3>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-400">Calories Burned</p>

            <p className="mt-2 text-3xl font-bold text-orange-500">
              🔥 {summary.calories} kcal
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-400">Completed</p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              💪 {summary.reps} Reps
            </p>

            <p className="mt-1 text-lg text-slate-600">
              🏋️ {summary.sets} Sets
            </p>
          </div>
        </div>
      </div>

      {/* Improvements */}
      <div className="mt-10">
        <h3 className="mb-5 text-xl font-semibold">
          🎯 Recommended Improvements
        </h3>

        <div className="space-y-3">
          {summary.improvements.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4"
            >
              <span className="text-xl">⚠️</span>

              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Next Workout */}
      <div className="mt-10 rounded-2xl border border-green-200 bg-green-50 p-6">
        <h3 className="mb-4 text-xl font-semibold text-green-700">
          🚀 Next Workout Recommendation
        </h3>

        <p className="leading-8 text-slate-700">{summary.nextWorkout}</p>
      </div>

      {/* Quote */}
      <div className="mt-10 overflow-hidden rounded-3xl bg-slate-900 p-8 text-white">
        <p className="text-lg italic leading-8">"{summary.quote}"</p>

        <p className="mt-5 text-right text-slate-300">— David Goggins</p>
      </div>
    </section>
  );
}
