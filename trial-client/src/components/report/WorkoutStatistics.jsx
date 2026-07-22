import StatCard from "./StatCard";
import FormAnalysis from "./FormAnalysis";
import AISummary from "./AISummary";

export default function WorkoutStatistics({ exercise, stats }) {
  const analysis = {
    score: 8.9,

    good: [
      "Excellent squat depth.",
      "Stable core throughout the movement.",
      "Controlled tempo.",
    ],

    improve: [
      "Keep your knees aligned with your toes.",
      "Lower your chest slightly more.",
    ],
  };
  const summary = {
    overview:
      "Great job! Today you completed your Push Up session with consistent performance. Your average form score reached 8.9/10, showing good upper-body stability and control throughout most repetitions.",

    calories: 326,

    reps: 42,

    sets: 4,

    improvements: [
      "Keep your elbows closer to your body.",
      "Lower your chest slightly further.",
      "Slow down the lowering phase for better muscle activation.",
    ],

    nextWorkout:
      "Increase the workout volume to 45 repetitions while maintaining the same movement quality. Focus on improving elbow positioning and controlled tempo.",

    quote:
      "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.",
  };
  return (
    <section className="rounded-3xl bg-white p-8 shadow-lg">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">
          Workout Statistics
        </h2>

        <p className="mt-2 text-slate-500">
          Overview of your latest workout session.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Calories Burned"
          value={stats.calories}
          unit="kcal"
          icon="🔥"
          color="orange"
        />

        <StatCard
          title="Total Reps"
          value={stats.reps}
          icon="💪"
          color="blue"
        />

        <StatCard
          title="Completed Sets"
          value={stats.sets}
          icon="🏋️"
          color="green"
        />

        <StatCard
          title="Form Score"
          value={stats.score}
          unit="/10"
          icon="⭐"
          color="purple"
        />
      </div>

      {/* Workout Info */}
      <div className="mt-10 grid gap-6 rounded-2xl bg-slate-50 p-6 md:grid-cols-2">
        <div>
          <p className="text-sm text-slate-400">Exercise</p>

          <p className="mt-1 text-xl font-semibold">{exercise.name}</p>
        </div>

        <div>
          <p className="text-sm text-slate-400">Duration</p>

          <p className="mt-1 text-xl font-semibold">{stats.duration}</p>
        </div>

        <div>
          <p className="text-sm text-slate-400">Difficulty</p>

          <p className="mt-1 text-xl font-semibold">{exercise.difficulty}</p>
        </div>

        <div>
          <p className="text-sm text-slate-400">Target Muscles</p>

          <p className="mt-1 text-xl font-semibold">{exercise.muscles}</p>
        </div>
      </div>
      <FormAnalysis analysis={analysis} />
      <AISummary summary={summary} />
    </section>
  );
}
