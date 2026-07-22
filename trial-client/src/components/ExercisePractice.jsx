import { useEffect, useRef, useState } from "react";
import { Camera, Play, Square } from "lucide-react";

export default function ExercisePractice({ exercise }) {
  const videoRef = useRef(null);

  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval;

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = () => {
    const min = String(Math.floor(seconds / 60)).padStart(2, "0");
    const sec = String(seconds % 60).padStart(2, "0");

    return `${min}:${sec}`;
  };

  const startExercise = async () => {
    setSeconds(0);
    setIsRunning(true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    videoRef.current.srcObject = stream;
  };

  const stopExercise = () => {
    setIsRunning(false);

    const stream = videoRef.current.srcObject;

    stream?.getTracks().forEach((track) => track.stop());

    videoRef.current.srcObject = null;
  };

  return (
    <section className="mx-auto mt-12 max-w-7xl px-6">
      <h2 className="mb-8 text-3xl font-bold">Exercise Practice</h2>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Camera */}

        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <div className="aspect-video overflow-hidden rounded-2xl bg-slate-200">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {!isRunning && (
              <div className="flex h-full items-center justify-center text-slate-500">
                <div className="text-center">
                  <Camera size={60} className="mx-auto mb-4" />

                  <p>Camera Preview</p>
                </div>
              </div>
            )}
          </div>

          {!isRunning ? (
            <button
              onClick={startExercise}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700"
            >
              <Play size={20} />
              Start Exercise
            </button>
          ) : (
            <button
              onClick={stopExercise}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 py-4 font-semibold text-white transition hover:bg-red-600"
            >
              <Square size={18} />
              End Exercise
            </button>
          )}
        </div>

        {/* Exercise Info */}

        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <h3 className="text-3xl font-bold">{exercise.name}</h3>

          <p className="mt-2 text-slate-500">{exercise.target}</p>

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-sm text-slate-400">Status</p>

              <p
                className={`mt-1 font-semibold ${
                  isRunning ? "text-green-600" : "text-slate-500"
                }`}
              >
                {isRunning ? "🟢 Recording" : "⚪ Ready"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Timer</p>

              <p className="mt-1 text-4xl font-bold">{formatTime()}</p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Target Muscles</p>

              <p className="mt-1">{exercise.target}</p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Tips</p>

              <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-600">
                {exercise.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
