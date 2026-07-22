import ProgressBar from "./ProgressBar";

export default function FormAnalysis({ analysis }) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-lg">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">AI Form Analysis</h2>

        <p className="mt-2 text-slate-500">
          AI analyzed your posture and movement throughout the workout.
        </p>
      </div>

      {/* Score */}
      <div className="mb-8">
        <ProgressBar value={analysis.score} max={10} color="green" />
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-green-50 p-5">
          <p className="text-sm text-green-600">Correct Movements</p>

          <p className="mt-2 text-4xl font-bold text-green-700">
            {analysis.good.length}
          </p>
        </div>

        <div className="rounded-2xl bg-orange-50 p-5">
          <p className="text-sm text-orange-600">Areas to Improve</p>

          <p className="mt-2 text-4xl font-bold text-orange-700">
            {analysis.improve.length}
          </p>
        </div>
      </div>

      {/* Good */}
      <div className="mb-8">
        <h3 className="mb-4 text-xl font-semibold text-green-600">
          ✅ What You Did Well
        </h3>

        <div className="space-y-3">
          {analysis.good.map((item, index) => (
            <div
              key={index}
              className="rounded-xl border border-green-100 bg-green-50 p-4"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Improve */}
      <div>
        <h3 className="mb-4 text-xl font-semibold text-orange-600">
          ⚠️ Areas to Improve
        </h3>

        <div className="space-y-3">
          {analysis.improve.map((item, index) => (
            <div
              key={index}
              className="rounded-xl border border-orange-100 bg-orange-50 p-4"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
